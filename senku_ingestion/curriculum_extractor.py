"""
Curriculum Extractor

Automatically analyzes PDF content to extract teaching curriculum:
- Identifies chapters, sections, and major topics
- Creates ordered teaching sequence
- Uses actual headings from the document (no guessing)

This enables autonomous teaching without user input.
"""

import logging
import re
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CurriculumExtractor:
    """
    Extract teaching curriculum from document text.
    
    Identifies:
    - Chapters
    - Major sections
    - Teaching units
    
    Uses actual document structure, not invented topics.
    """
    
    def __init__(self):
        """Initialize the curriculum extractor."""
        logger.info("CurriculumExtractor initialized")
    
    def extract_curriculum(self, text: str, chunks: List[str] = None) -> List[Dict[str, str]]:
        """
        Extract curriculum from document text.
        
        Args:
            text: Full document text
            chunks: Optional list of text chunks (for additional analysis)
        
        Returns:
            List of curriculum items, each containing:
            {
                'title': 'Chapter/Section title',
                'type': 'chapter' or 'section',
                'order': int (sequence number)
            }
        """
        logger.info("Extracting curriculum from document...")
        
        curriculum = []
        
        # Strategy 1: Look for Table of Contents
        toc_curriculum = self._extract_from_toc(text)
        if toc_curriculum:
            logger.info(f"✓ Found Table of Contents with {len(toc_curriculum)} items")
            return self._deduplicate_curriculum(toc_curriculum)
        
        # Strategy 2: Extract from heading patterns
        heading_curriculum = self._extract_from_headings(text)
        if heading_curriculum:
            logger.info(f"✓ Extracted {len(heading_curriculum)} items from headings")
            return self._deduplicate_curriculum(heading_curriculum)
        
        # Strategy 3: Use chunks to identify major topics
        if chunks:
            chunk_curriculum = self._extract_from_chunks(chunks)
            if chunk_curriculum:
                logger.info(f"✓ Extracted {len(chunk_curriculum)} items from chunks")
                return self._deduplicate_curriculum(chunk_curriculum)
        
        # Fallback: Create basic curriculum
        logger.warning("Could not extract detailed curriculum. Using fallback.")
        return self._create_fallback_curriculum(text)
    
    def _deduplicate_curriculum(self, curriculum: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Remove duplicate curriculum items (case-insensitive).
        
        Handles cases like:
        - "Introduction to Biology" and "INTRODUCTION TO BIOLOGY"
        - "Cell Structure" and "cell structure"
        
        Keeps the first occurrence of each unique title.
        
        Args:
            curriculum: List of curriculum items
        
        Returns:
            Deduplicated list of curriculum items
        """
        seen_titles = set()
        unique_curriculum = []
        
        for item in curriculum:
            # Normalize title for comparison (lowercase, strip whitespace)
            normalized_title = item['title'].lower().strip()
            
            if normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                unique_curriculum.append(item)
            else:
                logger.debug(f"Skipping duplicate: '{item['title']}'")
        
        if len(unique_curriculum) < len(curriculum):
            logger.info(f"Removed {len(curriculum) - len(unique_curriculum)} duplicate items")
        
        return unique_curriculum
    
    def _extract_from_toc(self, text: str) -> List[Dict[str, str]]:
        """
        Extract curriculum from Table of Contents.
        
        Looks for patterns like:
        - "Table of Contents"
        - "Contents"
        - Chapter listings
        """
        curriculum = []
        
        # Find TOC section
        toc_patterns = [
            r'(?i)table\s+of\s+contents',
            r'(?i)^contents$',
            r'(?i)index'
        ]
        
        toc_start = None
        for pattern in toc_patterns:
            match = re.search(pattern, text, re.MULTILINE)
            if match:
                toc_start = match.start()
                break
        
        if not toc_start:
            return []
        
        # Extract TOC section (next ~2000 chars)
        toc_text = text[toc_start:toc_start + 2000]
        
        # Look for chapter patterns
        chapter_patterns = [
            r'(?i)chapter\s+(\d+)[:\s]+(.+?)(?:\n|\.{2,}|\d+)',
            r'(?i)(\d+)\.\s+(.+?)(?:\n|\.{2,}|\d+)',
            r'(?i)unit\s+(\d+)[:\s]+(.+?)(?:\n|\.{2,})',
        ]
        
        for pattern in chapter_patterns:
            matches = re.finditer(pattern, toc_text)
            for match in matches:
                chapter_num = match.group(1)
                chapter_title = match.group(2).strip()
                
                # Clean up title
                chapter_title = re.sub(r'\.{2,}.*$', '', chapter_title).strip()
                
                if len(chapter_title) > 3 and len(chapter_title) < 100:
                    curriculum.append({
                        'title': chapter_title,
                        'type': 'chapter',
                        'order': int(chapter_num) if chapter_num.isdigit() else len(curriculum) + 1
                    })
        
        # Sort by order
        curriculum.sort(key=lambda x: x['order'])
        
        return curriculum if len(curriculum) >= 2 else []
    
    def _extract_from_headings(self, text: str) -> List[Dict[str, str]]:
        """
        Extract curriculum from heading patterns in the text.
        
        Looks for:
        - CHAPTER X: Title
        - X. Title
        - Major headings (all caps, short lines)
        """
        curriculum = []
        
        # Pattern 1: "CHAPTER X: Title" or "Chapter X: Title"
        chapter_pattern = r'(?i)(?:^|\n)chapter\s+(\d+)[:\s]+(.+?)(?:\n|$)'
        matches = re.finditer(chapter_pattern, text)
        
        for match in matches:
            chapter_num = match.group(1)
            chapter_title = match.group(2).strip()
            
            if len(chapter_title) > 3 and len(chapter_title) < 100:
                curriculum.append({
                    'title': f"Chapter {chapter_num}: {chapter_title}",
                    'type': 'chapter',
                    'order': int(chapter_num)
                })
        
        if curriculum:
            curriculum.sort(key=lambda x: x['order'])
            return curriculum
        
        # Pattern 2: Numbered sections "1. Title", "2. Title"
        section_pattern = r'(?:^|\n)(\d+)\.\s+([A-Z][^\n]{10,80})(?:\n|$)'
        matches = re.finditer(section_pattern, text)
        
        for match in matches:
            section_num = match.group(1)
            section_title = match.group(2).strip()
            
            # Filter out likely non-headings
            if not re.search(r'\d{2,}', section_title):  # Avoid dates, page numbers
                curriculum.append({
                    'title': section_title,
                    'type': 'section',
                    'order': int(section_num) if section_num.isdigit() else len(curriculum) + 1
                })
        
        if len(curriculum) >= 3:
            curriculum.sort(key=lambda x: x['order'])
            return curriculum[:20]  # Limit to 20 sections
        
        # Pattern 3: ALL CAPS headings (likely major sections)
        caps_pattern = r'(?:^|\n)([A-Z][A-Z\s]{5,60})(?:\n|$)'
        matches = re.finditer(caps_pattern, text)
        
        for i, match in enumerate(matches):
            heading = match.group(1).strip()
            
            # Filter out common non-headings
            if heading not in ['TABLE OF CONTENTS', 'CONTENTS', 'INDEX', 'REFERENCES']:
                if len(heading.split()) >= 2:  # At least 2 words
                    # Clean up the title and fix spacing issues
                    cleaned_title = self._clean_title(heading.title())
                    curriculum.append({
                        'title': cleaned_title,
                        'type': 'section',
                        'order': i + 1
                    })
        
        return curriculum[:15] if len(curriculum) >= 3 else []
    
    def _clean_title(self, title: str) -> str:
        """
        Clean up curriculum title by fixing spacing issues.
        
        Fixes patterns like:
        - "Fixa Tion" -> "Fixation"
        - "Pasteurisa Tion" -> "Pasteurisation"
        - "Preser Vation" -> "Preservation"
        
        Args:
            title: Title to clean
        
        Returns:
            Cleaned title
        """
        # Fix pattern where single letter followed by space and lowercase letters
        # This catches "Fixa Tion" -> "Fixation"
        title = re.sub(r'([a-z])\s+([a-z])', r'\1\2', title)
        
        # Fix pattern where capital letter followed by space and lowercase
        # This catches "A Tion" -> "Ation"
        title = re.sub(r'([A-Z])\s+([a-z])', r'\1\2', title)
        
        # Remove multiple spaces
        title = re.sub(r'\s+', ' ', title)
        
        return title.strip()
    
    def _extract_from_chunks(self, chunks: List[str]) -> List[Dict[str, str]]:
        """
        Extract curriculum by analyzing chunk patterns.
        
        Groups chunks by topic similarity and creates teaching units.
        """
        curriculum = []
        
        # Look for chunks that start with capitalized headings
        for i, chunk in enumerate(chunks):
            lines = chunk.split('\n')
            if not lines:
                continue
            
            first_line = lines[0].strip()
            
            # Check if first line looks like a heading
            if (len(first_line) > 10 and len(first_line) < 100 and
                first_line[0].isupper() and
                not first_line.endswith('.') and
                len(first_line.split()) >= 2):
                
                curriculum.append({
                    'title': first_line,
                    'type': 'section',
                    'order': i + 1
                })
        
        # Deduplicate and limit
        seen = set()
        unique_curriculum = []
        for item in curriculum:
            if item['title'] not in seen:
                seen.add(item['title'])
                unique_curriculum.append(item)
        
        return unique_curriculum[:15] if len(unique_curriculum) >= 3 else []
    
    def _create_fallback_curriculum(self, text: str) -> List[Dict[str, str]]:
        """
        Create a basic curriculum when structure cannot be detected.
        
        Divides content into logical teaching segments.
        """
        logger.info("Creating fallback curriculum...")
        
        # Estimate number of teaching units based on text length
        text_length = len(text)
        num_units = max(3, min(10, text_length // 5000))
        
        curriculum = []
        for i in range(num_units):
            curriculum.append({
                'title': f"Teaching Unit {i + 1}",
                'type': 'section',
                'order': i + 1
            })
        
        return curriculum
    
    def get_curriculum_summary(self, curriculum: List[Dict[str, str]]) -> str:
        """
        Get a human-readable summary of the curriculum.
        
        Args:
            curriculum: List of curriculum items
        
        Returns:
            Formatted string summary
        """
        if not curriculum:
            return "No curriculum available"
        
        summary = f"Curriculum: {len(curriculum)} teaching units\n"
        summary += "=" * 60 + "\n"
        
        for item in curriculum:
            prefix = "📖" if item['type'] == 'chapter' else "📝"
            summary += f"{prefix} {item['order']}. {item['title']}\n"
        
        return summary


def extract_curriculum_from_text(text: str, chunks: List[str] = None) -> List[Dict[str, str]]:
    """
    Convenience function to extract curriculum.
    
    Args:
        text: Full document text
        chunks: Optional list of text chunks
    
    Returns:
        List of curriculum items
    """
    extractor = CurriculumExtractor()
    return extractor.extract_curriculum(text, chunks)
