"""
Embeddings Generator

Generates vector embeddings for text chunks using pre-trained models.

WHAT ARE EMBEDDINGS?
- Embeddings are numerical vector representations of text
- They capture semantic meaning in a high-dimensional space
- Similar texts have similar embeddings (vectors close together)
- Typically 384-1536 dimensions depending on the model

WHY EMBEDDINGS ARE NEEDED FOR RAG:
- RAG systems need to find relevant context for user queries
- Embeddings enable semantic search (meaning-based, not just keyword matching)
- By converting both documents and queries to embeddings, we can:
  1. Measure similarity using vector distance (cosine similarity, dot product)
  2. Retrieve the most relevant chunks for a given query
  3. Provide better context to the LLM for generating responses

HOW IT WORKS IN RAG:
1. Convert document chunks to embeddings → Store in vector database
2. Convert user query to embedding → Search for similar embeddings
3. Retrieve top-k most similar chunks → Use as context for LLM

Supported providers:
- OpenAI embeddings (text-embedding-3-small, text-embedding-ada-002)
- Google Gemini embeddings (text-embedding-004)
"""

import logging
import os
from typing import List, Optional, Dict, Any
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EmbeddingProvider(Enum):
    """Supported embedding providers."""
    OPENAI = "openai"
    GEMINI = "gemini"


