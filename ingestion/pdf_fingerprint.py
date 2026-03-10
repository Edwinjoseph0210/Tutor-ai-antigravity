"""
PDF Fingerprinting Utility

Computes unique identifiers (SHA-256 hash) for PDF files to enable:
- Detection of duplicate PDFs
- Reuse of existing embeddings
- Efficient storage management

This prevents redundant API calls and embedding regeneration.
"""

import hashlib
import logging
from pathlib import Path
from typing import Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def compute_pdf_hash(file_path: Union[str, Path], chunk_size: int = 8192) -> str:
    """
    Compute SHA-256 hash of a PDF file.
    
    This function reads the file in chunks to handle large PDFs efficiently
    without loading the entire file into memory.
    
    Args:
        file_path: Path to the PDF file
        chunk_size: Size of chunks to read (default: 8KB)
    
    Returns:
        Hexadecimal string representation of the SHA-256 hash
    
    Raises:
        FileNotFoundError: If the PDF file doesn't exist
        Exception: For other file reading errors
    
    Example:
        >>> pdf_hash = compute_pdf_hash("textbook.pdf")
        >>> print(pdf_hash)
        'abcd1234ef567890...'
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        error_msg = f"PDF file not found: {file_path}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)
    
    logger.info(f"Computing SHA-256 hash for: {file_path}")
    
    try:
        # Create SHA-256 hash object
        sha256_hash = hashlib.sha256()
        
        # Read file in chunks and update hash
        with open(file_path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                sha256_hash.update(chunk)
        
        # Get hexadecimal representation
        file_hash = sha256_hash.hexdigest()
        
        logger.info(f"✓ Computed hash: {file_hash[:16]}... (truncated)")
        
        return file_hash
        
    except Exception as e:
        error_msg = f"Error computing hash for {file_path}: {e}"
        logger.error(error_msg)
        raise Exception(error_msg)


def compute_bytes_hash(file_bytes: bytes) -> str:
    """
    Compute SHA-256 hash of PDF file bytes.
    
    Useful when working with uploaded files in memory (e.g., Streamlit file uploads).
    
    Args:
        file_bytes: Raw bytes of the PDF file
    
    Returns:
        Hexadecimal string representation of the SHA-256 hash
    
    Example:
        >>> with open("textbook.pdf", "rb") as f:
        ...     pdf_bytes = f.read()
        >>> pdf_hash = compute_bytes_hash(pdf_bytes)
    """
    if not file_bytes:
        logger.warning("Empty bytes provided for hashing")
        return ""
    
    logger.info(f"Computing SHA-256 hash for {len(file_bytes):,} bytes")
    
    try:
        sha256_hash = hashlib.sha256(file_bytes)
        file_hash = sha256_hash.hexdigest()
        
        logger.info(f"✓ Computed hash: {file_hash[:16]}... (truncated)")
        
        return file_hash
        
    except Exception as e:
        error_msg = f"Error computing hash from bytes: {e}"
        logger.error(error_msg)
        raise Exception(error_msg)


def get_chroma_path_for_pdf(pdf_hash: str, base_dir: str = "./data/chroma_db") -> Path:
    """
    Get the ChromaDB persistence directory path for a given PDF hash.
    
    Args:
        pdf_hash: SHA-256 hash of the PDF file
        base_dir: Base directory for ChromaDB storage
    
    Returns:
        Path object for the ChromaDB persistence directory
    
    Example:
        >>> pdf_hash = "abcd1234..."
        >>> chroma_path = get_chroma_path_for_pdf(pdf_hash)
        >>> print(chroma_path)
        PosixPath('data/chroma_db/abcd1234...')
    """
    base_path = Path(base_dir)
    chroma_path = base_path / pdf_hash
    
    logger.debug(f"ChromaDB path for hash {pdf_hash[:16]}...: {chroma_path}")
    
    return chroma_path


def pdf_embeddings_exist(pdf_hash: str, base_dir: str = "./data/chroma_db") -> bool:
    """
    Check if embeddings already exist for a given PDF hash.
    
    Args:
        pdf_hash: SHA-256 hash of the PDF file
        base_dir: Base directory for ChromaDB storage
    
    Returns:
        True if embeddings exist, False otherwise
    
    Example:
        >>> pdf_hash = compute_pdf_hash("textbook.pdf")
        >>> if pdf_embeddings_exist(pdf_hash):
        ...     print("Embeddings already exist, reusing...")
        ... else:
        ...     print("New PDF, generating embeddings...")
    """
    chroma_path = get_chroma_path_for_pdf(pdf_hash, base_dir)
    exists = chroma_path.exists() and chroma_path.is_dir()
    
    if exists:
        logger.info(f"✓ Embeddings found for hash {pdf_hash[:16]}... at {chroma_path}")
    else:
        logger.info(f"✗ No embeddings found for hash {pdf_hash[:16]}...")
    
    return exists
