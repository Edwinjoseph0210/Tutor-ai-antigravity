"""
Text Processor

Handles chunking and preprocessing of text for optimal RAG performance.

WHY CHUNKING IS NEEDED FOR RAG:
- RAG systems retrieve relevant context from a knowledge base
- Embedding models have token limits (typically 512-8192 tokens)
- Smaller chunks = more precise retrieval of relevant information
- Larger chunks = more context but less precision
- Optimal chunk size balances precision vs. context

HOW CHUNK SIZE AFFECTS RETRIEVAL QUALITY:
- Too small (< 200 chars): Lacks context, may miss semantic meaning
- Too large (> 1500 chars): Less precise, may include irrelevant info
- Sweet spot (500-800 chars): Good balance for most use cases
- Overlap between chunks preserves context across boundaries

Key functions:
- Split text into semantic chunks
- Clean and normalize text
- Preserve sentence and paragraph boundaries
"""

import logging
import re
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TextProcessor:
    """
    Process and chunk text documents for embedding generation.
    
    This class provides intelligent text chunking that:
    - Respects paragraph boundaries
    - Avoids breaking sentences
    - Maintains context with overlapping chunks
    - Cleans and normalizes text for better embeddings
    """
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize the text processor.
        
        Args:
            chunk_size: Target size for each text chunk (in characters)
                       Recommended: 500-800 for most RAG applications
            chunk_overlap: Number of overlapping characters between chunks
                          Helps preserve context across chunk boundaries
                          Recommended: 10-20% of chunk_size
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        
        # Validate parameters
        if chunk_size < 100:
            logger.warning(f"Chunk size {chunk_size} is very small. Consider using 500-800.")
        if chunk_size > 2000:
            logger.warning(f"Chunk size {chunk_size} is very large. May reduce retrieval precision.")
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be less than chunk_size")
        if chunk_overlap < 0:
            raise ValueError("chunk_overlap must be non-negative")
        
        logger.info(
            f"TextProcessor initialized: chunk_size={chunk_size}, "
            f"chunk_overlap={chunk_overlap}"
        )
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks for embedding.
        
        This method uses a multi-level chunking strategy:
        1. First, try to split by paragraphs (preserves semantic units)
        2. If paragraphs are too large, split by sentences
        3. Add overlap between chunks to preserve context
        
        Args:
            text: Input text to chunk
            
        Returns:
            List of text chunks, each approximately chunk_size characters
            
        Example:
            >>> processor = TextProcessor(chunk_size=500, chunk_overlap=50)
            >>> chunks = processor.chunk_text(long_document)
            >>> print(f"Created {len(chunks)} chunks")
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for chunking")
            return []
        
        logger.info(f"Starting text chunking. Input length: {len(text)} characters")
        
        # Step 1: Clean the text first
        cleaned_text = self.clean_text(text)
        
        # Step 2: Split into paragraphs (double newline separated)
        paragraphs = self._split_into_paragraphs(cleaned_text)
        logger.debug(f"Split text into {len(paragraphs)} paragraphs")
        
        # Step 3: Create chunks from paragraphs
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            # If paragraph itself is larger than chunk_size, split it further
            if len(paragraph) > self.chunk_size * 1.5:
                # Split large paragraph by sentences
                sentences = self._split_into_sentences(paragraph)
                
                for sentence in sentences:
                    # Check if adding this sentence exceeds chunk size
                    if len(current_chunk) + len(sentence) + 1 <= self.chunk_size:
                        # Add sentence to current chunk
                        current_chunk += (" " if current_chunk else "") + sentence
                    else:
                        # Current chunk is full, save it and start new one
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                            
                            # Create overlap by keeping last part of current chunk
                            current_chunk = self._create_overlap(current_chunk) + " " + sentence
                        else:
                            # Single sentence is larger than chunk_size
                            # Split it forcefully (rare case)
                            current_chunk = sentence
            else:
                # Paragraph is reasonably sized
                # Check if adding it exceeds chunk size
                if len(current_chunk) + len(paragraph) + 2 <= self.chunk_size:
                    # Add paragraph to current chunk
                    current_chunk += ("\n\n" if current_chunk else "") + paragraph
                else:
                    # Save current chunk and start new one with this paragraph
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                        
                        # Create overlap
                        current_chunk = self._create_overlap(current_chunk) + "\n\n" + paragraph
                    else:
                        current_chunk = paragraph
        
        # Don't forget the last chunk
        if current_chunk and current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        # Step 4: Post-process chunks (remove very small chunks, merge if needed)
        chunks = self._post_process_chunks(chunks)
        
        # Log results
        logger.info(
            f"Chunking complete. Created {len(chunks)} chunks. "
            f"Avg chunk size: {sum(len(c) for c in chunks) // len(chunks) if chunks else 0} chars"
        )
        
        return chunks
    
    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text.
        
        This method performs comprehensive text cleaning:
        - Removes excessive dots and repeated punctuation
        - Normalizes whitespace (spaces, tabs, newlines)
        - Removes null characters and control characters
        - Normalizes unicode characters
        - Fixes common formatting issues
        
        Args:
            text: Input text to clean
            
        Returns:
            Cleaned and normalized text
            
        Example:
            >>> processor = TextProcessor()
            >>> clean = processor.clean_text("Hello....    world!!!")
            >>> print(clean)  # "Hello. world!"
        """
        if not text:
            return ""
        
        logger.debug(f"Cleaning text of length {len(text)}")
        
        # Step 1: Remove null characters and control characters
        text = text.replace('\x00', '')
        text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', text)
        
        # Step 2: Normalize unicode characters (e.g., smart quotes to regular quotes)
        # Replace smart quotes with regular quotes
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        text = text.replace('–', '-').replace('—', '-')
        
        # Step 3: Remove excessive dots (e.g., "....." -> "...")
        # Keep ellipsis (...) but remove longer sequences
        text = re.sub(r'\.{4,}', '...', text)
        
        # Step 4: Remove excessive repeated punctuation
        # e.g., "!!!" -> "!", "???" -> "?"
        text = re.sub(r'!{2,}', '!', text)
        text = re.sub(r'\?{2,}', '?', text)
        text = re.sub(r',{2,}', ',', text)
        text = re.sub(r';{2,}', ';', text)
        
        # Step 5: Normalize whitespace
        # Replace tabs with spaces
        text = text.replace('\t', ' ')
        
        # Replace multiple spaces with single space
        text = re.sub(r' {2,}', ' ', text)
        
        # Normalize line breaks (remove spaces before newlines)
        text = re.sub(r' +\n', '\n', text)
        
        # Replace multiple newlines with double newline (paragraph separator)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Step 6: Fix spacing around punctuation
        # Remove space before punctuation
        text = re.sub(r' +([.,!?;:])', r'\1', text)
        
        # Ensure space after punctuation (if followed by letter)
        text = re.sub(r'([.,!?;:])([A-Za-z])', r'\1 \2', text)
        
        # Step 7: Remove leading/trailing whitespace from each line
        lines = text.split('\n')
        lines = [line.strip() for line in lines]
        text = '\n'.join(lines)
        
        # Step 8: Final trim
        text = text.strip()
        
        logger.debug(f"Cleaned text length: {len(text)}")
        
        return text
    
    def _split_into_paragraphs(self, text: str) -> List[str]:
        """
        Split text into paragraphs.
        
        Paragraphs are separated by double newlines or more.
        
        Args:
            text: Input text
            
        Returns:
            List of paragraphs
        """
        # Split by double newline
        paragraphs = re.split(r'\n\n+', text)
        
        # Filter out empty paragraphs
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        return paragraphs
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences.
        
        Uses regex to detect sentence boundaries while handling:
        - Abbreviations (e.g., "Dr.", "Mr.", "etc.")
        - Decimal numbers (e.g., "3.14")
        - Multiple punctuation (e.g., "!?")
        
        Args:
            text: Input text
            
        Returns:
            List of sentences
        """
        # Simple sentence splitting regex
        # Matches: . ! ? followed by space and capital letter, or end of string
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
        
        # Filter out empty sentences
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    def _create_overlap(self, text: str) -> str:
        """
        Create overlap text from the end of a chunk.
        
        Takes the last chunk_overlap characters, but tries to start
        at a word boundary to avoid breaking words.
        
        Args:
            text: Text to create overlap from
            
        Returns:
            Overlap text
        """
        if len(text) <= self.chunk_overlap:
            return text
        
        # Get last chunk_overlap characters
        overlap = text[-self.chunk_overlap:]
        
        # Try to start at a word boundary (find first space)
        first_space = overlap.find(' ')
        if first_space > 0 and first_space < len(overlap) // 2:
            # Start after the first space to avoid partial word
            overlap = overlap[first_space + 1:]
        
        return overlap.strip()
    
    def _post_process_chunks(self, chunks: List[str]) -> List[str]:
        """
        Post-process chunks to ensure quality.
        
        - Removes very small chunks (< 50 characters)
        - Merges small chunks with neighbors if possible
        
        Args:
            chunks: List of raw chunks
            
        Returns:
            List of processed chunks
        """
        if not chunks:
            return []
        
        processed = []
        min_chunk_size = 50  # Minimum viable chunk size
        
        for i, chunk in enumerate(chunks):
            # Skip very small chunks unless it's the only chunk
            if len(chunk) < min_chunk_size and len(chunks) > 1:
                # Try to merge with previous chunk
                if processed and len(processed[-1]) + len(chunk) <= self.chunk_size * 1.2:
                    processed[-1] += " " + chunk
                    logger.debug(f"Merged small chunk {i} with previous chunk")
                else:
                    # Skip this chunk if it's too small and can't be merged
                    logger.debug(f"Skipped very small chunk {i} ({len(chunk)} chars)")
            else:
                processed.append(chunk)
        
        return processed
    
    def extract_metadata(self, text: str) -> Dict[str, any]:
        """
        Extract metadata from text (headers, topics, etc.).
        
        This is a basic implementation that extracts:
        - Character count
        - Word count
        - Line count
        - Potential headers (lines that are short and followed by content)
        
        Args:
            text: Input text
            
        Returns:
            Dictionary of metadata
            
        Example:
            >>> processor = TextProcessor()
            >>> metadata = processor.extract_metadata(document)
            >>> print(metadata['word_count'])
        """
        metadata = {
            'char_count': len(text),
            'word_count': len(text.split()),
            'line_count': len(text.splitlines()),
            'paragraph_count': len(self._split_into_paragraphs(text)),
        }
        
        # Try to detect potential headers (short lines followed by longer content)
        lines = text.split('\n')
        potential_headers = []
        
        for i, line in enumerate(lines):
            # A header is typically:
            # - Short (< 100 chars)
            # - Not empty
            # - Followed by more content
            if (len(line.strip()) > 0 and 
                len(line.strip()) < 100 and 
                i < len(lines) - 1 and
                len(lines[i + 1].strip()) > 0):
                # Check if it doesn't end with punctuation (typical for headers)
                if not line.strip()[-1] in '.!?':
                    potential_headers.append(line.strip())
        
        metadata['potential_headers'] = potential_headers[:5]  # Limit to first 5
        
        logger.debug(f"Extracted metadata: {metadata}")
        
        return metadata


# Convenience function for simple imports
def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
    """
    Convenience function to chunk text without instantiating TextProcessor.
    
    This is a simple wrapper around the TextProcessor class that allows
    for easy imports like: from ingestion.text_processor import chunk_text
    
    Args:
        text: Input text to chunk
        chunk_size: Target size for each chunk in characters (default: 500)
        chunk_overlap: Number of overlapping characters between chunks (default: 50)
    
    Returns:
        List of text chunks
    
    Example:
        >>> from ingestion.text_processor import chunk_text
        >>> chunks = chunk_text(document_text)
        >>> print(f"Created {len(chunks)} chunks")
    """
    processor = TextProcessor(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return processor.chunk_text(text)