class EmbeddingGenerator:
    """
    Generate embeddings for text chunks using various API providers.
    
    This class provides a unified interface for generating embeddings
    regardless of the underlying provider (OpenAI, Gemini, etc.).
    
    The provider can be easily swapped by changing the configuration,
    making the system flexible and maintainable.
    """
    
    def __init__(
        self, 
        provider: str = "openai",
        model_name: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        """
        Initialize the embedding generator.
        
        Args:
            provider: Embedding provider to use ("openai" or "gemini")
            model_name: Specific model name (uses defaults if not provided)
            api_key: API key (reads from environment if not provided)
        
        Raises:
            ValueError: If provider is not supported or API key is missing
        """
        self.provider = provider.lower()
        
        # Set default models for each provider
        if model_name is None:
            if self.provider == "openai":
                model_name = "text-embedding-3-small"  # 1536 dimensions, cost-effective
            elif self.provider == "gemini":
                model_name = "text-embedding-004"  # Latest Gemini embedding model
            else:
                raise ValueError(
                    f"Unsupported provider: {provider}. "
                    f"Supported providers: openai, gemini"
                )
        
        self.model_name = model_name
        
        # Get API key from parameter or environment
        if api_key is None:
            if self.provider == "openai":
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError(
                        "OpenAI API key not found. Set OPENAI_API_KEY environment variable."
                    )
            elif self.provider == "gemini":
                api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
                if not api_key:
                    raise ValueError(
                        "Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY "
                        "environment variable."
                    )
        
        self.api_key = api_key
        
        # Initialize the appropriate client
        self.client = None
        self._initialize_client()
        
        logger.info(
            f"EmbeddingGenerator initialized: provider={self.provider}, "
            f"model={self.model_name}"
        )
    
    def _initialize_client(self):
        """
        Initialize the API client based on the provider.
        
        This method lazy-loads the required library to avoid importing
        unnecessary dependencies.
        """
        try:
            if self.provider == "openai":
                # Import OpenAI library
                try:
                    from openai import OpenAI
                except ImportError:
                    raise ImportError(
                        "OpenAI library not installed. Install with: pip install openai"
                    )
                
                self.client = OpenAI(api_key=self.api_key)
                logger.info("OpenAI client initialized successfully")
                
            elif self.provider == "gemini":
                # Import Google Generative AI library
                try:
                    import google.generativeai as genai
                except ImportError:
                    raise ImportError(
                        "Google Generative AI library not installed. "
                        "Install with: pip install google-generativeai"
                    )
                
                genai.configure(api_key=self.api_key)
                self.client = genai
                logger.info("Gemini client initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize {self.provider} client: {e}")
            raise
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Input text to embed
            
        Returns:
            Vector embedding as a list of floats
            
        Raises:
            Exception: If embedding generation fails
            
        Example:
            >>> generator = EmbeddingGenerator(provider="openai")
            >>> embedding = generator.generate_embedding("Hello world")
            >>> print(len(embedding))  # 1536 for text-embedding-3-small
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            return []
        
        try:
            if self.provider == "openai":
                # OpenAI API call
                response = self.client.embeddings.create(
                    model=self.model_name,
                    input=text
                )
                embedding = response.data[0].embedding
                logger.debug(f"Generated OpenAI embedding: {len(embedding)} dimensions")
                return embedding
                
            elif self.provider == "gemini":
                # Gemini API call
                result = self.client.embed_content(
                    model=f"models/{self.model_name}",
                    content=text,
                    task_type="retrieval_document"  # Optimized for RAG
                )
                embedding = result['embedding']
                logger.debug(f"Generated Gemini embedding: {len(embedding)} dimensions")
                return embedding
                
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise Exception(f"Failed to generate embedding: {str(e)}")
    
    def generate_embeddings_batch(
        self, 
        texts: List[str],
        show_progress: bool = True
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently.
        
        This method processes texts in batches to optimize API usage
        and provides progress logging.
        
        Args:
            texts: List of input texts to embed
            show_progress: Whether to log progress (default: True)
            
        Returns:
            List of vector embeddings (one per input text)
            
        Example:
            >>> generator = EmbeddingGenerator(provider="openai")
            >>> chunks = ["Chunk 1 text", "Chunk 2 text", "Chunk 3 text"]
            >>> embeddings = generator.generate_embeddings_batch(chunks)
            >>> print(f"Generated {len(embeddings)} embeddings")
        """
        if not texts:
            logger.warning("Empty text list provided for batch embedding")
            return []
        
        logger.info(f"Starting batch embedding generation for {len(texts)} texts")
        
        embeddings = []
        total = len(texts)
        
        # Process each text
        for i, text in enumerate(texts, 1):
            try:
                embedding = self.generate_embedding(text)
                embeddings.append(embedding)
                
                # Log progress
                if show_progress and i % 10 == 0:
                    logger.info(f"Progress: {i}/{total} embeddings generated")
                    
            except Exception as e:
                logger.error(f"Failed to embed text {i}/{total}: {e}")
                # Append empty embedding to maintain index alignment
                embeddings.append([])
                continue
        
        # Final summary
        successful = sum(1 for e in embeddings if e)
        failed = total - successful
        
        logger.info(
            f"Batch embedding complete: {successful} successful, {failed} failed, "
            f"total {total}"
        )
        
        if failed > 0:
            logger.warning(f"{failed} texts failed to embed and have empty embeddings")
        
        return embeddings
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of embeddings for the current model.
        
        Returns:
            Number of dimensions in the embedding vector
        """
        # Known dimensions for common models
        dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
            "text-embedding-004": 768,
        }
        
        return dimensions.get(self.model_name, 1536)  # Default to 1536
    
    def get_provider_info(self) -> Dict[str, Any]:
        """
        Get information about the current provider and model.
        
        Returns:
            Dictionary with provider details
        """
        return {
            "provider": self.provider,
            "model": self.model_name,
            "dimensions": self.get_embedding_dimension(),
            "api_key_set": bool(self.api_key),
        }


# Convenience function for simple imports
def generate_embeddings(
    texts: List[str],
    provider: str = "openai",
    model_name: Optional[str] = None,
    api_key: Optional[str] = None
) -> List[List[float]]:
    """
    Convenience function to generate embeddings without instantiating the class.
    
    This is a simple wrapper that allows for easy imports like:
    from vector_store.embeddings import generate_embeddings
    
    Args:
        texts: List of texts to embed
        provider: Embedding provider ("openai" or "gemini")
        model_name: Specific model name (optional)
        api_key: API key (optional, reads from environment)
    
    Returns:
        List of embeddings
    
    Example:
        >>> from vector_store.embeddings import generate_embeddings
        >>> embeddings = generate_embeddings(["Hello", "World"])
        >>> print(f"Generated {len(embeddings)} embeddings")
    """
    generator = EmbeddingGenerator(
        provider=provider,
        model_name=model_name,
        api_key=api_key
    )
    return generator.generate_embeddings_batch(texts)
