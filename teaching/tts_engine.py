"""
Text-to-Speech Engine for AI Teacher

Provides voice synthesis for autonomous teaching.
Uses Inworld API for high-quality, natural-sounding TTS.

Features:
- Natural-sounding AI voice (Inworld API)
- Sentence-by-sentence speech
- Teacher-like voice settings
- Adjustable speech rate for clarity
- Cross-platform support (Windows, Mac, Linux)
"""

import logging
import re
from typing import Optional, List
import requests
import base64
import os
from pathlib import Path
import tempfile
import pygame
from dotenv import load_dotenv

# Import Piper TTS for offline fallback
try:
    from .piper_tts import PiperTTS
except ImportError:
    PiperTTS = None
    logger.warning("PiperTTS not available - offline fallback disabled")

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TTSEngine:
    """
    Text-to-Speech Engine for AI Teacher.
    
    Converts teaching text into spoken audio using offline TTS.
    Optimized for classroom teaching with clear, calm speech.
    """
    
    def __init__(
        self,
        rate: int = 150,
        volume: float = 0.9,
        voice_gender: str = "female",
        pdf_hash: Optional[str] = None
    ):
        """
        Initialize the TTS Engine.
        
        Args:
            rate: Speech rate (words per minute). Default 150 (slower for clarity)
            volume: Volume level (0.0 to 1.0). Default 0.9
            voice_gender: Preferred voice gender ("female" or "male")
            pdf_hash: Optional PDF hash to organize audio cache by document
        """
        self.rate = rate
        self.volume = volume
        self.voice_gender = voice_gender
        
        # Inworld API settings
        self.api_key = os.getenv('INWORLD_API_KEY')
        self.api_url = "https://api.inworld.ai/tts/v1/voice"
        
        # Voice ID - Using Ronald voice
        self.voice_id = "Ronald"
        self.model_id = "inworld-tts-1"
        
        # Permanent audio cache directory (to save Inworld API calls)
        # Organize by PDF hash to match lecture caching structure
        self.pdf_hash = pdf_hash
        
        if pdf_hash:
            # PDF-specific cache: data/audio_cache/{pdf_hash}/
            self.cache_dir = Path(__file__).parent.parent / "data" / "audio_cache" / pdf_hash
            logger.info(f"Audio cache directory (PDF-specific): {self.cache_dir}")
        else:
            # Global cache: data/audio_cache/global/
            self.cache_dir = Path(__file__).parent.parent / "data" / "audio_cache" / "global"
            logger.info(f"Audio cache directory (global): {self.cache_dir}")
        
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize pygame mixer for audio playback
        self._initialize_audio()
        
        # Initialize Piper TTS for offline fallback
        self.piper_tts = None
        if PiperTTS:
            try:
                self.piper_tts = PiperTTS()
                logger.info("✓ Piper TTS fallback initialized")
            except Exception as e:
                logger.warning(f"Piper TTS not available: {e}")
        
        logger.info(
            f"TTSEngine initialized: rate={rate}, volume={volume}, "
            f"voice={voice_gender}, voice_id={self.voice_id}"
        )
    
    def _initialize_audio(self):
        """Initialize pygame mixer for audio playback."""
        try:
            pygame.mixer.init()
            pygame.mixer.music.set_volume(self.volume)
            logger.info("✓ Audio playback engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize audio engine: {e}")
            raise
    
    def _generate_audio(self, text: str) -> Optional[Path]:
        """
        Generate audio from text using Inworld API with Piper fallback.
        
        Fallback logic:
        1. Check cache (mp3 or wav)
        2. Try Inworld API
        3. If Inworld fails, use Piper (offline)
        4. If both fail, return None
        
        Uses intelligent caching to avoid redundant API calls:
        - Checks cache first before making API request
        - Saves new audio to permanent cache
        - Returns cached audio if available
        
        Args:
            text: Text to convert to speech
        
        Returns:
            Path to audio file (cached or newly generated), or None if failed
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for audio generation")
            return None
        
        # Generate a hash for this text to use as filename
        import hashlib
        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        audio_file_mp3 = self.cache_dir / f"tts_{text_hash}.mp3"
        audio_file_wav = self.cache_dir / f"tts_{text_hash}.wav"
        
        # Check if audio is already cached (mp3 or wav)
        if audio_file_mp3.exists():
            logger.debug(f"✓ Using cached audio: {audio_file_mp3.name}")
            return audio_file_mp3
        
        if audio_file_wav.exists():
            logger.debug(f"✓ Using cached audio: {audio_file_wav.name} (Piper)")
            return audio_file_wav
        
        # Clean text for TTS
        clean_text = self._clean_text_for_tts(text)
        
        # Try Inworld API first
        if self.api_key:
            try:
                headers = {
                    "Authorization": f"Basic {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "text": clean_text,
                    "voiceId": self.voice_id,
                    "modelId": self.model_id
                }
                
                logger.debug(f"🌐 Fetching audio from Inworld API: {text[:50]}...")
                
                response = requests.post(self.api_url, json=payload, headers=headers, timeout=30)
                response.raise_for_status()
                
                result = response.json()
                audio_content = base64.b64decode(result['audioContent'])
                
                # Save to permanent cache
                with open(audio_file_mp3, "wb") as f:
                    f.write(audio_content)
                
                logger.info(f"✓ Audio cached: {audio_file_mp3.name} ({len(audio_content)} bytes)")
                return audio_file_mp3
                
            except (requests.exceptions.RequestException, Exception) as e:
                logger.debug(f"Inworld API failed for sentence: {e}")
                # Fall through to Piper fallback
        
        # Piper fallback - generate WAV file for sentence
        if self.piper_tts:
            try:
                success = self.piper_tts.generate(clean_text, audio_file_wav)
                
                if success and audio_file_wav.exists():
                    logger.debug(f"✓ Piper generated sentence audio (offline): {audio_file_wav.name}")
                    return audio_file_wav
                else:
                    logger.warning(f"Piper failed to generate sentence audio")
                    return None
            
            except Exception as e:
                logger.warning(f"Piper TTS failed for sentence: {e}")
                return None
        else:
            logger.warning("No TTS engine available for sentence audio")
            return None
    
    def speak_text(self, text: str, sentence_by_sentence: bool = True):
        """
        Speak the given text aloud.
        
        Args:
            text: Text to speak
            sentence_by_sentence: If True, speak sentence-by-sentence with pauses
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for speech")
            return
        
        try:
            if sentence_by_sentence:
                # Split into sentences and speak each one
                sentences = self._split_into_sentences(text)
                
                logger.info(f"🔊 Speaking {len(sentences)} sentences...")
                
                for i, sentence in enumerate(sentences, 1):
                    if sentence.strip():
                        logger.debug(f"  Speaking sentence {i}/{len(sentences)}")
                        
                        # Generate audio for this sentence
                        audio_file = self._generate_audio(sentence)
                        
                        if audio_file:
                            # Play the audio
                            pygame.mixer.music.load(str(audio_file))
                            pygame.mixer.music.play()
                            
                            # Wait for playback to finish
                            while pygame.mixer.music.get_busy():
                                pygame.time.Clock().tick(10)
                            
                            # Small pause between sentences
                            pygame.time.wait(200)
            else:
                # Speak entire text at once
                logger.info("🔊 Speaking text...")
                
                audio_file = self._generate_audio(text)
                
                if audio_file:
                    pygame.mixer.music.load(str(audio_file))
                    pygame.mixer.music.play()
                    
                    # Wait for playback to finish
                    while pygame.mixer.music.get_busy():
                        pygame.time.Clock().tick(10)
            
            logger.info("✓ Speech completed")
            
        except Exception as e:
            logger.error(f"Speech failed: {e}")
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences for natural speech pacing.
        
        Args:
            text: Text to split
        
        Returns:
            List of sentences
        """
        # Remove "Lesson N" header if present
        text = re.sub(r'^Lesson \d+\s*\n+', '', text)
        
        # Split on sentence boundaries (., !, ?)
        # Keep the punctuation with the sentence
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Filter out empty sentences
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    def _split_into_paragraphs_and_sentences(self, text: str) -> List[tuple]:
        """
        Split text into paragraphs and sentences for expressive delivery.
        
        Returns list of tuples: (sentence, is_paragraph_end)
        This allows for longer pauses between paragraphs.
        
        Args:
            text: Text to split
        
        Returns:
            List of (sentence, is_paragraph_end) tuples
        """
        # Remove "Lesson N" header if present
        text = re.sub(r'^Lesson \d+\s*\n+', '', text)
        
        # Split into paragraphs (double newline or single newline)
        paragraphs = re.split(r'\n\s*\n|\n', text)
        
        result = []
        for para_idx, paragraph in enumerate(paragraphs):
            if not paragraph.strip():
                continue
            
            # Split paragraph into sentences
            sentences = re.split(r'(?<=[.!?])\s+', paragraph)
            
            for sent_idx, sentence in enumerate(sentences):
                if sentence.strip():
                    # Mark last sentence of paragraph
                    is_para_end = (sent_idx == len(sentences) - 1)
                    result.append((sentence.strip(), is_para_end))
        
        return result
    
    def generate_lesson_audio(self, lesson_text: str, lesson_number: int) -> Optional[Path]:
        """
        Generate complete audio file for an entire lesson.
        
        Creates a single audio file containing the full lesson, organized by lesson number:
        data/audio_cache/{pdf_hash}/lesson_{N}/audio.mp3 (Inworld)
        data/audio_cache/{pdf_hash}/lesson_{N}/audio.wav (Piper fallback)
        
        Fallback logic:
        1. Check cache (mp3 or wav)
        2. Try Inworld API
        3. If Inworld fails, use Piper (offline)
        4. If both fail, return None
        
        Args:
            lesson_text: Complete lesson text
            lesson_number: Lesson number (1-indexed)
        
        Returns:
            Path to lesson audio file, or None if failed
        """
        # Create lesson-specific directory
        lesson_dir = self.cache_dir / f"lesson_{lesson_number}"
        lesson_dir.mkdir(parents=True, exist_ok=True)
        
        audio_file_mp3 = lesson_dir / "audio.mp3"
        audio_file_wav = lesson_dir / "audio.wav"
        
        # Check if lesson audio already cached (mp3 or wav)
        if audio_file_mp3.exists():
            logger.info(f"✓ Using cached lesson audio: lesson_{lesson_number}/audio.mp3")
            return audio_file_mp3
        
        if audio_file_wav.exists():
            logger.info(f"✓ Using cached lesson audio: lesson_{lesson_number}/audio.wav (Piper)")
            return audio_file_wav
        
        # Clean lesson text (remove markers for TTS)
        clean_text = self._clean_text_for_tts(lesson_text)
        
        # Try Inworld API first
        if self.api_key:
            try:
                logger.info(f"🌐 Generating audio for Lesson {lesson_number} from Inworld API...")
                
                headers = {
                    "Authorization": f"Basic {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "text": clean_text,
                    "voiceId": self.voice_id,
                    "modelId": self.model_id
                }
                
                response = requests.post(self.api_url, json=payload, headers=headers, timeout=30)
                response.raise_for_status()
                
                result = response.json()
                audio_content = base64.b64decode(result['audioContent'])
                
                # Save to lesson-specific cache
                with open(audio_file_mp3, "wb") as f:
                    f.write(audio_content)
                
                logger.info(f"✓ Lesson audio cached: lesson_{lesson_number}/audio.mp3 ({len(audio_content)} bytes)")
                return audio_file_mp3
                
            except (requests.exceptions.RequestException, Exception) as e:
                logger.warning(f"Inworld API failed for lesson {lesson_number}: {e}")
                logger.info("🎙️ Falling back to Piper TTS (offline)...")
                
                # Fall through to Piper fallback
        else:
            logger.warning("INWORLD_API_KEY not found, using Piper TTS (offline)...")
        
        # Piper fallback - generate WAV file
        if self.piper_tts:
            try:
                success = self.piper_tts.generate(clean_text, audio_file_wav)
                
                if success and audio_file_wav.exists():
                    logger.info(f"✓ Piper generated audio successfully (offline): lesson_{lesson_number}/audio.wav")
                    return audio_file_wav
                else:
                    logger.error(f"Piper failed to generate audio for lesson {lesson_number}")
                    return None
            
            except Exception as e:
                logger.error(f"Piper TTS generation failed: {e}")
                return None
        else:
            logger.error("No TTS engine available (Inworld failed, Piper not initialized)")
            return None
    
    def _clean_text_for_tts(self, text: str) -> str:
        """
        Clean text for TTS API by removing pacing markers and visual references.
        
        Removes:
        - Pacing markers (converted to natural pauses)
        - Figure/table references (not relevant for audio)
        - Metadata markers
        - Lesson headers
        
        Args:
            text: Raw lesson text with markers
        
        Returns:
            Clean text suitable for TTS
        """
        # Remove pacing markers (convert to natural pauses)
        clean = re.sub(r'\[PAUSE\]', '. ', text, flags=re.IGNORECASE)
        clean = re.sub(r'\[SHORT PAUSE\]', ', ', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\[EMPHASIS\]', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\[END OF LECTURE\]', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\[.*?\]', '', clean)  # Remove any remaining bracketed content
        
        # Remove figure references (not relevant for audio)
        clean = re.sub(r'\s*(?:see\s+)?\(?\s*[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*\)?\s*', ' ', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\s*(?:as\s+shown\s+in\s+)?[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*', ' ', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\s*(?:refer\s+to\s+)?[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*', ' ', clean, flags=re.IGNORECASE)
        
        # Remove table references
        clean = re.sub(r'\s*\(?\s*(?:see\s+)?[Tt]able\.?\s+\d+(?:\.\d+)?\s*\)?\s*', ' ', clean)
        clean = re.sub(r'\s*(?:as\s+shown\s+in\s+)?[Tt]able\.?\s+\d+(?:\.\d+)?\s*', ' ', clean)
        
        # Remove generic image/diagram references
        clean = re.sub(r'(?:as\s+shown\s+in\s+the\s+)(?:image|diagram|illustration|chart|graph)', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'(?:refer\s+to\s+the\s+)(?:image|diagram|illustration|chart|graph)', '', clean, flags=re.IGNORECASE)
        clean = re.sub(r'(?:see\s+the\s+)(?:image|diagram|illustration|chart|graph)\s+(?:above|below)', '', clean, flags=re.IGNORECASE)
        
        # Remove "Lesson N" header
        clean = re.sub(r'^Lesson \d+\s*\n+', '', clean)
        
        # Clean up extra whitespace and punctuation issues
        clean = re.sub(r'\s+', ' ', clean)
        clean = re.sub(r'\s+([.,;:!?])', r'\1', clean)
        clean = re.sub(r'\s+\.', '.', clean)
        clean = re.sub(r'\s+,', ',', clean)
        clean = re.sub(r'\n\s+\n', '\n\n', clean)
        
        return clean.strip()
    
    def speak_lesson(self, lesson_text: str, lesson_number: int):
        """
        Speak a complete lesson using cached lesson audio.
        
        Uses lesson-level caching: generates/loads a single audio file for the entire lesson.
        This is more efficient than sentence-by-sentence generation.
        
        Args:
            lesson_text: The lesson content to speak
            lesson_number: The lesson number
        """
        logger.info(f"🎓 Speaking Lesson {lesson_number}")
        
        try:
            # Generate or load complete lesson audio
            audio_file = self.generate_lesson_audio(lesson_text, lesson_number)
            
            if not audio_file:
                logger.error(f"Failed to get audio for lesson {lesson_number}")
                return
            
            # Play the complete lesson audio
            pygame.mixer.music.load(str(audio_file))
            pygame.mixer.music.play()
            
            # Wait for playback to finish
            while pygame.mixer.music.get_busy():
                pygame.time.Clock().tick(10)
            
            logger.info(f"✓ Completed speaking Lesson {lesson_number}")
            
        except Exception as e:
            logger.error(f"Failed to speak lesson: {e}")
    
    def speak_expressive_lecture(self, lesson_text: str, lesson_number: int):
        """
        Speak a lecture using cached lesson audio.
        
        Now uses lesson-level caching for efficiency.
        The Inworld API handles natural delivery, so we don't need
        to process pacing markers manually.
        
        Args:
            lesson_text: The lesson content to speak (with pacing markers)
            lesson_number: The lesson number
        """
        logger.info(f"🎓 Speaking expressive lecture: Lesson {lesson_number}")
        
        # Use the same lesson-level caching as speak_lesson
        self.speak_lesson(lesson_text, lesson_number)
    
    def speak_lesson_with_callback(
        self,
        lesson_text: str,
        lesson_number: int,
        on_sentence_start=None,
        on_sentence_end=None
    ):
        """
        Speak a complete lesson with callbacks for sentence highlighting.
        
        This method enables synchronized text highlighting by calling
        callbacks before and after speaking each sentence.
        
        Args:
            lesson_text: The lesson content to speak
            lesson_number: The lesson number
            on_sentence_start: Callback(sentence_index, sentence_text) called before speaking
            on_sentence_end: Callback(sentence_index, sentence_text) called after speaking
        """
        logger.info(f"🎓 Starting to speak Lesson {lesson_number} with callbacks")
        
        try:
            # Introduce the lesson
            intro = f"Lesson {lesson_number}."
            intro_audio = self._generate_audio(intro)
            
            if intro_audio:
                pygame.mixer.music.load(str(intro_audio))
                pygame.mixer.music.play()
                
                while pygame.mixer.music.get_busy():
                    pygame.time.Clock().tick(10)
            
            # Small pause after introduction
            pygame.time.wait(1000)
            
            # Split lesson into sentences
            sentences = self._split_into_sentences(lesson_text)
            
            logger.info(f"  🔊 Speaking {len(sentences)} sentences with highlighting...")
            
            # Speak each sentence with callbacks
            for i, sentence in enumerate(sentences):
                if sentence.strip():
                    # Call before-speak callback (for bold highlighting)
                    if on_sentence_start:
                        on_sentence_start(i, sentence)
                    
                    # Small pause before speaking
                    pygame.time.wait(300)
                    
                    # Generate and play audio
                    logger.debug(f"  Speaking sentence {i+1}/{len(sentences)}")
                    audio_file = self._generate_audio(sentence)
                    
                    if audio_file:
                        pygame.mixer.music.load(str(audio_file))
                        pygame.mixer.music.play()
                        
                        while pygame.mixer.music.get_busy():
                            pygame.time.Clock().tick(10)
                    
                    # Call after-speak callback (to remove bold)
                    if on_sentence_end:
                        on_sentence_end(i, sentence)
                    
                    # Small pause between sentences
                    pygame.time.wait(200)
            
            logger.info(f"✓ Completed speaking Lesson {lesson_number}")
            
        except Exception as e:
            logger.error(f"Failed to speak lesson with callbacks: {e}")
    
    def get_sentences(self, lesson_text: str) -> List[str]:
        """
        Get the list of sentences from lesson text.
        
        This is useful for pre-rendering text with proper sentence boundaries.
        Removes pacing markers, figure/table references, and metadata for clean display.
        
        Args:
            lesson_text: The lesson content
        
        Returns:
            List of sentences (cleaned of markers and references)
        """
        sentences = self._split_into_sentences(lesson_text)
        
        # Remove markers and references from each sentence for clean display
        clean_sentences = []
        for sentence in sentences:
            # Remove pacing markers
            clean = re.sub(r'\[PAUSE\]', '', sentence, flags=re.IGNORECASE)
            clean = re.sub(r'\[SHORT PAUSE\]', '', clean, flags=re.IGNORECASE)
            clean = re.sub(r'\[EMPHASIS\]', '', clean, flags=re.IGNORECASE)
            clean = re.sub(r'\[END OF LECTURE\]', '', clean, flags=re.IGNORECASE)
            clean = re.sub(r'\[.*?\]', '', clean)  # Remove any remaining bracketed content
            
            # Remove figure references
            clean = re.sub(r'\s*(?:see\s+)?\(?\s*[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*\)?\s*', ' ', clean, flags=re.IGNORECASE)
            clean = re.sub(r'\s*(?:as\s+shown\s+in\s+)?[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*', ' ', clean, flags=re.IGNORECASE)
            clean = re.sub(r'\s*(?:refer\s+to\s+)?[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*', ' ', clean, flags=re.IGNORECASE)
            
            # Remove table references
            clean = re.sub(r'\s*\(?\s*(?:see\s+)?[Tt]able\.?\s+\d+(?:\.\d+)?\s*\)?\s*', ' ', clean)
            clean = re.sub(r'\s*(?:as\s+shown\s+in\s+)?[Tt]able\.?\s+\d+(?:\.\d+)?\s*', ' ', clean)
            
            # Remove generic image/diagram references
            clean = re.sub(r'(?:as\s+shown\s+in\s+the\s+)(?:image|diagram|illustration|chart|graph)', '', clean, flags=re.IGNORECASE)
            clean = re.sub(r'(?:refer\s+to\s+the\s+)(?:image|diagram|illustration|chart|graph)', '', clean, flags=re.IGNORECASE)
            
            # Clean up extra whitespace and punctuation
            clean = re.sub(r'\s+', ' ', clean)
            clean = re.sub(r'\s+([.,;:!?])', r'\1', clean)
            clean = re.sub(r'\s+\.', '.', clean)
            clean = re.sub(r'\s+,', ',', clean)
            clean = clean.strip()
            
            if clean:  # Only add non-empty sentences
                clean_sentences.append(clean)
        
        return clean_sentences
    
    def set_rate(self, rate: int):
        """
        Adjust speech rate.
        
        Args:
            rate: Speech rate in words per minute (100-200 recommended)
        
        Note: Rate adjustment is not directly supported with Inworld API.
        This parameter is stored but has no effect on playback.
        """
        self.rate = rate
        logger.info(f"Speech rate set to {rate} WPM (note: rate control not supported by Inworld API)")
    
    def set_volume(self, volume: float):
        """
        Adjust volume.
        
        Args:
            volume: Volume level (0.0 to 1.0)
        """
        self.volume = max(0.0, min(1.0, volume))
        pygame.mixer.music.set_volume(self.volume)
        logger.info(f"Volume updated to {self.volume}")
    
    
    def get_cache_stats(self) -> dict:
        """
        Get statistics about the audio cache.
        
        Returns:
            Dictionary with cache statistics:
            - num_lessons: Number of cached lesson audio files
            - total_size_mb: Total size in megabytes
            - cache_dir: Path to cache directory
        """
        try:
            # Count lesson directories with audio files
            lesson_dirs = list(self.cache_dir.glob("lesson_*/"))
            audio_files = [d / "audio.mp3" for d in lesson_dirs if (d / "audio.mp3").exists()]
            
            total_size = sum(f.stat().st_size for f in audio_files)
            
            stats = {
                "num_lessons": len(audio_files),
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "cache_dir": str(self.cache_dir)
            }
            
            return stats
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {"num_lessons": 0, "total_size_mb": 0, "cache_dir": str(self.cache_dir)}
    
    def stop(self):
        """Stop current speech."""
        try:
            pygame.mixer.music.stop()
            logger.info("Speech stopped")
        except Exception as e:
            logger.error(f"Failed to stop speech: {e}")
    
    def cleanup(self):
        """Cleanup TTS engine resources.
        
        Note: Audio cache is preserved to avoid re-fetching from Inworld API.
        """
        try:
            pygame.mixer.music.stop()
            pygame.mixer.quit()
            
            # DO NOT delete audio cache - we want to keep it for future use
            # The cache saves API calls and preserves audio from free TTS period
            logger.info(f"TTS engine cleaned up (audio cache preserved at {self.cache_dir})")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")


def create_tts_engine(
    rate: int = 150,
    volume: float = 0.9,
    voice_gender: str = "female",
    pdf_hash: Optional[str] = None
) -> TTSEngine:
    """
    Factory function to create a TTS engine.
    
    Args:
        rate: Speech rate (words per minute)
        volume: Volume level (0.0 to 1.0)
        voice_gender: Preferred voice gender
        pdf_hash: Optional PDF hash to organize audio cache by document
    
    Returns:
        TTSEngine instance
    """
    return TTSEngine(rate=rate, volume=volume, voice_gender=voice_gender, pdf_hash=pdf_hash)
