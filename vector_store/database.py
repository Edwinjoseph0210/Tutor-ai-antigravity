"""
Vector Database

Manages storage and retrieval of vector embeddings using ChromaDB.

WHAT IS A VECTOR DATABASE?
- A vector database stores high-dimensional vectors (embeddings) efficiently
- It enables fast similarity search using vector distance metrics
- Unlike traditional databases that search by exact matches, vector databases
  find semantically similar items based on vector proximity
- Essential for RAG systems to retrieve relevant context quickly

WHY CHROMADB FOR RAG?
- Lightweight: No separate server needed, runs in-process
- Persistent: Stores data on disk, survives restarts
- Fast: Optimized for similarity search with HNSW indexing
- Simple API: Easy to use with minimal setup
- Free & Open Source: No cost, no API keys needed
- Perfect for: Development, small-to-medium scale deployments

HOW IT WORKS IN RAG:
1. Ingestion: Store document chunks with their embeddings
2. Query: Convert user question to embedding
3. Search: Find most similar chunks using vector distance
4. Retrieve: Return top-k relevant chunks to LLM for context

Supported backends:
- ChromaDB (local, persistent)
"""

import logging
import os
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VectorDatabase:
    """
    Manage vector storage and similarity search using ChromaDB.
    
    This class provides a simple interface for:
    - Storing document chunks with their embeddings
    - Performing semantic similarity search
    - Managing collections (create, delete, clear)
    - Persisting data to disk for reuse across sessions
    """
    
    def __init__(
        self,
        collection_name: str = "ai_tutor_documents",
        persist_directory: str = "./data/chroma_db"
    ):
        """
        Initialize the vector database.
        
        Args:
            collection_name: Name of the collection to store documents
            persist_directory: Directory to persist the database on disk
        
        Raises:
            ImportError: If ChromaDB is not installed
        """
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        
        # Import ChromaDB
        try:
            import chromadb
            from chromadb.config import Settings
        except ImportError:
            raise ImportError(
                "ChromaDB is not installed. Install with: pip install chromadb"
            )
        
        # Create persist directory if it doesn't exist
        Path(persist_directory).mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB client with persistence
        logger.info(f"Initializing ChromaDB at: {persist_directory}")
        
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,  # Disable telemetry
                allow_reset=True
            )
        )
        
        # Get or create collection
        try:
            self.collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"description": "AI Tutor document chunks for RAG"}
            )
            
            # Get current document count
            doc_count = self.collection.count()
            
            logger.info(
                f"VectorDatabase initialized: collection='{collection_name}', "
                f"documents={doc_count}"
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize collection: {e}")
            raise
    
    def add_documents(
        self,
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: Optional[List[Dict[str, Any]]] = None
    ) -> int:
        """
        Add documents with their embeddings to the database.
        
        This method stores text chunks along with their vector embeddings
        for later retrieval via similarity search.
        
        Args:
            chunks: List of text chunks to store
            embeddings: List of embedding vectors (one per chunk)
            metadata: Optional list of metadata dicts (one per chunk)
        
        Returns:
            Number of documents successfully added
        
        Raises:
            ValueError: If chunks and embeddings have different lengths
            
        Example:
            >>> db = VectorDatabase()
            >>> chunks = ["Text 1", "Text 2"]
            >>> embeddings = [[0.1, 0.2, ...], [0.3, 0.4, ...]]
            >>> db.add_documents(chunks, embeddings)
            2
        """
        if not chunks:
            logger.warning("No chunks provided to add_documents")
            return 0
        
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"Chunks ({len(chunks)}) and embeddings ({len(embeddings)}) "
                f"must have the same length"
            )
        
        logger.info(f"Adding {len(chunks)} documents to collection '{self.collection_name}'")
        
        # Generate unique IDs for each chunk
        # Use format: doc_<index> where index is current count + position
        current_count = self.collection.count()
        ids = [f"doc_{current_count + i}" for i in range(len(chunks))]
        
        # Prepare metadata
        if metadata is None:
            # Create default metadata with chunk index
            metadata = [{"chunk_index": i} for i in range(len(chunks))]
        else:
            # Ensure metadata has chunk_index
            for i, meta in enumerate(metadata):
                if "chunk_index" not in meta:
                    meta["chunk_index"] = i
        
        try:
            # Add documents to ChromaDB
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadata
            )
            
            logger.info(
                f"✓ Successfully added {len(chunks)} documents. "
                f"Total documents: {self.collection.count()}"
            )
            
            return len(chunks)
            
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise
    
    def similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Tuple[str, float, Dict[str, Any]]]:
        """
        Perform semantic similarity search.
        
        This method finds the most similar documents to the query embedding
        using vector distance (cosine similarity by default in ChromaDB).
        
        Args:
            query_embedding: Vector embedding of the query
            top_k: Number of top results to return (default: 5)
            filter_metadata: Optional metadata filters (e.g., {"source": "biology"})
        
        Returns:
            List of tuples: (document_text, similarity_score, metadata)
            Sorted by similarity (most similar first)
        
        Example:
            >>> db = VectorDatabase()
            >>> query_emb = [0.1, 0.2, 0.3, ...]
            >>> results = db.similarity_search(query_emb, top_k=3)
            >>> for text, score, meta in results:
            ...     print(f"Score: {score:.4f} - {text[:50]}...")
        """
        if not query_embedding:
            logger.warning("Empty query embedding provided")
            return []
        
        logger.info(f"Performing similarity search (top_k={top_k})")
        
        try:
            # Query ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=filter_metadata,  # Optional metadata filtering
                include=["documents", "distances", "metadatas"]
            )
            
            # ChromaDB returns results in a specific format
            # Extract and format results
            documents = results["documents"][0] if results["documents"] else []
            distances = results["distances"][0] if results["distances"] else []
            metadatas = results["metadatas"][0] if results["metadatas"] else []
            
            # Combine into tuples (document, score, metadata)
            # Note: ChromaDB returns distances (lower = more similar)
            # Convert to similarity scores (higher = more similar)
            formatted_results = []
            for doc, dist, meta in zip(documents, distances, metadatas):
                # Convert distance to similarity score (1 / (1 + distance))
                similarity = 1.0 / (1.0 + dist)
                formatted_results.append((doc, similarity, meta))
            
            logger.info(f"Found {len(formatted_results)} results")
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            raise
    
    def get_document_count(self) -> int:
        """
        Get the total number of documents in the collection.
        
        Returns:
            Number of documents stored
        """
        try:
            count = self.collection.count()
            logger.debug(f"Collection '{self.collection_name}' has {count} documents")
            return count
        except Exception as e:
            logger.error(f"Failed to get document count: {e}")
            return 0
    
    def delete_documents(self, document_ids: List[str]) -> int:
        """
        Delete specific documents from the database.
        
        Args:
            document_ids: List of document IDs to delete
        
        Returns:
            Number of documents deleted
        """
        if not document_ids:
            logger.warning("No document IDs provided for deletion")
            return 0
        
        logger.info(f"Deleting {len(document_ids)} documents")
        
        try:
            self.collection.delete(ids=document_ids)
            logger.info(f"✓ Deleted {len(document_ids)} documents")
            return len(document_ids)
            
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            raise
    
    def clear_collection(self) -> bool:
        """
        Clear all documents from the collection.
        
        WARNING: This deletes all stored documents!
        
        Returns:
            True if successful, False otherwise
        """
        logger.warning(f"Clearing all documents from collection '{self.collection_name}'")
        
        try:
            # Delete the collection and recreate it
            self.client.delete_collection(name=self.collection_name)
            
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "AI Tutor document chunks for RAG"}
            )
            
            logger.info("✓ Collection cleared successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear collection: {e}")
            return False
    
    def get_collection_info(self) -> Dict[str, Any]:
        """
        Get information about the current collection.
        
        Returns:
            Dictionary with collection details
        """
        return {
            "name": self.collection_name,
            "document_count": self.get_document_count(),
            "persist_directory": self.persist_directory,
            "metadata": self.collection.metadata
        }


# Convenience function for simple usage
def create_vector_db(
    collection_name: str = "ai_tutor_documents",
    persist_directory: str = "./data/chroma_db"
) -> VectorDatabase:
    """
    Convenience function to create a vector database.
    
    Args:
        collection_name: Name of the collection
        persist_directory: Directory for persistence
    
    Returns:
        VectorDatabase instance
    
    Example:
        >>> from vector_store.database import create_vector_db
        >>> db = create_vector_db()
        >>> db.add_documents(chunks, embeddings)
    """
    return VectorDatabase(
        collection_name=collection_name,
        persist_directory=persist_directory
    )
