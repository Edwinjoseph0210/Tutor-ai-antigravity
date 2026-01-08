"""
PDF and document parsing utilities for study materials
Extracts text from PDF, DOCX, and TXT files
"""

import os
from typing import Dict, List, Optional

def extract_text_from_pdf(filepath: str) -> str:
    """Extract text from PDF file"""
    try:
        import PyPDF2
        text = ""
        with open(filepath, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        # Fallback to pdfplumber
        try:
            import pdfplumber
            text = ""
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
            return text.strip()
        except Exception as e2:
            print(f"Error with pdfplumber: {e2}")
            return ""

def extract_text_from_docx(filepath: str) -> str:
    """Extract text from DOCX file"""
    try:
        from docx import Document
        doc = Document(filepath)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting DOCX text: {e}")
        return ""

def extract_text_from_txt(filepath: str) -> str:
    """Extract text from TXT file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            return file.read().strip()
    except Exception as e:
        print(f"Error reading TXT file: {e}")
        return ""

def extract_text_from_file(filepath: str) -> str:
    """
    Extract text from file based on extension
    Supports: PDF, DOCX, TXT
    """
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext == '.pdf':
        return extract_text_from_pdf(filepath)
    elif ext in ['.docx', '.doc']:
        return extract_text_from_docx(filepath)
    elif ext == '.txt':
        return extract_text_from_txt(filepath)
    else:
        print(f"Unsupported file type: {ext}")
        return ""

def extract_topics_with_ai(text: str, subject: str, gemini_model) -> List[Dict]:
    """
    Use Gemini AI to extract topics from text
    Returns structured list of topics with titles, descriptions, and content
    """
    if not text or len(text) < 100:
        return []
    
    # Limit text length for API (use first 50000 chars)
    text_sample = text[:50000] if len(text) > 50000 else text
    
    prompt = f"""Analyze this educational content for {subject} and extract structured topics.

Content:
{text_sample}

Extract main topics/chapters with:
1. Clear, descriptive titles
2. Brief description (2-3 sentences)
3. Key concepts covered
4. Relevant content excerpt

Return ONLY valid JSON in this exact format:
{{
  "topics": [
    {{
      "title": "Topic Title",
      "description": "Brief description of what this topic covers",
      "content": "Key content and concepts from the material",
      "order": 1
    }}
  ]
}}

Extract 4-8 main topics. Be specific and educational."""

    try:
        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean response - remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        
        import json
        result = json.loads(response_text)
        return result.get('topics', [])
    except Exception as e:
        print(f"Error extracting topics with AI: {e}")
        # Return fallback topics
        return [
            {
                "title": f"Introduction to {subject}",
                "description": "Overview and fundamental concepts",
                "content": text[:1000],
                "order": 1
            },
            {
                "title": f"Core Concepts in {subject}",
                "description": "Key principles and theories",
                "content": text[1000:2000] if len(text) > 1000 else text,
                "order": 2
            }
        ]
