"""
RAG Teaching Engine

Implements Retrieval-Augmented Generation for teaching topics from textbook content.

Features:
- RAG Pipeline (Retrieval + Generation)
- Offline & Online (LLM) Teaching Modes
- Lecture Caching
- Graceful API Fallback

TEACHING MODES:
1. "OFFLINE" (Default):
   - Uses retrieved chunks to deterministically format a lecture
   - No API calls required
   - Zero cost, works offline
   
2. "LLM":
   - Uses Gemini/OpenAI to generate a structured lecture
   - Caches results to 'lectures/' directory
   - Fallback to OFFLINE mode if API fails
"""

import logging
import os
import requests
import time
import threading
from pathlib import Path
from typing import Optional, List, Tuple, Dict, Any

# Global lock for Ollama API calls (ensures only one generation at a time)
_ollama_lock = threading.Lock()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def generate_with_ollama(
    prompt: str,
    model: str = "mistral",
    max_retries: int = 2,
    num_ctx: int = 2048,
    num_predict: int = 300
) -> str:
    """
    Generate text using Ollama's local LLM API with retry mechanism.
    
    This function sends a prompt to the Ollama service running locally
    and returns the generated response. Includes retry logic for timeouts.
    
    THREAD-SAFE: Uses global lock to ensure only one Ollama call at a time.
    
    MEMORY MANAGEMENT:
    - num_ctx caps the KV cache allocation (default Ollama = 4096).
      Reducing to 2048 nearly halves the working memory spike.
    - num_predict caps output length, preventing runaway generation
      that would grow the KV cache further.
    
    Args:
        prompt: The input prompt for text generation
        model: The Ollama model to use (default: "mistral")
        max_retries: Maximum number of retry attempts for timeouts (default: 2)
        num_ctx: Context window size — controls KV cache memory (default: 2048)
        num_predict: Max tokens to generate (default: 300)
    
    Returns:
        Generated text response from Ollama
    
    Raises:
        Exception: If Ollama service is not running or request fails after retries
    
    Example:
        >>> response = generate_with_ollama("Explain photosynthesis")
        >>> print(response)
        
        >>> # Q&A with tight memory budget:
        >>> response = generate_with_ollama(prompt, num_ctx=1024, num_predict=200)
    """
    ollama_url = "http://localhost:11434/api/generate"
    
    # Acquire lock to ensure only ONE Ollama generation at a time
    with _ollama_lock:
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    logger.info(f"Retry attempt {attempt}/{max_retries}...")
                else:
                    logger.info(f"Generating lecture using Senku...")
                
                response = requests.post(
                    ollama_url,
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "num_ctx": num_ctx,
                            "num_predict": num_predict,
                        }
                    },
                    timeout=180  # Increased to 180 seconds for longer generations
                )
                
                # Check if request was successful
                if response.status_code == 200:
                    result = response.json()
                    generated_text = result.get("response", "")
                    logger.info(f"✓ Generated successfully ({len(generated_text)} chars, ctx={num_ctx})")
                    return generated_text
                else:
                    error_msg = f"Ollama API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    raise Exception(error_msg)
                    
            except requests.exceptions.ConnectionError:
                error_msg = "Senku backend service is not running. Please start the service."
                logger.error(error_msg)
                raise Exception(error_msg)
            except requests.exceptions.Timeout:
                if attempt < max_retries:
                    logger.warning(f"Senku is taking longer than expected. Retrying... ({attempt + 1}/{max_retries})")
                    continue
                else:
                    error_msg = "Senku is taking longer to prepare the lesson. The content may be complex."
                    logger.error(error_msg)
                    raise Exception(error_msg)
            except Exception as e:
                error_msg = f"Lecture generation failed: {str(e)}"
                logger.error(error_msg)
                raise Exception(error_msg)
        
        # Should not reach here, but just in case
        raise Exception("Lecture generation failed after all retry attempts")


