"""
Autonomous Teaching Engine

A FULLY AUTONOMOUS AI TEACHER that teaches entire textbooks end-to-end.

Features:
- Teaches chapter-by-chapter automatically
- NO user input required for topics
- Speaks like a real classroom teacher
- Human-like, conversational explanations
- Works completely offline with Ollama
- Uses textbook content ONLY

This is NOT a chatbot. This is an autonomous AI teacher.
"""

import logging
import time
import queue
from pathlib import Path
from typing import List, Dict, Optional, Generator
from enum import Enum

from teaching.rag_engine import generate_with_ollama, generate_with_ollama_streaming
from teaching.voice_state_manager import (
    VoiceInteractionStateManager,
    InteractionState,
    get_voice_state_manager,
    check_ram_available,
    attempt_free_memory,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Q&A MODE — STREAMING SYSTEM PROMPT
# ---------------------------------------------------------------------------
# This prompt is injected ONLY into _answer_question() and is never used by
# any lecture-generation path.  Keep it here so it is easy to tune without
# touching lecture logic.
#
# Design goals:
#   1. Short, sentence-bounded answers  →  TTS can start speaking after the
#      very first sentence without waiting for the full response.
#   2. Plain spoken English             →  No markdown, no bullet points,
#      no LaTeX — everything must be readable aloud naturally.
#   3. One idea per sentence            →  Allows fine-grained interruption
#      between sentences if the student has a follow-up.
# ---------------------------------------------------------------------------
STREAMING_QA_SYSTEM_PROMPT = (
    "You are a friendly, concise classroom teacher answering a student's spoken question. "
    "Rules you MUST follow:\n"
    "1. Answer in plain spoken English only — no markdown, no bullet points, no LaTeX.\n"
    "2. Limit your answer to a maximum of 3 short sentences.\n"
    "3. Every sentence must be self-contained and end with a full-stop, "
    "question mark, or exclamation mark.\n"
    "4. Do NOT start a new sentence if the answer is already complete.\n"
    "5. Be encouraging and factual. If you are unsure, say so in one sentence."
)


class TeachingState(Enum):
    """
    Teaching state for interruption control.
    
    TEACHING: Teacher is actively teaching
    INTERRUPTED: Teacher has been interrupted and is paused
    """
    TEACHING = "teaching"
    INTERRUPTED = "interrupted"


def get_time_based_greeting() -> str:
    """
    Get appropriate greeting based on current time of day.
    
    Returns:
        Greeting string: "Good morning", "Good afternoon", or "Good evening"
    """
    from datetime import datetime
    
    current_hour = datetime.now().hour
    
    if 5 <= current_hour < 12:
        return "Good morning"
    elif 12 <= current_hour < 17:
        return "Good afternoon"
    else:
        return "Good evening"


def chunk_sentence(sentence: str) -> List[str]:
    """
    Break a sentence into small, natural-sounding chunks for responsive interruption.
    
    PHASE 1 INTERRUPTION STRATEGY:
    - Instead of playing full sentences (which can't be interrupted mid-playback),
      we break sentences into 4-6 word chunks at natural pause points.
    - Each chunk is generated and played separately.
    - Interruption can occur BETWEEN chunks (after current chunk finishes).
    - This gives ~90% ChatGPT-like responsiveness without audio streaming.
    
    Chunking rules (priority order):
    1. Break at commas (natural pauses)
    2. Break at conjunctions (and, but, because, which, that, or, so, yet)
    3. Break at other punctuation (semicolons, colons, dashes)
    4. Break at word limit (4-6 words) as last resort
    
    Args:
        sentence: Full sentence text
        
    Returns:
        List of text chunks (each 4-6 words ideally)
        
    Example:
        "This is important, and we need to understand it carefully."
        → ["This is important,", "and we need to", "understand it carefully."]
    """
    import re
    
    if not sentence or not sentence.strip():
        return []
    
    sentence = sentence.strip()
    chunks = []
    
    # Conjunctions and natural break points
    BREAK_WORDS = {'and', 'but', 'because', 'which', 'that', 'or', 'so', 'yet', 
                   'when', 'where', 'while', 'if', 'although', 'though', 'since'}
    
    # Split by commas first (strongest natural pause)
    comma_parts = re.split(r'(,)', sentence)
    
    for i in range(0, len(comma_parts), 2):
        part = comma_parts[i]
        # Add comma back if it exists
        if i + 1 < len(comma_parts):
            part += comma_parts[i + 1]
        
        if not part.strip():
            continue
        
        # Now chunk this part by word count and conjunctions
        words = part.split()
        current_chunk = []
        
        for word in words:
            current_chunk.append(word)
            word_lower = word.lower().strip('.,;:!?')
            
            # Break if:
            # 1. We hit a conjunction AND have at least 3 words
            # 2. We have 6+ words (hard limit)
            should_break = False
            
            if len(current_chunk) >= 6:
                should_break = True
            elif len(current_chunk) >= 3 and word_lower in BREAK_WORDS:
                should_break = True
            
            if should_break:
                chunk_text = ' '.join(current_chunk).strip()
                if chunk_text:
                    chunks.append(chunk_text)
                current_chunk = []
        
        # Add remaining words as final chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk).strip()
            if chunk_text:
                chunks.append(chunk_text)
    
    # Fallback: if no chunks created, return original sentence
    if not chunks:
        chunks = [sentence]
    
    return chunks


class AutonomousTeacher:
    """
    Autonomous AI Teacher that teaches entire textbooks automatically.
    
    Behavior:
    - Analyzes curriculum
    - Teaches each chapter sequentially
    - Speaks like a real human teacher
    - No user input required
    - Works offline with Ollama
    """
    
    def __init__(
        self,
        vector_database,
        embedding_generator,
        curriculum: List[Dict[str, str]],
        pdf_hash: str,
        ollama_model: str = "mistral",
        output_dir: str = "./lectures/autonomous"
    ):
        """
        Initialize the Autonomous Teacher.
        
        Args:
            vector_database: VectorDatabase instance
            embedding_generator: EmbeddingGenerator instance
            curriculum: List of teaching units (chapters/sections)
            pdf_hash: SHA-256 hash of the PDF (for cache keying)
            ollama_model: Ollama model to use (default: mistral)
            output_dir: Directory to save lectures
        """
        self.vector_db = vector_database
        self.embedding_gen = embedding_generator
        self.curriculum = curriculum
        self.pdf_hash = pdf_hash
        self.ollama_model = ollama_model
        self.output_dir = Path(output_dir)
        
        # Create lecture cache directory
        self.cache_dir = Path("./data/lectures") / pdf_hash
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Create output directory (for backward compatibility)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Teaching state
        self.current_unit = 0
        self.teaching_complete = False
        
        # Interruption control (Phase 1)
        self.teaching_state = TeachingState.TEACHING
        self.interrupted_sentence_index = None  # Track which sentence was interrupted
        self.current_sentence_index = 0  # Track current sentence being spoken
        
        # TTS Engine (optional)
        self.tts_engine = None
        self.voice_enabled = False
        
        # Wake-word detector (Phase 1 - Porcupine)
        self.wake_word_detector = None
        self.wake_word_detection_enabled = False
        
        # Question capturer (Phase 2 - Whisper)
        self.question_capturer = None
        
        # Async event queue to emit events (like Q&A responses) to frontend 
        # while the main generator loop is paused
        self.event_queue = queue.Queue()
        
        # State machine synchronization flags
        self.qa_active = False
        self.qa_is_playing_audio = False
        
        # Voice interaction state manager (LISTENING / PROCESSING / SPEAKING)
        self.voice_state = get_voice_state_manager()
        
        logger.info(
            f"AutonomousTeacher initialized: {len(curriculum)} units, "
            f"model={ollama_model}, cache_dir={self.cache_dir}"
        )
    
    def enable_voice(self, rate: int = 150, volume: float = 0.9, voice_gender: str = "female"):
        """
        Enable text-to-speech voice output.
        
        Models are already loaded by ModelBootManager at app boot.
        This method only creates the TTS engine and grabs the
        pre-loaded QuestionCapturer singleton.
        
        Args:
            rate: Speech rate in words per minute (default: 150 for clarity)
            volume: Volume level 0.0-1.0 (default: 0.9)
            voice_gender: Preferred voice gender "female" or "male"
        """
        try:
            from teaching.tts_engine import create_tts_engine
            
            # Pass PDF hash to TTS engine for organized audio caching
            self.tts_engine = create_tts_engine(
                rate=rate,
                volume=volume,
                voice_gender=voice_gender,
                pdf_hash=self.pdf_hash  # Audio cache organized by PDF hash!
            )
            self.voice_enabled = True
            
            logger.info("🔊 Voice output enabled")
            
            # Grab the pre-loaded QuestionCapturer singleton.
            # Whisper + VAD are already loaded by ModelBootManager at boot.
            # No lazy loading needed — just pick up the reference.
            try:
                from teaching.question_capturer import get_question_capturer
                self.question_capturer = get_question_capturer()
                
                if self.question_capturer.whisper_model is not None:
                    logger.info("✓ Whisper model ready (pre-loaded at boot)")
                else:
                    logger.warning("⚠️ Whisper not loaded — loading now...")
                    self.question_capturer.load_model()
                    logger.info("✓ Whisper model loaded (fallback)")
            except Exception as e:
                logger.warning(f"Failed to get QuestionCapturer: {e}")
            
        except Exception as e:
            logger.error(f"Failed to enable voice: {e}")
            logger.warning("Teaching will continue without voice output")
            self.voice_enabled = False
    
    def disable_voice(self):
        """Disable text-to-speech voice output."""
        if self.tts_engine:
            self.tts_engine.cleanup()
            self.tts_engine = None
        
        self.voice_enabled = False
        logger.info("🔇 Voice output disabled")
    
    def enable_wake_word_detection(self):
        """
        Enable wake-word detection for student interruptions.
        
        Uses Porcupine to detect ONLY the wake phrase "hey teacher".
        When wake word is detected, teacher pauses immediately.
        """
        try:
            from teaching.wake_word_detector import WakeWordDetector
            
            # Create wake-word detector with callback
            self.wake_word_detector = WakeWordDetector(
                on_wake_word_detected=self._on_wake_word_detected
            )
            
            # Register wake-word detector with state manager
            self.voice_state.wake_word_detector = self.wake_word_detector
            self.voice_state.question_capturer = self.question_capturer
            
            # Start listening
            self.wake_word_detector.start_listening()
            self.wake_word_detection_enabled = True
            
            logger.info("🎤 Wake-word detection enabled (Porcupine CPU - 'hey teacher')")
            
        except Exception as e:
            logger.error(f"Failed to enable wake-word detection: {e}")
            logger.warning("Teaching will continue without wake-word detection")
            self.wake_word_detection_enabled = False
    
    def disable_wake_word_detection(self):
        """Disable wake-word detection."""
        if self.wake_word_detector:
            self.wake_word_detector.stop_listening()
            self.wake_word_detector = None
        
        self.wake_word_detection_enabled = False
        logger.info("🎤 Wake-word detection disabled")
    
    def _emit_qa_audio(self, text: str):
        """
        Replaces synchronous server-side Pygame playback with queueing an event
        for the frontend to play. Also blocks the backend thread for the duration
        of the audio so streaming doesn't blast past the current sentence.
        """
        if not self.voice_enabled or not self.tts_engine:
            return
            
        audio_url = None
        estimated_duration = 2.0
        
        if hasattr(self.tts_engine, 'generate_sentence_wav'):
            import uuid
            wav_filename = f"qa_{uuid.uuid4().hex[:10]}.wav"
            wav_dir = Path(__file__).parent.parent / "web" / "audio"
            wav_dir.mkdir(parents=True, exist_ok=True)
            wav_path = wav_dir / wav_filename
            
            success = self.tts_engine.generate_sentence_wav(text, wav_path)
            if success:
                audio_url = f"/audio/{wav_filename}"
                try:
                    file_size = wav_path.stat().st_size - 44
                    estimated_duration = max(0.5, file_size / 32000)
                except Exception:
                    estimated_duration = max(1.0, len(text.split()) * 0.4)
                
                logger.info(f"  🔊 QA WAV: {wav_filename} ({estimated_duration:.1f}s)")
                
                # Emit event to the frontend via queue
                self.event_queue.put({
                    'type': 'qa_audio',
                    'action': 'qa',
                    'text': text,
                    'sentence_text': text,
                    'audio_url': audio_url,
                    'audio_duration': round(estimated_duration, 2),
                    'unit_number': getattr(self, 'current_unit', getattr(self, 'current_unit_index', 0))
                })

    def _on_wake_word_detected(self):
        """
        Callback triggered when wake word is detected.
        
        INTERACTION STATE MACHINE FLOW (MULTI-QUESTION MODE):
        1. LISTENING → interrupt teacher, set qa_active = True
        2. Wait for question (up to 15s). If silent/continue, break loop.
        3. LISTENING → PROCESSING: pause audio subsystems, run Ollama
        4. PROCESSING → SPEAKING: QA is streaming, event_queue yields audio
        5. Wait until QA audio finishes playing in frontend
        6. SPEAKING → LISTENING: repeat from step 2 for follow-up questions
        7. On break: qa_active = False, resume teaching
        """
        if getattr(self, 'qa_active', False):
            logger.info("  ⚠️  Wake word detected but QA session is already active - ignoring")
            return
            
        self.qa_active = True
        logger.info("🎤 WAKE WORD DETECTED: hey teacher. Entering QA Session.")
        
        # Step 1: Pause teacher immediately (still in LISTENING state)
        self.interrupt()
        
        try:
            while self.qa_active:
                # Step 2: Mute audio output to prevent echo capture
                from teaching.audio_control import mute_output
                mute_output()
                
                # Step 3: Wait for echo drain (400ms)
                logger.info("  🔇 Audio muted - waiting for echo drain (400ms)...")
                time.sleep(0.4)
                
                # Step 4: Capture question (mic is still active for this)
                if not self.question_capturer:
                    from teaching.question_capturer import get_question_capturer
                    self.question_capturer = get_question_capturer()
                
                # We wait 15 seconds for a follow up question.
                question = self.question_capturer.capture_question(timeout=15)
                
                if not question:
                    logger.warning("  ⚠️  No question captured or 15s silence reached. Ending QA.")
                    break
                
                logger.info(f"  📝 Question: '{question}'")
                
                # Multi-question logic end check
                if question.lower().strip().strip('.!?') in ["continue", "go on", "resume", "that's all", "keep going", "thank you"]:
                    logger.info("  ▶️  Student requested to continue lesson")
                    break
                
                # Step 5: LISTENING → PROCESSING
                # Pauses mic, VAD, wake-word to free resources for Ollama
                self.voice_state.transition_to_processing()
                
                # Step 6: Answer question with Ollama (RAM guard inside)
                answer = self._answer_question(question)
                
                # Step 7: PROCESSING → SPEAKING
                self.voice_state.transition_to_speaking()
                
                time.sleep(0.5)
                
                # Wait for Q&A audio events to finish playing before listening for next question
                # This ensures we don't start listening while the TTS is speaking
                logger.info("  ⏳ Waiting for audio playback to finish...")
                while not self.event_queue.empty() or getattr(self, 'qa_is_playing_audio', False):
                    time.sleep(0.1)
                
                # Let audio completely echo-drain
                time.sleep(0.5)
                
                # Transition back to listening for follow-up questions
                self.voice_state.transition_to_listening()
                logger.info("  👂 QA Session open: Listening for follow-up questions... (Say 'continue' to resume teaching)")
                
        except Exception as e:
            logger.error(f"  ✗ Q&A failed: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            if self.voice_enabled and self.tts_engine:
                self._emit_qa_audio("Sorry, I had trouble with that.")
            self.voice_state.transition_to_listening()

        finally:
            self.qa_active = False

            # Wait for any final error fallback audio to finish playing
            while not self.event_queue.empty() or getattr(self, 'qa_is_playing_audio', False):
                time.sleep(0.1)

            # Step 8: Resume teaching
            logger.info("  ▶️  Ending QA Session. Resuming teaching...")
            if not self.voice_state.is_listening:
                self.voice_state.transition_to_listening()
            
            if self.voice_enabled and self.tts_engine:
                self._emit_qa_audio("Let me continue where I left off.")
                time.sleep(0.3)
                
            self.resume()
    
    def _answer_question(self, question: str) -> str:
        """
        Answer a student question using STREAMING Ollama generation.

        This method is the ONLY place where ``generate_with_ollama_streaming``
        and ``STREAMING_QA_SYSTEM_PROMPT`` are used.  Lecture generation is
        completely unaffected — it continues to call ``generate_with_ollama``
        (non-streaming) via ``_teach_unit`` as before.

        STREAMING PIPELINE:
        ┌─────────────────────────────────────────────────────────────────┐
        │  Ollama (stream=True)                                           │
        │    → yields raw tokens  (e.g. "Photo", "syn", "thesis", " is") │
        │    → buffered into ``sentence_buf``                             │
        │    → sentence boundary detected  (.  ?  !)                     │
        │    → complete sentence spoken via TTS immediately               │
        │    → loop continues until done=true                             │
        └─────────────────────────────────────────────────────────────────┘
        This gives sentence-level TTS latency: the first sentence begins
        playing while the LLM is still generating the second one.

        GENERATION SETTINGS (Q&A only):
            num_predict = 128   ← caps output at ~1-2 short sentences
            temperature = 0.4   ← low randomness for factual answers
            top_p       = 0.9   ← nucleus sampling for natural phrasing
            stream      = True  ← enables token-by-token delivery

        MEMORY MANAGEMENT:
        - Audio subsystems are already paused (PROCESSING state).
        - RAM guard checks available memory before inference.
        - num_ctx=2048 halves Ollama's default KV cache (~saves 400-800 MB).
        - Whisper stays loaded on GPU at all times.

        Args:
            question: Student's spoken question (transcribed by Whisper).

        Returns:
            Complete answer string (all sentences joined).  The return value
            is used for logging and as a fallback if TTS is disabled.
        """
        import re as _re

        # ------------------------------------------------------------------ #
        #  RAM GUARD — identical to previous implementation                  #
        # ------------------------------------------------------------------ #
        logger.info(f"  🤖 [QA-STREAM] Generating answer ({self.ollama_model}) for: '{question}'")

        if not check_ram_available(min_gb=1.0):
            logger.warning("  ⚠️  Low RAM — running garbage collection...")
            attempt_free_memory()
            if not check_ram_available(min_gb=0.5):
                logger.error("  ✗ Insufficient RAM — skipping inference")
                fallback = "I'm having trouble processing right now. Let me continue with the lesson."
                if self.voice_enabled and self.tts_engine:
                    self._emit_qa_audio(fallback)
                return fallback

        # ------------------------------------------------------------------ #
        #  BUILD PROMPT                                                       #
        #  System prompt is injected separately via the ``system`` field so  #
        #  the model receives it as a first-class instruction, not buried     #
        #  inside the user turn.                                              #
        # ------------------------------------------------------------------ #
        qa_prompt = f"Student question: {question.strip()}"

        # ------------------------------------------------------------------ #
        #  STREAMING GENERATION + SENTENCE-LEVEL TTS                         #
        # ------------------------------------------------------------------ #
        sentence_buf: str = ""
        spoken_sentences: list = []
        SENTENCE_END = _re.compile(r'(?<=[.?!])\s')

        try:
            token_stream = generate_with_ollama_streaming(
                prompt=qa_prompt,
                model=self.ollama_model,
                system=STREAMING_QA_SYSTEM_PROMPT,
                num_ctx=2048,
                num_predict=128,
                temperature=0.4,
                top_p=0.9,
            )

            for token in token_stream:
                sentence_buf += token

                # Check if the buffer now contains a complete sentence.
                # We look for a sentence-ending punctuation followed by
                # whitespace (or end-of-buffer with trailing punctuation).
                parts = SENTENCE_END.split(sentence_buf, maxsplit=1)

                if len(parts) == 2:
                    # ``parts[0]`` is a complete sentence, ``parts[1]`` is
                    # the beginning of the next sentence.
                    complete_sentence = parts[0].strip()
                    sentence_buf = parts[1]  # carry remainder forward

                    if complete_sentence:
                        logger.info(f"  💬 [QA-STREAM] Speaking: '{complete_sentence}'")
                        spoken_sentences.append(complete_sentence)

                        # Speak this sentence immediately — TTS runs while
                        # LLM is still streaming the next sentence.
                        if self.voice_enabled and self.tts_engine:
                            self._emit_qa_audio(complete_sentence)

            # Flush any remaining text in the buffer that did not have
            # trailing whitespace (e.g., last sentence ending the response).
            leftover = sentence_buf.strip()
            if leftover:
                logger.info(f"  💬 [QA-STREAM] Speaking (flush): '{leftover}'")
                spoken_sentences.append(leftover)
                if self.voice_enabled and self.tts_engine:
                    self._emit_qa_audio(leftover)

            full_answer = " ".join(spoken_sentences)
            logger.info(
                f"  ✓ [QA-STREAM] Answer complete — "
                f"{len(spoken_sentences)} sentence(s), {len(full_answer)} chars"
            )
            return full_answer

        except Exception as e:
            logger.error(f"[QA-STREAM] Streaming generation failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return "I'm not sure about that. Let me continue with the lesson."
    
    def teach_entire_curriculum(self) -> Generator[Dict[str, str], None, None]:
        """
        Teach the entire curriculum automatically.
        
        Yields:
            Dictionary with teaching progress:
            {
                'unit_number': int,
                'unit_title': str,
                'lecture': str,
                'progress': str (e.g., "3/10"),
                'is_complete': bool
            }
        """
        logger.info("==" * 60)
        logger.info("AUTONOMOUS TEACHING SESSION STARTED")
        if self.voice_enabled:
            logger.info("🔊 Voice output: ENABLED")
        logger.info("=" * 60)
        
        total_units = len(self.curriculum)
        
        # Background preparation using threading
        import threading
        
        next_lecture = None
        next_lecture_thread = None
        
        def prepare_lecture(unit, unit_num, total_units):
            """Background thread function to prepare next lecture"""
            nonlocal next_lecture
            logger.info(f"  🔄 Preparing Lesson {unit_num} in background...")
            next_lecture = self._teach_unit(unit, unit_num, total_units)
            logger.info(f"  ✓ Lesson {unit_num} prepared and ready")
        
        for i, unit in enumerate(self.curriculum, 1):
            logger.info(f"\n📚 Teaching Unit {i}/{total_units}: {unit['title']}")
            
            # If this is the first lesson, generate it now
            if i == 1:
                lecture = self._teach_unit(unit, i, total_units)
                self._save_lecture(unit, lecture, i)
                
                # Start preparing next lesson in background (if exists)
                if i < total_units:
                    next_unit = self.curriculum[i]  # i+1 in 0-indexed
                    next_lecture_thread = threading.Thread(
                        target=prepare_lecture,
                        args=(next_unit, i+1, total_units)
                    )
                    next_lecture_thread.start()
                    logger.info(f"  🔄 Started background preparation of Lesson {i+1}")
            else:
                # Wait for background preparation to complete
                if next_lecture_thread:
                    logger.info(f"  ⏳ Waiting for Lesson {i} preparation to complete...")
                    next_lecture_thread.join()
                    logger.info(f"  ✓ Lesson {i} ready!")
                
                # Use the pre-prepared lecture
                lecture = next_lecture
                self._save_lecture(unit, lecture, i)
                
                # Start preparing next lesson in background (if exists)
                if i < total_units:
                    next_unit = self.curriculum[i]  # i+1 in 0-indexed
                    next_lecture = None  # Reset
                    next_lecture_thread = threading.Thread(
                        target=prepare_lecture,
                        args=(next_unit, i+1, total_units)
                    )
                    next_lecture_thread.start()
                    logger.info(f"  🔄 Started background preparation of Lesson {i+1}")
            
            # Speak the lesson if voice is enabled (CS50-style expressive delivery)
            # While speaking, next lesson is being prepared in background!
            if self.voice_enabled and self.tts_engine:
                try:
                    logger.info(f"  🔊 Speaking lesson {i} with expressive delivery...")
                    logger.info(f"     (Lesson {i+1} preparing in background...)" if i < total_units else "")
                    self.tts_engine.speak_expressive_lecture(lecture, i)
                except Exception as e:
                    logger.error(f"  ✗ Voice output failed: {e}")
                    logger.info("  Continuing without voice...")
            
            # Yield progress
            yield {
                'unit_number': i,
                'unit_title': unit['title'],
                'lecture': lecture,  # Raw lecture with markers (for TTS)
                'lecture_display': self._clean_lecture_for_display(lecture),  # Clean lecture (for UI)
                'progress': f"{i}/{total_units}",
                'is_complete': i == total_units
            }
            
            # Small delay between units (optional, for pacing)
            if i < total_units:
                time.sleep(1)
        
        self.teaching_complete = True
        logger.info("\n" + "=" * 60)
        logger.info("✅ AUTONOMOUS TEACHING SESSION COMPLETE")
        logger.info("=" * 60)
    
    def _clean_lecture_for_display(self, lecture: str) -> str:
        """
        Remove pacing markers and unwanted references from lecture text for clean display.
        
        Removes:
        - Pacing markers: [PAUSE], [SHORT PAUSE], [EMPHASIS]
        - Metadata markers: [END OF LECTURE], [BREAK], etc.
        - Figure references: "Fig. 8.22", "Figure 3.5", "see Fig. 10.1"
        - Table references: "Table 5.3", "see Table 2.1"
        - Image references: "as shown in the image", "refer to the diagram"
        
        Args:
            lecture: Raw lecture text with markers and references
        
        Returns:
            Clean lecture text suitable for display
        """
        import re
        
        # Remove all bracketed markers (pacing and metadata)
        clean_text = re.sub(r'\[PAUSE\]', '', lecture, flags=re.IGNORECASE)
        clean_text = re.sub(r'\[SHORT PAUSE\]', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\[EMPHASIS\]', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\[END OF LECTURE\]', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\[BREAK\]', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\[.*?\]', '', clean_text)  # Remove any remaining bracketed content
        
        # Remove figure references
        # Patterns: "Fig. 8.22", "Figure 3.5", "see Fig. 10.1", "(Fig. 5.2)", "as shown in Fig. 2.3"
        clean_text = re.sub(r'\s*(?:see\s+)?\(?\s*[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*\)?\s*', ' ', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s*(?:as\s+shown\s+in\s+)?[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*', ' ', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s*(?:refer\s+to\s+)?[Ff]ig(?:ure)?\.?\s+\d+(?:\.\d+)?\s*', ' ', clean_text, flags=re.IGNORECASE)
        
        # Remove table references
        # Patterns: "Table 5.3", "see Table 2.1", "(Table 4.2)"
        clean_text = re.sub(r'\s*\(?\s*(?:see\s+)?[Tt]able\.?\s+\d+(?:\.\d+)?\s*\)?\s*', ' ', clean_text)
        clean_text = re.sub(r'\s*(?:as\s+shown\s+in\s+)?[Tt]able\.?\s+\d+(?:\.\d+)?\s*', ' ', clean_text)
        
        # Remove generic image/diagram references
        clean_text = re.sub(r'(?:as\s+shown\s+in\s+the\s+)(?:image|diagram|illustration|chart|graph)', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'(?:refer\s+to\s+the\s+)(?:image|diagram|illustration|chart|graph)', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'(?:see\s+the\s+)(?:image|diagram|illustration|chart|graph)\s+(?:above|below)', '', clean_text, flags=re.IGNORECASE)
        
        # Clean up extra whitespace and punctuation issues that may result from removal
        clean_text = re.sub(r'\s+', ' ', clean_text)  # Multiple spaces to single
        clean_text = re.sub(r'\s+([.,;:!?])', r'\1', clean_text)  # Remove space before punctuation
        clean_text = re.sub(r'([.,;:!?])\s*([.,;:!?])', r'\1', clean_text)  # Remove duplicate punctuation
        clean_text = re.sub(r'\n\s+\n', '\n\n', clean_text)  # Clean paragraph breaks
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)  # Max 2 newlines
        
        # Fix sentences that may have become awkward after removal
        # Example: "This is important  ." → "This is important."
        clean_text = re.sub(r'\s+\.', '.', clean_text)
        clean_text = re.sub(r'\s+,', ',', clean_text)
        
        return clean_text.strip()
    
    def teach_entire_curriculum_with_highlighting(self) -> Generator[Dict[str, any], None, None]:
        """
        Teach the entire curriculum with sentence-level highlighting support.
        
        OPTIMIZED: Generates NEXT lesson in background while speaking CURRENT lesson.
        This eliminates lag between lessons.
        
        This method yields progress updates for each sentence, enabling
        synchronized bold highlighting in the UI.
        
        Yields:
            Dictionary with teaching progress:
            {
                'type': 'lesson_start' | 'sentence_start' | 'sentence_end' | 'lesson_end',
                'unit_number': int,
                'unit_title': str,
                'lecture': str (full lecture text),
                'sentences': List[str] (all sentences),
                'sentence_index': int (current sentence index),
                'sentence_text': str (current sentence),
                'progress': str (e.g., "3/10"),
                'is_complete': bool
            }
        """
        import threading
        
        logger.info("=" * 60)
        logger.info("AUTONOMOUS TEACHING SESSION STARTED (WITH HIGHLIGHTING)")
        if self.voice_enabled:
            logger.info("🔊 Voice output: ENABLED")
        logger.info("=" * 60)
        
        # PHASE 2: Start persistent Piper process for entire session
        # ONNX model loads ONLY ONCE here, not per chunk
        if self.voice_enabled and self.tts_engine:
            try:
                self.tts_engine.start_persistent_piper()
            except Exception as e:
                logger.warning(f"Failed to start persistent Piper: {e}")
                logger.info("Will fall back to one-shot mode per chunk")
        
        # PHASE 1: Start wake-word detector for student interruptions
        if self.voice_enabled:
            try:
                self.enable_wake_word_detection()
            except Exception as e:
                logger.warning(f"Failed to start wake-word detector: {e}")
                logger.info("Teaching will continue without wake-word detection")
        
        total_units = len(self.curriculum)
        
        # Background generation state
        next_lecture = None
        next_lecture_ready = threading.Event()
        generation_error = None
        
        def generate_next_lesson(unit, unit_num, total_units):
            """Background thread function to generate next lesson"""
            nonlocal next_lecture, generation_error
            try:
                logger.info(f"🧵 Background: Generating lesson {unit_num}")
                next_lecture = self._teach_unit(unit, unit_num, total_units)
                logger.info(f"✓ Background: Lesson {unit_num} cached")
                next_lecture_ready.set()
            except Exception as e:
                logger.error(f"✗ Background generation failed for lesson {unit_num}: {e}")
                generation_error = e
                next_lecture_ready.set()
        
        for i, unit in enumerate(self.curriculum, 1):
            logger.info(f"\n📚 Teaching Unit {i}/{total_units}: {unit['title']}")
            
            # STEP 1: Get current lesson
            if i == 1:
                # First lesson - generate synchronously
                lecture = self._teach_unit(unit, i, total_units)
            else:
                # Wait for background generation to complete
                logger.info(f"📚 Loading cached lesson {i}")
                next_lecture_ready.wait()
                
                if generation_error:
                    logger.error(f"Using fallback for lesson {i} due to background error")
                    lecture = self._teach_unit(unit, i, total_units)
                    generation_error = None
                else:
                    lecture = next_lecture
                
                # Reset for next iteration
                next_lecture = None
                next_lecture_ready.clear()
            
            # Save lecture
            self._save_lecture(unit, lecture, i)
            
            # STEP 2: Start background generation of NEXT lesson (if exists)
            if i < total_units:
                next_unit = self.curriculum[i]  # i+1 in 0-indexed
                
                # Check if next lesson is already cached
                cache_file = self.cache_dir / f"lesson_{i+1}.txt"
                if not cache_file.exists():
                    # Start background thread to generate next lesson
                    bg_thread = threading.Thread(
                        target=generate_next_lesson,
                        args=(next_unit, i+1, total_units),
                        daemon=True
                    )
                    bg_thread.start()
                else:
                    # Next lesson already cached - load it in background
                    def load_cached():
                        nonlocal next_lecture
                        try:
                            next_lecture = cache_file.read_text(encoding='utf-8')
                            logger.info(f"📚 Loading cached lesson {i+1}")
                            next_lecture_ready.set()
                        except Exception as e:
                            logger.error(f"Failed to load cache: {e}")
                            generation_error = e
                            next_lecture_ready.set()
                    
                    bg_thread = threading.Thread(target=load_cached, daemon=True)
                    bg_thread.start()
            
            # Get sentences for highlighting
            # IMPORTANT: Always extract sentences, even if voice is disabled
            # The frontend needs this for proper display
            sentences = []
            if self.tts_engine:
                sentences = self.tts_engine.get_sentences(lecture)
            else:
                # Fallback: Simple sentence splitting when TTS is disabled
                import re
                clean_text = self._clean_lecture_for_display(lecture)
                # Split on sentence boundaries
                sentences = re.split(r'(?<=[.!?])\s+', clean_text)
                sentences = [s.strip() for s in sentences if s.strip()]
            
            # Yield lesson start
            yield {
                'type': 'lesson_start',
                'unit_number': i,
                'unit_title': unit['title'],
                'lecture': lecture,  # Raw lecture with markers (for TTS)
                'lecture_display': self._clean_lecture_for_display(lecture),  # Clean lecture (for UI)
                'sentences': sentences,
                'progress': f"{i}/{total_units}",
                'is_complete': False
            }
            
            # STEP 3: Speak the lesson (while next lesson generates in background!)
            if self.voice_enabled and self.tts_engine:
                try:
                    if i < total_units:
                        logger.info(f"🔊 Speaking lesson {i} (background generation running)")
                    else:
                        logger.info(f"🔊 Speaking lesson {i} with highlighting...")
                    
                    # Define callbacks for sentence highlighting
                    def on_sentence_start(sentence_index, sentence_text):
                        # This will be called in the TTS thread, but we can't yield here
                        # Instead, we'll handle highlighting differently
                        pass
                    
                    def on_sentence_end(sentence_index, sentence_text):
                        pass
                    
                    # For now, we'll use the simpler approach of yielding before speaking
                    # The UI will handle highlighting based on timing
                    import time
                    
                    # Introduce the lesson
                    time.sleep(1.0)
                    
                    # Speak each sentence and yield progress
                    # PHASE 1 INTERRUPTION: Chunk-based playback for responsive stopping
                    # PHASE 1 RESUME: Restart interrupted sentence from beginning
                    idx = 0
                    while idx < len(sentences):
                        sentence = sentences[idx]
                        if sentence.strip():
                            # Update current sentence index (for interruption tracking)
                            self.current_sentence_index = idx
                            
                            # Check if we're interrupted BEFORE starting sentence
                            # PHASE 1 RESUME: Wait during interruption, then restart this sentence
                            if self.teaching_state == TeachingState.INTERRUPTED or getattr(self, 'qa_active', False):
                                logger.info(f"  ⏸️  Paused at sentence {idx}")
                                # Emit pause event
                                yield {
                                    'type': 'paused',
                                    'message': 'Teaching paused',
                                    'paused_at_sentence': idx,
                                    'unit_number': i
                                }
                                
                                # Wait until resumed (teaching_state changes back to TEACHING)
                                while self.teaching_state == TeachingState.INTERRUPTED or getattr(self, 'qa_active', False):
                                    try:
                                        event = self.event_queue.get_nowait()
                                        self.qa_is_playing_audio = True
                                        yield event
                                        if isinstance(event, dict) and event.get('audio_duration'):
                                            wait_until = time.time() + event['audio_duration']
                                            while time.time() < wait_until:
                                                time.sleep(0.1)
                                        self.qa_is_playing_audio = False
                                    except queue.Empty:
                                        pass
                                    time.sleep(0.1)  # Check every 100ms
                                
                                # Resumed! Log and continue from this sentence
                                logger.info(f"  ▶️  Resumed at sentence {idx}")
                                yield {
                                    'type': 'resumed',
                                    'message': 'Teaching resumed',
                                    'resumed_at_sentence': idx,
                                    'unit_number': i
                                }
                                # Continue to speak this sentence from the beginning
                            
                            # Yield sentence start (for bold highlighting)
                            # ── FRONTEND AUDIO PLAYBACK ──
                            # Generate one WAV per sentence, save to web/audio/,
                            # include audio_url so the browser fetches + plays it.
                            audio_url = None
                            estimated_duration = 2.0  # fallback seconds
                            
                            if self.tts_engine and hasattr(self.tts_engine, 'generate_sentence_wav'):
                                import uuid
                                wav_filename = f"sentence_{uuid.uuid4().hex[:10]}.wav"
                                wav_dir = Path(__file__).parent.parent / "web" / "audio"
                                wav_dir.mkdir(parents=True, exist_ok=True)
                                wav_path = wav_dir / wav_filename
                                
                                success = self.tts_engine.generate_sentence_wav(sentence, wav_path)
                                if success:
                                    audio_url = f"/audio/{wav_filename}"
                                    # Estimate duration from file size
                                    # Piper 16kHz mono 16-bit = 32000 bytes/sec
                                    try:
                                        file_size = wav_path.stat().st_size - 44  # minus WAV header
                                        estimated_duration = max(0.5, file_size / 32000)
                                    except Exception:
                                        # Fallback: ~150 WPM = 0.4s per word
                                        word_count = len(sentence.split())
                                        estimated_duration = max(1.0, word_count * 0.4)
                                    logger.debug(f"  🔊 Sentence WAV: {wav_filename} ({estimated_duration:.1f}s)")
                                else:
                                    logger.warning(f"  ⚠️ Failed to generate WAV for sentence {idx+1}")
                            
                            yield {
                                'type': 'sentence_start',
                                'unit_number': i,
                                'unit_title': unit['title'],
                                'lecture': lecture,
                                'sentences': sentences,
                                'sentence_index': idx,
                                'sentence_text': sentence,
                                'audio_url': audio_url,
                                'audio_duration': round(estimated_duration, 2),
                                'progress': f"{i}/{total_units}",
                                'is_complete': False
                            }
                            
                            # ── Wait for frontend playback ──
                            # Instead of pygame polling, we wait the estimated duration.
                            # The frontend plays audio via Web Audio API.
                            # Check for interruption during the wait.
                            if audio_url:
                                wait_end = time.time() + estimated_duration
                                while time.time() < wait_end:
                                    if self.teaching_state == TeachingState.INTERRUPTED or getattr(self, 'qa_active', False):
                                        logger.info(f"  🛑 Interrupted during sentence {idx+1}")
                                        break
                                    try:
                                        event = self.event_queue.get_nowait()
                                        self.qa_is_playing_audio = True
                                        yield event
                                        if isinstance(event, dict) and event.get('audio_duration'):
                                            wait_until = time.time() + event['audio_duration']
                                            while time.time() < wait_until:
                                                time.sleep(0.1)
                                        self.qa_is_playing_audio = False
                                    except queue.Empty:
                                        pass
                                    time.sleep(0.1)  # 100ms polling
                            else:
                                # No audio — just pause briefly for text display
                                time.sleep(0.5)
                            
                            # Handle interruption after sentence playback
                            if self.teaching_state == TeachingState.INTERRUPTED or getattr(self, 'qa_active', False):
                                logger.info(f"  ⏸️  Paused at sentence {idx+1}")
                                yield {
                                    'type': 'paused',
                                    'message': 'Teaching paused mid-sentence',
                                    'paused_at_sentence': idx,
                                    'unit_number': i
                                }
                                
                                # Wait until resumed
                                while self.teaching_state == TeachingState.INTERRUPTED or getattr(self, 'qa_active', False):
                                    try:
                                        event = self.event_queue.get_nowait()
                                        self.qa_is_playing_audio = True
                                        yield event
                                        if isinstance(event, dict) and event.get('audio_duration'):
                                            wait_until = time.time() + event['audio_duration']
                                            while time.time() < wait_until:
                                                time.sleep(0.1)
                                        self.qa_is_playing_audio = False
                                    except queue.Empty:
                                        pass
                                    time.sleep(0.1)
                               
                                # Resumed! Restart this sentence from the beginning
                                logger.info(f"  ▶️  Resumed - restarting sentence {idx+1} from beginning")
                                yield {
                                    'type': 'resumed',
                                    'message': 'Teaching resumed - restarting sentence',
                                    'resumed_at_sentence': idx,
                                    'unit_number': i
                                }
                                continue  # Restart this sentence
                            
                            # Yield sentence end (to remove bold)
                            yield {
                                'type': 'sentence_end',
                                'unit_number': i,
                                'unit_title': unit['title'],
                                'lecture': lecture,
                                'sentences': sentences,
                                'sentence_index': idx,
                                'sentence_text': sentence,
                                'progress': f"{i}/{total_units}",
                                'is_complete': False
                            }
                            
                            # Small pause between sentences
                            time.sleep(0.2)
                        
                        # Move to next sentence
                        idx += 1
                    
                except Exception as e:
                    logger.error(f"  ✗ Voice output failed: {e}")
                    logger.info("  Continuing without voice...")
            
            # Yield lesson end
            yield {
                'type': 'lesson_end',
                'unit_number': i,
                'unit_title': unit['title'],
                'lecture': lecture,
                'sentences': sentences,
                'progress': f"{i}/{total_units}",
                'is_complete': i == total_units
            }
            
            # Small delay between units
            if i < total_units:
                time.sleep(1)
        
        
        self.teaching_complete = True
        
        # PHASE 2: Stop persistent Piper process (clean shutdown)
        # CRITICAL: Only stop Piper if teaching completed normally
        # Do NOT stop Piper if we're in INTERRUPTED state (soft pause)
        if self.voice_enabled and self.tts_engine:
            if self.teaching_state == TeachingState.TEACHING:
                # Normal completion - stop Piper
                try:
                    self.tts_engine.stop_persistent_piper()
                    logger.info("  ✓ Piper stopped (normal completion)")
                except Exception as e:
                    logger.warning(f"Error stopping persistent Piper: {e}")
            else:
                # Interrupted/paused - keep Piper alive
                logger.info("  ✓ Piper preserved (teaching interrupted/paused)")
        
        # PHASE 1: Stop wake-word detector
        if self.wake_word_detection_enabled:
            try:
                self.disable_wake_word_detection()
            except Exception as e:
                logger.warning(f"Error stopping wake-word detector: {e}")
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ AUTONOMOUS TEACHING SESSION COMPLETE")
        logger.info("=" * 60)
    
    def _teach_unit(self, unit: Dict[str, str], unit_num: int, total_units: int) -> str:
        """
        Teach a single curriculum unit.
        
        IMPLEMENTS LECTURE CACHING:
        - Checks cache before generating
        - Loads cached lecture if available
        - Generates and caches new lectures
        
        Args:
            unit: Curriculum unit dict
            unit_num: Current unit number
            total_units: Total number of units
        
        Returns:
            Generated or cached lecture text
        """
        unit_title = unit['title']
        
        # Check cache first
        cache_file = self.cache_dir / f"lesson_{unit_num}.txt"
        
        if cache_file.exists():
            logger.info(f"  📦 Loading cached lecture: {cache_file.name}")
            try:
                cached_lecture = cache_file.read_text(encoding='utf-8')
                logger.info(f"  ✓ Cached lecture loaded ({len(cached_lecture)} chars)")
                return cached_lecture
            except Exception as e:
                logger.warning(f"  ⚠️ Failed to load cache: {e}. Regenerating...")
        
        # Cache miss - generate new lecture
        try:
            # Step 1: Retrieve relevant content
            logger.info(f"  📖 Retrieving content for: {unit_title}")
            context = self._retrieve_context(unit_title)
            
            if not context:
                logger.warning(f"  ⚠️ No content found for: {unit_title}")
                lecture = self._generate_no_content_message(unit_title, unit_num, total_units)
            else:
                # Step 2: Generate human-like lecture
                logger.info(f"  🎓 Generating lecture...")
                lecture = self._generate_teacher_lecture(unit_title, context, unit_num, total_units)
                logger.info(f"  ✓ Lecture generated ({len(lecture)} chars)")
            
            # Step 3: Save to cache
            try:
                cache_file.write_text(lecture, encoding='utf-8')
                logger.info(f"  💾 Cached lecture: {cache_file.name}")
            except Exception as e:
                logger.warning(f"  ⚠️ Failed to cache lecture: {e}")
            
            return lecture
            
        except Exception as e:
            logger.error(f"  ✗ Error teaching unit: {e}")
            return f"Error teaching {unit_title}: {str(e)}"

    
    def _retrieve_context(self, topic: str, top_k: int = 3) -> str:
        """
        Retrieve relevant textbook content for a topic.
        
        OPTIMIZED FOR OLLAMA:
        - Reduced top_k to 3 (from 8) to limit context size
        - Truncates each chunk to ~450 characters
        - Prevents timeout issues with large content
        
        Args:
            topic: Topic to retrieve content for
            top_k: Number of chunks to retrieve (default: 3, reduced from 8)
        
        Returns:
            Combined context text (truncated for optimal Ollama performance)
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_gen.generate_embedding(topic)
            
            if not query_embedding:
                return ""
            
            # Search vector database (reduced top_k for smaller context)
            results = self.vector_db.similarity_search(query_embedding, top_k=top_k)
            
            if not results:
                return ""
            
            # Combine chunks with truncation to prevent timeout
            chunks = []
            for text, _, _ in results:
                # Truncate each chunk to ~450 characters to keep context manageable
                truncated = text[:450] if len(text) > 450 else text
                chunks.append(truncated)
            
            combined_context = "\n\n---\n\n".join(chunks)
            
            logger.info(f"  Retrieved {len(chunks)} chunks, total context: {len(combined_context)} chars")
            
            return combined_context
            
        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            return ""
    
    def _generate_teacher_lecture(
        self,
        topic: str,
        context: str,
        unit_num: int,
        total_units: int
    ) -> str:
        """
        Generate a classroom-length spoken lecture script using Ollama.
        
        TARGET: 5-8 minute lecture (600-900 words)
        FORMAT: Spoken lecture script with pacing markers
        
        This is the CORE of autonomous teaching.
        The prompt ensures natural, expressive, classroom-length lectures.
        
        CLEAN OUTPUT FORMAT:
        - Lesson numbering controlled by code, NOT LLM
        - LLM outputs ONLY teaching content
        - No verbose separators
        
        INCLUDES GRACEFUL ERROR HANDLING:
        - If Ollama times out, returns a friendly teacher message
        - Teaching continues with next topic instead of crashing
        
        Args:
            topic: Topic/chapter title
            context: Retrieved textbook content
            unit_num: Current unit number
            total_units: Total units in curriculum
        
        Returns:
            Generated lecture text (or friendly error message if timeout)
        """
        # CLASSROOM-LENGTH SPOKEN LECTURE SCRIPT PROMPT
        # Get time-appropriate greeting
        greeting = get_time_based_greeting()
        
        prompt = f"""You are a passionate classroom teacher delivering a full lecture session.
Create a SPOKEN LECTURE SCRIPT for a 5-8 minute classroom lecture.

TOPIC: {topic}

TEXTBOOK CONTENT:
{context}

CRITICAL LENGTH REQUIREMENT:
- Target: 600-900 words (5-8 minutes of speaking)
- This is a FULL classroom lecture, NOT a summary
- Do NOT make it too short (avoid bullet points)
- Do NOT make it excessively long (stay focused)

SPOKEN LECTURE SCRIPT FORMAT:
Write as a SPOKEN script with natural breaks and pacing markers:

Use these markers:
[PAUSE] - Natural pause for thinking (2-3 seconds)
[SHORT PAUSE] - Brief pause between ideas (1 second)
[EMPHASIS] - Emphasize this phrase

Example format:
"{greeting}, class! [SHORT PAUSE]

Today, we're going to explore something fascinating. [PAUSE]

Now, here's the key question: why does this matter? [PAUSE]

Let me explain. [SHORT PAUSE] First, notice that..."

TEACHING STYLE (CS50-INSPIRED):
1. Be EXPRESSIVE and PASSIONATE
2. Use rhetorical questions (no answers required):
   - "Now, why does this matter?"
   - "What's really happening here?"
   - "You might be wondering..."
3. Explain WHY concepts matter, not just WHAT they are
4. Anticipate confusion briefly, then clarify
5. Use conversational language: "we", "let's", "notice that"
6. Build excitement and curiosity
7. Make real-world connections

LECTURE STRUCTURE (ESSENTIAL):
1. OPENING (100-150 words):
   - Grab attention with a question or interesting fact
   - Preview what we'll learn today
   - Build curiosity

2. MAIN EXPLANATION (350-550 words):
   - Break into 3-4 key ideas
   - Explain each step-by-step
   - Use [PAUSE] after important points
   - Use [SHORT PAUSE] between ideas
   - Use [EMPHASIS] for key terms
   - Include rhetorical questions
   - Anticipate and address confusion

3. CONCLUSION (150-200 words):
   - Recap the key insights
   - Explain why this matters
   - Connect to bigger picture
   - End with forward-looking statement

PERFORMANCE RULES (CRITICAL):
- Focus on ESSENTIAL concepts only
- Do NOT try to explain every detail
- Prefer clarity over completeness
- Avoid rambling or repetition
- Stay within 600-900 words

CRITICAL RULES:
- DO NOT ask students to respond or answer
- DO NOT wait for input
- Teaching must be CONTINUOUS and AUTONOMOUS
- Use ONLY the textbook content above
- Target: 600-900 words (count carefully!)
- DO NOT include headers, lesson numbers, or separators
- Output ONLY the spoken lecture script
- Include pacing markers: [PAUSE], [SHORT PAUSE], [EMPHASIS]

Now, deliver this classroom-length lecture script:"""

        try:
            # Generate with Ollama
            lecture_content = generate_with_ollama(prompt, model=self.ollama_model)
            
            # Add clean header (controlled by code, not LLM)
            header = f"Lesson {unit_num}\n\n"
            
            return header + lecture_content.strip()
            
        except Exception as e:
            # Graceful error handling - return friendly teacher message
            logger.warning(f"Lecture generation failed for '{topic}': {e}")
            logger.info("  Generating friendly error message and continuing...")
            
            return self._generate_timeout_message(topic, unit_num, total_units)

    
    def _generate_timeout_message(self, topic: str, unit_num: int, total_units: int) -> str:
        """
        Generate a friendly teacher-style message when Ollama times out.
        
        This allows teaching to continue gracefully instead of crashing.
        """
        return f"""Lesson {unit_num}

Hello students! I apologize, but I'm having some difficulty preparing 
this particular lesson on "{topic}" right now. The content might be 
quite detailed, and I need a bit more time to organize it properly.

Rather than keep you waiting, let's move forward to the next topic, 
and we can come back to this one later if needed.

Don't worry - this sometimes happens when we're dealing with very 
complex or lengthy material. The important thing is that we keep 
learning and making progress together!

Let's continue with our next lesson.

---
Note: This topic may require breaking down into smaller sub-topics 
for better teaching. You can try requesting this topic specifically 
in the topic-based tutor mode (python app.py) for a more focused 
explanation."""

    
    def _generate_no_content_message(self, topic: str, unit_num: int, total_units: int) -> str:
        """Generate a message when no content is found for a topic."""
        return f"""Lesson {unit_num}

I apologize, but I could not find sufficient content in the textbook 
about "{topic}" to teach this lesson properly.

This might mean:
- The topic is not covered in detail in this textbook
- The topic might be referenced elsewhere with different terminology

Let's move on to the next lesson."""

    
    def _save_lecture(self, unit: Dict[str, str], lecture: str, unit_num: int):
        """
        Save lecture to file.
        
        Args:
            unit: Curriculum unit
            lecture: Generated lecture text
            unit_num: Unit number
        """
        try:
            # Create safe filename
            safe_title = "".join(c if c.isalnum() else "_" for c in unit['title'])
            filename = f"{unit_num:02d}_{safe_title}.txt"
            filepath = self.output_dir / filename
            
            # Save lecture
            filepath.write_text(lecture, encoding='utf-8')
            
        except Exception as e:
            logger.error(f"Failed to save lecture: {e}")
    
    def interrupt(self):
        """
        Interrupt the teacher immediately (SOFT PAUSE).
        
        PHASE 1 BEHAVIOR - SOFT PAUSE:
        This method implements a SOFT interruption that:
        1. Stops audio playback immediately
        2. Breaks out of chunk-generation loop
        3. Preserves current sentence index for resume
        4. KEEPS Piper process alive (no process termination)
        
        This is designed for student interruptions where:
        - Teaching will resume shortly
        - Piper process should stay warm
        - ONNX model should NOT be reloaded
        
        CRITICAL CHANGE FROM PREVIOUS VERSION:
        - OLD: Called stop_persistent_piper() → killed Piper process
        - NEW: Calls pause_speaking() → keeps Piper alive
        
        Can be called at ANY moment during teaching.
        
        MULTI-LEVEL AUDIO STOP:
        - Calls tts_engine.pause_speaking() (soft pause, Piper alive)
        - ALSO directly calls pygame.mixer.music.stop() as failsafe
        - Sets state to INTERRUPTED (teaching loop will detect and break)
        
        This ensures audio stops within 10ms regardless of where interrupt() is called from.
        """
        if self.teaching_state == TeachingState.INTERRUPTED:
            logger.warning("Teacher is already interrupted")
            return
        
        logger.info("🛑 INTERRUPTING TEACHER (SOFT PAUSE)")
        
        # CRITICAL: Use SOFT PAUSE instead of hard stop
        # This keeps Piper process alive for quick resume
        
        # Level 1: Soft pause via TTS engine (keeps Piper alive)
        if self.voice_enabled and self.tts_engine:
            self.tts_engine.pause_speaking()
            logger.info("  ✓ Audio paused (Piper still alive)")
        
        # Level 2: FAILSAFE - Directly stop pygame mixer (in case TTS engine has delay)
        # This ensures audio stops IMMEDIATELY even if called from outside teaching loop
        try:
            import pygame
            if pygame.mixer.get_init():  # Check if mixer is initialized
                pygame.mixer.music.stop()
                logger.info("  ✓ Pygame audio stopped (failsafe)")
        except Exception as e:
            logger.debug(f"  Pygame failsafe stop failed (may not be initialized): {e}")
        
        # Save current sentence index for resume
        self.interrupted_sentence_index = self.current_sentence_index
        logger.info(f"  ✓ Saved sentence index: {self.interrupted_sentence_index}")
        
        # REMOVED: stop_persistent_piper() call
        # Piper process stays alive for entire teaching session
        # Only stop Piper on explicit "Stop Teaching" or session end
        
        # Update state (teaching loop will detect this and break out of playback)
        self.teaching_state = TeachingState.INTERRUPTED
        logger.info("  ✓ State: INTERRUPTED (Piper process preserved)")
    
    
    def resume(self):
        """
        Resume teaching from the interrupted sentence.
        
        This method:
        1. Says "Let me repeat that."
        2. Resets to the interrupted sentence index
        3. Sets state back to TEACHING
        
        The teaching loop will automatically continue from the interrupted sentence.
        """
        if self.teaching_state != TeachingState.INTERRUPTED:
            logger.warning("Teacher is not interrupted, nothing to resume")
            return
        
        logger.info("▶️  RESUMING TEACHING")
        
        # Speak transition message
        if self.voice_enabled and self.tts_engine:
            try:
                logger.info("  🔊 Speaking: 'Let me repeat that.'")
                self._emit_qa_audio("Let me repeat that.")
                time.sleep(0.5)  # Brief pause before resuming
            except Exception as e:
                logger.error(f"  ✗ Failed to speak resume message: {e}")
        
        # Reset to interrupted sentence (will be re-spoken)
        # Note: The teaching loop must handle this by checking interrupted_sentence_index
        logger.info(f"  ✓ Resuming from sentence index: {self.interrupted_sentence_index}")
        
        # Update state
        self.teaching_state = TeachingState.TEACHING
        logger.info("  ✓ State: TEACHING")
        
        # Reset wake-word detector debounce to allow next detection
        if self.wake_word_detection_enabled and self.wake_word_detector:
            self.wake_word_detector.reset_debounce()
            logger.debug("  ✓ Wake-word detector ready for next detection")
    
    def get_teaching_progress(self) -> Dict[str, any]:
        """
        Get current teaching progress.
        
        Returns:
            Dictionary with progress information
        """
        return {
            'total_units': len(self.curriculum),
            'current_unit': self.current_unit,
            'is_complete': self.teaching_complete,
            'progress_percent': (self.current_unit / len(self.curriculum) * 100) 
                               if self.curriculum else 0
        }
    
    def stop_teaching(self):
        """
        Stop the teaching session completely (HARD STOP).
        
        HARD STOP for explicit "Stop Teaching" action:
        This method:
        1. Stops audio playback immediately
        2. Terminates the Piper TTS process
        3. Unloads ONNX model
        4. Sets state to INTERRUPTED
        5. Marks teaching as complete
        
        Use this for:
        - Explicit user "Stop Teaching" button
        - End of teaching session
        - Fatal errors requiring full cleanup
        
        Do NOT use this for:
        - Student interruptions (use interrupt() instead)
        - Temporary pauses (use interrupt() instead)
        
        CRITICAL DIFFERENCE from interrupt():
        - interrupt() = SOFT PAUSE (Piper stays alive)
        - stop_teaching() = HARD STOP (Piper dies)
        """
        logger.info("⏹️  STOPPING TEACHING SESSION (HARD STOP)")
        
        # Stop audio playback
        if self.voice_enabled and self.tts_engine:
            try:
                self.tts_engine.pause_speaking()
                logger.info("  ✓ Audio stopped")
            except Exception as e:
                logger.debug(f"  Error stopping audio: {e}")
        
        # Failsafe: Direct pygame stop
        try:
            import pygame
            if pygame.mixer.get_init():
                pygame.mixer.music.stop()
                logger.info("  ✓ Pygame audio stopped (failsafe)")
        except Exception as e:
            logger.debug(f"  Pygame failsafe stop failed: {e}")
        
        # CRITICAL: Terminate Piper process (HARD STOP)
        if self.voice_enabled and self.tts_engine:
            try:
                self.tts_engine.stop_persistent_piper()
                logger.info("  ✓ Piper process terminated")
            except Exception as e:
                logger.debug(f"  Error stopping Piper: {e}")
        
        # Update state
        self.teaching_state = TeachingState.INTERRUPTED
        self.teaching_complete = True
        logger.info("  ✓ Teaching session ended")



def create_autonomous_teacher(
    vector_database,
    embedding_generator,
    curriculum: List[Dict[str, str]],
    pdf_hash: str,
    ollama_model: str = "mistral"
) -> AutonomousTeacher:
    """
    Factory function to create an AutonomousTeacher.
    
    Args:
        vector_database: VectorDatabase instance
        embedding_generator: EmbeddingGenerator instance
        curriculum: List of teaching units
        pdf_hash: SHA-256 hash of the PDF (for cache keying)
        ollama_model: Ollama model name
    
    Returns:
        AutonomousTeacher instance
    """
    return AutonomousTeacher(
        vector_database=vector_database,
        embedding_generator=embedding_generator,
        curriculum=curriculum,
        pdf_hash=pdf_hash,
        ollama_model=ollama_model
    )
