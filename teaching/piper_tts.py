"""
Piper TTS - Offline Text-to-Speech Fallback

Provides offline TTS generation using Piper when Inworld API is unavailable.
Generates WAV files ONLY - no playback, no media player interaction.

CRITICAL:
- Generates WAV files silently
- NEVER opens media players
- NEVER plays audio
- Returns path to WAV file for pygame playback
"""

import logging
import subprocess
from pathlib import Path
from typing import Optional
import re

logger = logging.getLogger(__name__)


class PiperTTS:
    """
    Offline TTS engine using Piper.
    
    Generates WAV files without any playback.
    All audio playback is handled by the existing pygame-based system.
    """
    
    def __init__(
        self,
        piper_exe: str = r"D:\piper\piper.exe",
        model_path: str = r"D:\piper\voices\en_US-kusal-medium.onnx"
    ):
        """
        Initialize Piper TTS engine.
        
        Args:
            piper_exe: Path to piper.exe
            model_path: Path to voice model (.onnx file)
        """
        self.piper_exe = Path(piper_exe)
        self.model_path = Path(model_path)
        
        # Validate paths
        if not self.piper_exe.exists():
            logger.error(f"Piper executable not found: {self.piper_exe}")
            raise FileNotFoundError(f"Piper executable not found: {self.piper_exe}")
        
        if not self.model_path.exists():
            logger.error(f"Piper model not found: {self.model_path}")
            raise FileNotFoundError(f"Piper model not found: {self.model_path}")
        
        logger.info(f"✓ PiperTTS initialized: {self.model_path.name}")
    
    def generate(self, text: str, output_path: Path) -> bool:
        """
        Generate WAV audio file from text using Piper.
        
        CRITICAL: This method ONLY generates a WAV file.
        It does NOT play audio or open any media player.
        
        Args:
            text: Text to convert to speech
            output_path: Path where WAV file should be saved
        
        Returns:
            True if generation succeeded, False otherwise
        """
        if not text or not text.strip():
            logger.warning("Empty text provided to Piper TTS")
            return False
        
        try:
            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Clean text for TTS (remove any remaining markers)
            clean_text = self._clean_text(text)
            
            # Build Piper command
            # CRITICAL: --output_file ensures WAV is written to disk
            # No playback commands, no shell=True, no os.startfile
            cmd = [
                str(self.piper_exe),
                "--model", str(self.model_path),
                "--output_file", str(output_path),
                "--length_scale", "1.4",  # Slower, calmer speech
                "--noise_scale", "0.4",   # Clear voice
                "--noise_w", "0.7"        # Natural variation
            ]
            
            logger.debug(f"🎙️ Generating Piper audio: {output_path.name}")
            
            # Run Piper with text piped to stdin
            # subprocess.run waits for completion and exits cleanly
            result = subprocess.run(
                cmd,
                input=clean_text.encode('utf-8'),
                capture_output=True,
                timeout=60,  # 60 second timeout for long lessons
                check=False  # Don't raise on non-zero exit
            )
            
            # Check if WAV file was created
            if output_path.exists() and output_path.stat().st_size > 0:
                logger.info(f"✓ Piper generated audio successfully (offline): {output_path.name}")
                return True
            else:
                logger.error(f"Piper failed to generate audio file")
                if result.stderr:
                    logger.error(f"Piper stderr: {result.stderr.decode('utf-8', errors='ignore')}")
                return False
        
        except subprocess.TimeoutExpired:
            logger.error("Piper TTS generation timed out (60s)")
            return False
        except Exception as e:
            logger.error(f"Piper TTS generation failed: {e}")
            return False
    
    def _clean_text(self, text: str) -> str:
        """
        Clean text for Piper TTS.
        
        Removes any remaining markers or problematic characters.
        
        Args:
            text: Raw text
        
        Returns:
            Cleaned text
        """
        # Remove any remaining bracketed markers
        clean = re.sub(r'\[.*?\]', '', text)
        
        # Remove excessive whitespace
        clean = re.sub(r'\s+', ' ', clean)
        clean=clean.strip()
        
        return clean