def generate_with_ollama_streaming(
    prompt: str,
    model: str = "mistral",
    system: str = "",
    num_ctx: int = 2048,
    num_predict: int = 128,
    temperature: float = 0.4,
    top_p: float = 0.9,
):
    """
    Stream tokens from Ollama's local LLM API, one token at a time.

    Designed EXCLUSIVELY for Q&A mode streaming. Lecture generation uses
    generate_with_ollama() (non-streaming) instead — this function must
    never be called from lecture generation paths.

    HOW IT WORKS:
    - Sends a POST with ``stream: true`` to Ollama's /api/generate endpoint.
    - Ollama responds with NDJSON: one JSON object per line, each containing
      a ``"response"`` key holding the next token string.
    - This function yields each token string as soon as it arrives, enabling
      the caller to buffer tokens into complete sentences and pipe them to TTS
      the moment a sentence boundary is detected.

    THREAD SAFETY:
    - Does NOT acquire ``_ollama_lock``. The voice-state machine guarantees
      that only one subsystem (lecture or Q&A) uses Ollama at a time by
      transitioning to PROCESSING state before calling this function.

    MEMORY MANAGEMENT:
    - num_ctx=2048 keeps KV cache half of Ollama's default 4096.
    - num_predict=128 caps Q&A output to ~1-2 sentences before the model
      is forced to stop, preventing runaway generation.
    - temperature=0.4 / top_p=0.9 bias toward factual, concise answers.

    Args:
        prompt:      The user question prompt (already formatted by caller).
        model:       Ollama model name (default: ``"mistral"``).
        system:      Optional system prompt injected as the ``system`` field.
        num_ctx:     KV-cache context window size (default: 2048).
        num_predict: Maximum tokens to generate (default: 128).
        temperature: Sampling temperature (default: 0.4).
        top_p:       Nucleus sampling threshold (default: 0.9).

    Yields:
        str — One raw token string per iteration (may be a word fragment,
        punctuation, whitespace, or multi-character sequence depending on the
        tokeniser used by the model).

    Raises:
        Exception: If the Ollama service is unreachable or returns an error
        status code on the initial response.

    Example::

        for token in generate_with_ollama_streaming("What is photosynthesis?"):
            print(token, end="", flush=True)
    """
    import json as _json

    ollama_url = "http://localhost:11434/api/generate"

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True,
        "options": {
            "num_ctx": num_ctx,
            "num_predict": num_predict,
            "temperature": temperature,
            "top_p": top_p,
        },
    }

    # Inject system prompt only when non-empty
    if system:
        payload["system"] = system

    logger.info(
        f"[QA-STREAM] Starting streaming Q&A — model={model}, "
        f"num_predict={num_predict}, temperature={temperature}"
    )

    try:
        with requests.post(
            ollama_url,
            json=payload,
            stream=True,
            timeout=60,          # Per-chunk timeout; streaming keeps connection alive
        ) as resp:
            if resp.status_code != 200:
                raise Exception(
                    f"Ollama streaming error: HTTP {resp.status_code} — {resp.text[:200]}"
                )

            for raw_line in resp.iter_lines():
                if not raw_line:
                    continue  # Skip keep-alive blank lines

                try:
                    chunk = _json.loads(raw_line)
                except _json.JSONDecodeError:
                    logger.warning(f"[QA-STREAM] Non-JSON line skipped: {raw_line!r}")
                    continue

                token = chunk.get("response", "")
                if token:
                    yield token

                # Ollama sets "done": true on the final chunk
                if chunk.get("done", False):
                    logger.info("[QA-STREAM] Generation complete (done=true)")
                    break

    except requests.exceptions.ConnectionError:
        raise Exception(
            "Senku backend (Ollama) is not running. Start it with: ollama serve"
        )
    except requests.exceptions.Timeout:
        raise Exception(
            "Ollama streaming timed out during Q&A. The model may be overloaded."
        )


