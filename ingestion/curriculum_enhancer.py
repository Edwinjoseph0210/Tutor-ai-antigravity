"""
Curriculum Enhancer

Uses Gemini API to improve low-quality curriculum section names.
Only activates when extracted curriculum is deemed inadequate.
"""

import logging
import json
import re
import os
import requests
from pathlib import Path
from typing import List, Dict, Optional

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CurriculumEnhancer:
    """Enhances low-quality curriculum using Gemini API."""
    
    # v1 API requires -latest suffix
    SUPPORTED_MODELS = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-pro']
    
    def __init__(self, cache_dir: str = "./data/curriculum"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        
        self.api_key = None
        self.gemini_model = None
        self.gemini_available = False
        logger.info("Curriculum enhancement disabled - using original curriculum")
    
    def _select_working_model(self) -> Optional[str]:
        for model in self.SUPPORTED_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={self.api_key}"
                response = requests.post(
                    url,
                    json={"contents": [{"parts": [{"text": "Test"}]}]},
                    timeout=10
                )
                logger.info(f"Testing {model}: status={response.status_code}")
                if response.status_code == 200:
                    logger.info(f"✓ Model {model} working")
                    return model
                else:
                    logger.warning(f"Model {model} returned {response.status_code}: {response.text[:200]}")
            except Exception as e:
                logger.error(f"Model {model} failed: {e}")
        return None
    
    def enhance(
        self,
        sections: List[Dict[str, str]],
        document_text: str,
        pdf_hash: str
    ) -> List[Dict[str, str]]:
        cache_file = self.cache_dir / f"{pdf_hash}_enhanced.json"
        if cache_file.exists():
            logger.info(" Loading enhanced curriculum from cache")
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        
        is_good, reasons = self._validate_quality(sections)
        
        if is_good:
            logger.info("✓ Curriculum quality is good.")
            return sections
        
        logger.warning(" Curriculum quality is BAD:")
        for reason in reasons:
            logger.warning(f"  - {reason}")
        
        if not self.gemini_available:
            logger.warning("Using original curriculum.")
            return sections
        
        logger.info("Triggering Gemini enhancement...")
        enhanced = self._generate_with_gemini(document_text)
        
        if enhanced:
            try:
                with open(cache_file, 'w', encoding='utf-8') as f:
                    json.dump(enhanced, f, indent=2)
                logger.info(f"Cached enhanced curriculum")
            except Exception:
                pass
            return enhanced
        
        logger.warning("Enhancement failed. Using original curriculum.")
        return sections
    
    def _validate_quality(self, sections: List[Dict[str, str]]) -> tuple:
        reasons = []
        
        if len(sections) < 3:
            reasons.append(f"Only {len(sections)} sections")
        
        for i, section in enumerate(sections, 1):
            title = section.get('title', '')
            
            if '?' in title:
                reasons.append(f"Section {i} has question mark")
            
            if len(title) > 80:
                reasons.append(f"Section {i} too long")
            
            title_lower = title.lower()
            bad_starts = ["do ", "think ", "let us ", "can you ", "why ", "how ", "what ", "where "]
            for bad in bad_starts:
                if title_lower.startswith(bad):
                    reasons.append(f"Section {i} starts with '{bad}'")
                    break
        
        return len(reasons) == 0, reasons
    
    def _generate_with_gemini(self, document_text: str) -> Optional[List[Dict[str, str]]]:
        try:
            text = document_text[:8000]
            
            prompt = f"""You are an expert teacher.
Generate a clean curriculum from this textbook content.

Rules:
- Create 3 to 8 section titles
- Each title: 3-8 words
- Sound like textbook sections
- NO questions
- NO numbering
- Logical order
- Simple language

Text:
\"\"\"
{text}
\"\"\"

Return ONLY a JSON array:
["Introduction to Light", "Reflection and Refraction", "The Human Eye"]"""

            logger.info(f"Calling model: {self.gemini_model}")
            
            url = f"https://generativelanguage.googleapis.com/v1/models/{self.gemini_model}:generateContent?key={self.api_key}"
            response = requests.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"API error: {response.status_code}")
                return None
            
            result = response.json()
            text = result['candidates'][0]['content']['parts'][0]['text'].strip()
            
            match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', text, re.DOTALL)
            if match:
                json_text = match.group(1)
            else:
                match = re.search(r'\[.*?\]', text, re.DOTALL)
                if match:
                    json_text = match.group(0)
                else:
                    return None
            
            titles = json.loads(json_text)
            
            if not isinstance(titles, list):
                return None
            
            result = []
            for i, title in enumerate(titles, 1):
                if isinstance(title, str) and 3 <= len(title.split()) <= 8:
                    result.append({
                        'title': title.strip(),
                        'type': 'section',
                        'order': i
                    })
            
            if len(result) >= 3:
                logger.info(f"✓ Generated {len(result)} sections")
                return result
            
            return None
        
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return None


def enhance_curriculum(
    sections: List[Dict[str, str]],
    document_text: str,
    pdf_hash: str
) -> List[Dict[str, str]]:
    enhancer = CurriculumEnhancer()
    return enhancer.enhance(sections, document_text, pdf_hash)
