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
from pathlib import Path
from typing import List, Dict, Optional, Generator

from teaching.rag_engine import generate_with_ollama

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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
        
        # TTS Engine (optional)
        self.tts_engine = None
        self.voice_enabled = False
        
        logger.info(
            f"AutonomousTeacher initialized: {len(curriculum)} units, "
            f"model={ollama_model}, cache_dir={self.cache_dir}"
        )
    
    def enable_voice(self, rate: int = 150, volume: float = 0.9, voice_gender: str = "female"):
        """
        Enable text-to-speech voice output.
        
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
            sentences = []
            if self.tts_engine:
                sentences = self.tts_engine.get_sentences(lecture)
            
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
                    for idx, sentence in enumerate(sentences):
                        if sentence.strip():
                            # Yield sentence start (for bold highlighting)
                            yield {
                                'type': 'sentence_start',
                                'unit_number': i,
                                'unit_title': unit['title'],
                                'lecture': lecture,
                                'sentences': sentences,
                                'sentence_index': idx,
                                'sentence_text': sentence,
                                'progress': f"{i}/{total_units}",
                                'is_complete': False
                            }
                            
                            # Small pause before speaking
                            time.sleep(0.3)
                            
                            # Generate and play audio for the sentence
                            audio_file = self.tts_engine._generate_audio(sentence)
                            if audio_file:
                                import pygame
                                pygame.mixer.music.load(str(audio_file))
                                pygame.mixer.music.play()
                                
                                while pygame.mixer.music.get_busy():
                                    pygame.time.Clock().tick(10)
                            
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
            
            logger.info(f"  💾 Saved: {filepath.name}")
            
        except Exception as e:
            logger.error(f"Failed to save lecture: {e}")
    
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
