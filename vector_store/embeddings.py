"""
Embeddings Generator

Generates vector embeddings for text chunks using pre-trained models.

Supported providers:
- OpenAI embeddings (text-embedding-3-small, text-embedding-ada-002)
- Google Gemini embeddings (text-embedding-004)
"""

import logging
import os
from typing import List, Optional, Dict, Any
from enum import Enum

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
    """Generate embeddings for text chunks using various API providers."""
    
    def __init__(
        self, 
        provider: str = "openai",
        model_name: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        self.provider = provider.lower()
        
        if model_name is None:
            if self.provider == "openai":
                model_name = "text-embedding-3-small"
            elif self.provider == "gemini":
                model_name = "text-embedding-004"
            else:
                raise ValueError(f"Unsupported provider: {provider}")
        
        self.model_name = model_name
        
        if api_key is None:
            if self.provider == "openai":
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
            elif self.provider == "gemini":
                api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
                if not api_key:
                    raise ValueError("Gemini API key not found. Set GEMINI_API_KEY environment variable.")
        
        self.api_key = api_key
        self.client = None
        self._initialize_client()
        
        logger.info(f"EmbeddingGenerator initialized: provider={self.provider}, model={self.model_name}")
    
    def _initialize_client(self):
        try:
            if self.provider == "openai":
                try:
                    from openai import OpenAI
                except ImportError:
                    raise ImportError("OpenAI library not installed. Install with: pip install openai")
                
                self.client = OpenAI(api_key=self.api_key)
                logger.info("OpenAI client initialized successfully")
                
            elif self.provider == "gemini":
                try:
                    from google import genai
                except ImportError:
                    raise ImportError("Google Genai library not installed. Install with: pip install google-genai")
                
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Gemini client initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize {self.provider} client: {e}")
            raise
    
    def generate_embedding(self, text: str) -> List[float]:
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            return []
        
        try:
            if self.provider == "openai":
                response = self.client.embeddings.create(
                    model=self.model_name,
                    input=text
                )
                embedding = response.data[0].embedding
                logger.debug(f"Generated OpenAI embedding: {len(embedding)} dimensions")
                return embedding
                
            elif self.provider == "gemini":
                result = self.client.models.embed_content(
                    model=self.model_name,
                    contents=text
                )
                embedding = result.embeddings[0].values
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
        if not texts:
            logger.warning("Empty text list provided for batch embedding")
            return []
        
        logger.info(f"Starting batch embedding generation for {len(texts)} texts")
        
        embeddings = []
        total = len(texts)
        
        for i, text in enumerate(texts, 1):
            try:
                embedding = self.generate_embedding(text)
                embeddings.append(embedding)
                
                if show_progress and i % 10 == 0:
                    logger.info(f"Progress: {i}/{total} embeddings generated")
                    
            except Exception as e:
                logger.error(f"Failed to embed text {i}/{total}: {e}")
                embeddings.append([])
                continue
        
        successful = sum(1 for e in embeddings if e)
        failed = total - successful
        
        logger.info(f"Batch embedding complete: {successful} successful, {failed} failed, total {total}")
        
        if failed > 0:
            logger.warning(f"{failed} texts failed to embed and have empty embeddings")
        
        return embeddings
    
    def get_embedding_dimension(self) -> int:
        dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536,
            "text-embedding-004": 768,
        }
        return dimensions.get(self.model_name, 1536)
    
    def get_provider_info(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model_name,
            "dimensions": self.get_embedding_dimension(),
            "api_key_set": bool(self.api_key),
        }


def generate_embeddings(
    texts: List[str],
    provider: str = "openai",
    model_name: Optional[str] = None,
    api_key: Optional[str] = None
) -> List[List[float]]:
    generator = EmbeddingGenerator(
        provider=provider,
        model_name=model_name,
        api_key=api_key
    )
    return generator.generate_embeddings_batch(texts)