class RAGTeachingEngine:

    """
    AI Teaching Engine using Retrieval-Augmented Generation.
    
    Supports:
    - OFFLINE mode: Deterministic lecture generation from chunks
    - LLM mode: Generative teaching using Gemini/OpenAI
    - Caching: Saves lectures to avoid re-generation
    """
    
    def __init__(
        self,
        vector_database,
        embedding_generator,
        llm_provider: str = "ollama",  
        llm_model: Optional[str] = None,
        top_k: int = 6,
        teaching_mode: str = "OFFLINE",
        cache_dir: str ="./lectures"
    ):
        """
        Initialize the RAG Teaching Engine.
        
        Args:
            vector_database: VectorDatabase instance
            embedding_generator: EmbeddingGenerator instance
            llm_provider: "ollama", "gemini", or "openai"
            llm_model: Model name
            top_k: Number of chunks to retrieve
            teaching_mode: "OFFLINE" or "LLM"
            cache_dir: Directory to store cached lectures
        """
        self.vector_db = vector_database
        self.embedding_gen = embedding_generator
        self.llm_provider = llm_provider.lower()
        self.top_k = top_k
        self.teaching_mode = teaching_mode.upper()
        self.cache_dir = Path(cache_dir)
        
        
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        

        self.llm_client = None
        self.llm_model = llm_model
        
        if self.teaching_mode == "LLM":
            self._setup_llm_defaults()
            try:
                self._initialize_llm()
            except Exception as e:
                logger.warning(f"LLM initialization failed: {e}. Falling back to OFFLINE mode.")
                self.teaching_mode = "OFFLINE"
        
        logger.info(
            f"RAGTeachingEngine initialized: mode={self.teaching_mode}, "
            f"llm={self.llm_provider}/{self.llm_model}, cache={self.cache_dir}"
        )
        
    def _setup_llm_defaults(self):
        """Set default LLM models if not provided."""
        if self.llm_model is None:
            if self.llm_provider == "ollama":
                self.llm_model = "mistral"
            elif self.llm_provider == "gemini":
                self.llm_model = "models/gemini-pro-latest"
            elif self.llm_provider == "openai":
                self.llm_model = "gpt-3.5-turbo"
            else:
                raise ValueError(f"Unsupported LLM provider: {self.llm_provider}")

    def _initialize_llm(self):
        """Initialize the LLM client."""
        try:
            if self.llm_provider == "ollama":
                # For Ollama, we don't need to initialize a client
                # We'll use the generate_with_ollama function directly
                # Just verify that Ollama is running
                try:
                    response = requests.get("http://localhost:11434/api/tags", timeout=5)
                    if response.status_code == 200:
                        logger.info(f"Ollama service detected, using model: {self.llm_model}")
                        self.llm_client = "ollama"  # Marker that Ollama is available
                    else:
                        raise Exception("Ollama service responded with error")
                except Exception as e:
                    raise Exception(f"Ollama service not available: {e}")
                    
            elif self.llm_provider == "gemini":
                try:
                    import google.generativeai as genai
                except ImportError:
                    raise ImportError("pip install google-generativeai")
                
                api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
                if not api_key:
                    raise ValueError("Gemini API key not found")
                
                genai.configure(api_key=api_key)
                self.llm_client = genai.GenerativeModel(self.llm_model)
                logger.info("Gemini LLM client initialized")
                
            elif self.llm_provider == "openai":
                try:
                    from openai import OpenAI
                except ImportError:
                    raise ImportError("pip install openai")
                
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OpenAI API key not found")
                
                self.llm_client = OpenAI(api_key=api_key)
                logger.info("OpenAI LLM client initialized")
                
        except Exception as e:
            logger.error(f"Failed to initialize LLM client: {e}")
            raise

    def _get_cache_path(self, topic: str) -> Path:
        """Get the cache file path for a topic."""
        # Sanitize filename (replace spaces with underscores, keep alphanumeric)
        safe_topic = "".join(c if c.isalnum() else "_" for c in topic).lower()
        return self.cache_dir / f"{safe_topic}.txt"

    def _load_from_cache(self, topic: str) -> Optional[str]:
        """Load lecture from cache if it exists."""
        cache_path = self._get_cache_path(topic)
        if cache_path.exists():
            logger.info(f"Cache hit for topic: '{topic}'")
            return cache_path.read_text(encoding="utf-8")
        return None

    def _save_to_cache(self, topic: str, content: str):
        """Save lecture to cache."""
        try:
            cache_path = self._get_cache_path(topic)
            cache_path.write_text(content, encoding="utf-8")
            logger.info(f"Saved lecture to cache: {cache_path}")
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")

    def _retrieve_context(self, topic: str) -> Tuple[str, List[Tuple[str, float, Dict]]]:
        """Retrieve relevant content from vector database."""
        logger.info(f"Retrieving context for topic: '{topic}'")
        try:
            query_embedding = self.embedding_gen.generate_embedding(topic)
            if not query_embedding:
                raise ValueError("Failed to generate embedding")
            
            results = self.vector_db.similarity_search(query_embedding, top_k=self.top_k)
            
            if not results:
                return "", []
            
            context_chunks = [text for text, _, _ in results]
            combined_context = "\n\n---\n\n".join(context_chunks)
            
            return combined_context, results
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            raise

    def _generate_offline_lecture(self, topic: str, context: str, results: List) -> str:
        """
        Generate a deterministic lecture without LLM (Offline Mode).
        Uses retrieved chunks to verify content presence and format it securely.
        """
        logger.info(f"Generating OFFLINE lecture for '{topic}'")
        
        # Extract best chunks
        chunks = [text for text, _, _ in results]
        
        # 1. Introduction (Use the most relevant chunk)
        intro_chunk = chunks[0] if chunks else "Topic information not available."
        # Take first 2 sentences for intro
        intro_sentences = intro_chunk.split('.')[:2]
        intro_text = ". ".join(intro_sentences) + "."
        
        # 2. Main Explanation (Combine top 3 chunks)
        explanation_chunks = chunks[:3]
        explanation_text = "\n\n".join(explanation_chunks)
        
        # 3. Key Points (Extract roughly from chunks)
        # Simple heuristic: Split by newlines and take distinct substantial lines
        lines = [line.strip() for line in (chunks[0] + "\n" + chunks[1]).split('\n') if len(line.strip()) > 30]
        key_points = lines[:5] # Take up to 5 points
        formatted_points = "\n".join([f"• {point}" for point in key_points])
        
        # 4. Summary (Last chunk or derived)
        summary_chunk = chunks[-1] if len(chunks) > 1 else chunks[0]
        summary_text = summary_chunk.split('.')[:2]
        summary_text = ". ".join(summary_text) + "."
        
        lecture = f"""**Introduction**
{intro_text}

**Explanation**
{explanation_text}

**Key Points**
{formatted_points}

**Summary**
{summary_text}

---
*Offline Mode: Generated from {len(results)} textbook sections.*
"""
        return lecture

    def _generate_llm_lecture(self, topic: str, context: str) -> str:
        """Generate lecture using LLM."""
        logger.info(f"Generating LLM lecture for '{topic}'")
        
        prompt = f"""You are a school teacher explaining a topic from a textbook.

TOPIC: {topic}

TEXTBOOK CONTENT:
{context}

INSTRUCTIONS:
1. Use ONLY the textbook content above.
2. Explain in simple, clear language.
3. Structure: Introduction, Explanation, Key Points, Summary.
4. Do NOT ask questions.
5. Do NOT add external knowledge.

Now, generate the lecture:"""

        if self.llm_provider == "ollama":
            # Use Ollama for local generation
            return generate_with_ollama(prompt, model=self.llm_model)
            
        elif self.llm_provider == "gemini":
            response = self.llm_client.generate_content(prompt)
            return response.text
            
        elif self.llm_provider == "openai":
            response = self.llm_client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": "You are a helpful teacher."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content
            
        return "Error: Unknown provider"

    def teach(self, topic: str) -> str:
        """
        Teach a topic using the configured mode (OFFLINE/LLM) and caching.
        """
        if not topic or not topic.strip():
            return "Please provide a topic."
        
        # 1. Check Cache
        cached_lecture = self._load_from_cache(topic)
        if cached_lecture:
            return cached_lecture
        
        try:
            # 2. Retrieve Context
            context, results = self._retrieve_context(topic)
            if not context:
                return "The textbook does not contain information about this topic."
            
            # 3. Generate Lecture (Try LLM if enabled, fallback to Offline)
            lecture = ""
            if self.teaching_mode == "LLM":
                try:
                    lecture = self._generate_llm_lecture(topic, context)
                    lecture += f"\n\n---\n*Generated by AI Tutor ({self.llm_model}) based on {len(results)} results.*"
                except Exception as e:
                    logger.error(f"LLM generation failed: {e}. Falling back to OFFLINE.")
                    lecture = self._generate_offline_lecture(topic, context, results)
            else:
                # OFFLINE Mode
                lecture = self._generate_offline_lecture(topic, context, results)
            
            # 4. Save to Cache and Return
            self._save_to_cache(topic, lecture)
            return lecture
            
        except Exception as e:
            logger.error(f"Teaching failed: {e}")
            return f"Error teaching topic: {e}"

    def get_engine_info(self) -> Dict[str, Any]:
        """Get engine configuration."""
        return {
            "mode": self.teaching_mode,
            "llm_provider": self.llm_provider,
            "llm_model": self.llm_model,
            "cache_dir": str(self.cache_dir),
            "top_k": self.top_k,
            "doc_count": self.vector_db.get_document_count()
        }


def create_teaching_engine(
    vector_database,
    embedding_generator,
    llm_provider: str = "ollama",  # Changed to ollama
    teaching_mode: str = "OFFLINE"
):
    """Convenience factory."""
    return RAGTeachingEngine(
        vector_database=vector_database,
        embedding_generator=embedding_generator,
        llm_provider=llm_provider,
        teaching_mode=teaching_mode
    )
