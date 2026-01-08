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


def generate_with_ollama(prompt: str, model: str = "mistral", max_retries: int = 2) -> str:
    """
    Generate text using Ollama's local LLM API with retry mechanism.
    
    This function sends a prompt to the Ollama service running locally
    and returns the generated response. Includes retry logic for timeouts.
    
    THREAD-SAFE: Uses global lock to ensure only one Ollama call at a time.
    
    Args:
        prompt: The input prompt for text generation
        model: The Ollama model to use (default: "mistral")
        max_retries: Maximum number of retry attempts for timeouts (default: 2)
    
    Returns:
        Generated text response from Ollama
    
    Raises:
        Exception: If Ollama service is not running or request fails after retries
    
    Example:
        >>> response = generate_with_ollama("Explain photosynthesis")
        >>> print(response)
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
                        "stream": False
                    },
                    timeout=180  # Increased to 180 seconds for longer generations
                )
                
                # Check if request was successful
                if response.status_code == 200:
                    result = response.json()
                    generated_text = result.get("response", "")
                    logger.info(f"✓ Lecture generated successfully ({len(generated_text)} chars)")
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
        llm_provider: str = "ollama",  # Changed default to ollama
        llm_model: Optional[str] = None,
        top_k: int = 6,
        teaching_mode: str = "OFFLINE",
        cache_dir: str = "./lectures"
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
        
        # Create cache directory
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize LLM only if requested
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
