"""
Document Loader

Handles loading educational content from various file formats.

Supported formats:
- PDF documents
- Text files
- Markdown files
- Web pages (URLs)
"""

import logging
import os
from pathlib import Path
from typing import Optional

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DocumentLoader:
    """
    Load documents from various sources for ingestion into the RAG system.
    
    This class provides methods to extract text content from different file formats
    for use in the RAG-based AI Tutor system.
    """
    
    def __init__(self):
        """
        Initialize the document loader.
        
        Checks if required libraries are available and logs warnings if missing.
        """
        # Check if PyPDF2 is available
        if PdfReader is None:
            logger.warning(
                "PyPDF2 is not installed. PDF loading will not work. "
                "Install it with: pip install PyPDF2"
            )
        
        logger.info("DocumentLoader initialized successfully")
    
    def load_pdf(self, file_path: str) -> Optional[str]:
        """
        Load and extract text content from a PDF file.
        
        This method:
        1. Validates the file path and existence
        2. Opens the PDF file using PyPDF2
        3. Iterates through all pages
        4. Extracts text from each page
        5. Combines all text into a single string
        6. Performs basic text cleaning
        
        Args:
            file_path: Path to the PDF file (absolute or relative)
            
        Returns:
            Extracted text content as a single string, or None if extraction fails
            
        Raises:
            FileNotFoundError: If the PDF file doesn't exist
            ValueError: If PyPDF2 is not installed or file is not a PDF
            Exception: For other PDF reading errors
        """
        logger.info(f"Starting PDF loading from: {file_path}")
        
        # Step 1: Validate PyPDF2 is available
        if PdfReader is None:
            error_msg = "PyPDF2 is not installed. Cannot load PDF files."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Step 2: Validate file path
        file_path = str(Path(file_path).resolve())  # Convert to absolute path
        
        if not os.path.exists(file_path):
            error_msg = f"PDF file not found: {file_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Step 3: Validate file extension
        if not file_path.lower().endswith('.pdf'):
            error_msg = f"File is not a PDF: {file_path}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        try:
            # Step 4: Open and read the PDF file
            logger.info(f"Opening PDF file: {file_path}")
            reader = PdfReader(file_path)
            
            # Step 5: Get number of pages
            num_pages = len(reader.pages)
            logger.info(f"PDF has {num_pages} page(s)")
            
            if num_pages == 0:
                logger.warning(f"PDF file has no pages: {file_path}")
                return ""
            
            # Step 6: Extract text from all pages
            all_text = []
            
            for page_num in range(num_pages):
                try:
                    # Extract text from current page
                    page = reader.pages[page_num]
                    page_text = page.extract_text()
                    
                    # Log progress for large PDFs
                    if page_text:
                        all_text.append(page_text)
                        logger.debug(
                            f"Extracted {len(page_text)} characters from page {page_num + 1}"
                        )
                    else:
                        logger.warning(f"No text found on page {page_num + 1}")
                
                except Exception as page_error:
                    # Log error but continue with other pages
                    logger.error(
                        f"Error extracting text from page {page_num + 1}: {page_error}"
                    )
                    continue
            
            # Step 7: Combine all text with page separators
            combined_text = "\n\n".join(all_text)
            
            # Step 8: Basic text cleaning
            cleaned_text = self._clean_text(combined_text)
            
            # Step 9: Log success and return
            logger.info(
                f"Successfully extracted {len(cleaned_text)} characters "
                f"from {len(all_text)} pages"
            )
            
            return cleaned_text
        
        except Exception as e:
            # Catch any unexpected errors during PDF processing
            error_msg = f"Error reading PDF file {file_path}: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def _clean_text(self, text: str) -> str:
        """
        Perform basic text cleaning on extracted content.
        
        This method:
        - Removes excessive whitespace
        - Normalizes line breaks
        - Removes null characters
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Remove null characters
        text = text.replace('\x00', '')
        
        # Replace multiple spaces with single space
        import re
        text = re.sub(r' +', ' ', text)
        
        # Replace multiple newlines with double newline (paragraph separation)
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def load_text(self, file_path: str) -> Optional[str]:
        """
        Load content from a text file.
        
        Args:
            file_path: Path to the text file
            
        Returns:
            File content as string
            
        TODO: Implement with encoding detection
        """
        logger.warning("load_text() not yet implemented")
        pass
    
    def load_url(self, url: str) -> Optional[str]:
        """
        Load content from a web page.
        
        Args:
            url: URL to scrape
            
        Returns:
            Extracted text content
            
        TODO: Implement using BeautifulSoup or Scrapy
        """
        logger.warning("load_url() not yet implemented")
        pass
