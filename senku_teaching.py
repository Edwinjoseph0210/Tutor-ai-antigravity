"""
Senku Teaching Integration Module

Bridges Phase 2's autonomous teaching system into the main project.
Handles:
- PDF processing pipeline (fingerprint → extract → chunk → embed → ChromaDB → curriculum)
- Autonomous teaching with SSE streaming and sentence highlighting
- Session-level state management for active teaching sessions
"""

import json
import logging
import os
import re
import sqlite3
import threading
import time
from pathlib import Path
from typing import Dict, Generator, List, Optional

logger = logging.getLogger(__name__)

# ── Global teaching state (one active teaching session at a time) ──
_teaching_state = {
    'active_session_id': None,
    'teacher': None,
    'teaching_active': False,
    'teaching_stopped': False,
    'teaching_paused': False,
    'vector_db': None,
    'embedding_gen': None,
}
_state_lock = threading.Lock()

# ── Directories ──
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / 'data'
CHROMA_DIR = DATA_DIR / 'chroma_db'
CURRICULUM_DIR = DATA_DIR / 'curriculum'
LECTURES_DIR = DATA_DIR / 'lectures'

for d in [DATA_DIR, CHROMA_DIR, CURRICULUM_DIR, LECTURES_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# ============================================================================
# INITIALIZATION
# ============================================================================

def _get_vector_db():
    """Get or create global VectorDatabase instance."""
    if _teaching_state['vector_db'] is None:
        from vector_store.database import VectorDatabase
        _teaching_state['vector_db'] = VectorDatabase(
            collection_name='ai_tutor_documents',
            persist_directory=str(CHROMA_DIR)
        )
    return _teaching_state['vector_db']


def _get_embedding_gen():
    """Get or create global EmbeddingGenerator instance."""
    if _teaching_state['embedding_gen'] is None:
        from vector_store.embeddings import EmbeddingGenerator
        api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY not set. Needed for embeddings.")
        _teaching_state['embedding_gen'] = EmbeddingGenerator(
            provider='gemini',
            model_name='text-embedding-004',
            api_key=api_key
        )
    return _teaching_state['embedding_gen']


def _check_ollama_available() -> bool:
    """Check if Ollama is running locally."""
    try:
        import requests
        resp = requests.get('http://localhost:11434/api/tags', timeout=3)
        return resp.status_code == 200
    except Exception:
        return False


def _generate_with_gemini(prompt: str, model_name: str = 'gemini-2.0-flash') -> str:
    """Fallback: generate text using Gemini API when Ollama is not available."""
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        raise


# ============================================================================
# PDF PROCESSING PIPELINE (SSE Generator)
# ============================================================================

def process_session_materials(session_id: int, db_path: str = 'auth.db') -> Generator[str, None, None]:
    """
    Process all uploaded materials for a session through the Phase 2 pipeline.
    
    Pipeline: fingerprint → extract text → chunk → embed (Gemini) → store in ChromaDB → extract curriculum
    
    Yields SSE-formatted strings with progress updates.
    """
    import hashlib

    try:
        # Step 1: Get materials from database
        yield _sse({'step': 'init', 'progress': 5, 'message': 'Loading session materials...'})

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('SELECT id, filename, filepath, file_text FROM session_materials WHERE session_id = ?',
                    (session_id,))
        materials = cur.fetchall()
        conn.close()

        if not materials:
            yield _sse({'error': 'No materials found for this session'})
            return

        yield _sse({'step': 'init', 'progress': 10,
                     'message': f'Found {len(materials)} material(s). Starting processing...'})

        # Step 2: Compute combined PDF hash
        yield _sse({'step': 'fingerprint', 'progress': 15, 'message': 'Computing document fingerprint...'})

        hasher = hashlib.sha256()
        all_text = ''
        for mat_id, filename, filepath, file_text in materials:
            if filepath and os.path.exists(filepath):
                from ingestion.pdf_fingerprint import compute_pdf_hash
                try:
                    file_hash = compute_pdf_hash(filepath)
                    hasher.update(file_hash.encode())
                except Exception:
                    hasher.update(filename.encode())
            else:
                hasher.update(filename.encode())
            
            # Collect text
            if file_text and len(file_text) > 50:
                all_text += file_text + '\n\n'
            elif filepath and os.path.exists(filepath) and filepath.lower().endswith('.pdf'):
                from ingestion.document_loader import DocumentLoader
                loader = DocumentLoader()
                try:
                    extracted = loader.load_pdf(filepath)
                    if extracted:
                        all_text += extracted + '\n\n'
                except Exception as e:
                    logger.warning(f"Failed to extract text from {filename}: {e}")

        pdf_hash = hasher.hexdigest()
        yield _sse({'step': 'fingerprint', 'progress': 20,
                     'message': f'Document fingerprint: {pdf_hash[:12]}...'})

        if not all_text or len(all_text) < 100:
            yield _sse({'error': 'Could not extract sufficient text from materials'})
            return

        # Step 3: Check if already processed
        curriculum_cache = CURRICULUM_DIR / f"{pdf_hash}.json"
        vector_db = _get_vector_db()
        doc_count = vector_db.get_document_count()

        # Check for cached curriculum
        if curriculum_cache.exists() and doc_count > 0:
            yield _sse({'step': 'cache', 'progress': 80,
                         'message': 'Found cached data, loading...'})
            with open(curriculum_cache, 'r') as f:
                curriculum = json.load(f)
            _save_session_curriculum(session_id, pdf_hash, curriculum, db_path)
            yield _sse({'step': 'complete', 'progress': 100,
                         'message': 'Processing complete (cached)',
                         'curriculum': curriculum, 'pdf_hash': pdf_hash})
            return

        # Step 4: Chunk text
        yield _sse({'step': 'chunk', 'progress': 30, 'message': 'Chunking text into segments...'})

        from ingestion.text_processor import TextProcessor
        processor = TextProcessor(chunk_size=500, chunk_overlap=50)
        chunks = processor.chunk_text(all_text)

        yield _sse({'step': 'chunk', 'progress': 40,
                     'message': f'Created {len(chunks)} text chunks'})

        # Step 5: Generate embeddings
        yield _sse({'step': 'embed', 'progress': 45, 'message': 'Generating embeddings (Gemini)...'})

        embedding_gen = _get_embedding_gen()
        embeddings = []
        total = len(chunks)
        for i, chunk in enumerate(chunks):
            try:
                emb = embedding_gen.generate_embedding(chunk)
                embeddings.append(emb)
            except Exception as e:
                logger.warning(f"Embedding failed for chunk {i}: {e}")
                embeddings.append([])
            
            if (i + 1) % 10 == 0 or i == total - 1:
                pct = 45 + int((i / total) * 25)
                yield _sse({'step': 'embed', 'progress': pct,
                             'message': f'Embedded {i+1}/{total} chunks...'})

        # Filter out empty embeddings
        valid = [(c, e) for c, e in zip(chunks, embeddings) if e]
        if not valid:
            yield _sse({'error': 'Failed to generate any embeddings'})
            return

        valid_chunks, valid_embeddings = zip(*valid)

        # Step 6: Store in ChromaDB
        yield _sse({'step': 'store', 'progress': 75, 'message': 'Storing in vector database...'})

        # Clear previous data and add new
        vector_db.clear_collection()
        vector_db.add_documents(
            chunks=list(valid_chunks),
            embeddings=list(valid_embeddings)
        )

        yield _sse({'step': 'store', 'progress': 80,
                     'message': f'Stored {len(valid_chunks)} chunks in vector database'})

        # Step 7: Extract curriculum
        yield _sse({'step': 'curriculum', 'progress': 85,
                     'message': 'Extracting curriculum from document...'})

        from ingestion.curriculum_extractor import CurriculumExtractor
        extractor = CurriculumExtractor()
        curriculum = extractor.extract_curriculum(all_text, chunks=list(valid_chunks))

        if not curriculum:
            curriculum = [{'title': 'Complete Study Material', 'type': 'chapter', 'order': 1}]

        yield _sse({'step': 'curriculum', 'progress': 90,
                     'message': f'Extracted {len(curriculum)} teaching units'})

        # Step 8: Enhance curriculum (optional, uses Gemini)
        yield _sse({'step': 'enhance', 'progress': 92,
                     'message': 'Validating curriculum quality...'})

        from ingestion.curriculum_enhancer import CurriculumEnhancer
        enhancer = CurriculumEnhancer(cache_dir=str(CURRICULUM_DIR))
        curriculum = enhancer.enhance(curriculum, all_text, pdf_hash)

        # Step 9: Cache curriculum
        with open(curriculum_cache, 'w') as f:
            json.dump(curriculum, f, indent=2)

        # Step 10: Save to database
        _save_session_curriculum(session_id, pdf_hash, curriculum, db_path)

        yield _sse({'step': 'complete', 'progress': 100,
                     'message': f'Processing complete! {len(curriculum)} teaching units ready.',
                     'curriculum': curriculum, 'pdf_hash': pdf_hash})

    except Exception as e:
        logger.error(f"Processing failed: {e}")
        import traceback
        traceback.print_exc()
        yield _sse({'error': str(e)})


def _save_session_curriculum(session_id: int, pdf_hash: str, curriculum: list, db_path: str = 'auth.db'):
    """Save pdf_hash and curriculum JSON to the teaching_sessions table."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Ensure columns exist
    try:
        cur.execute('SELECT pdf_hash FROM teaching_sessions LIMIT 0')
    except Exception:
        cur.execute('ALTER TABLE teaching_sessions ADD COLUMN pdf_hash TEXT')
    try:
        cur.execute('SELECT curriculum_json FROM teaching_sessions LIMIT 0')
    except Exception:
        cur.execute('ALTER TABLE teaching_sessions ADD COLUMN curriculum_json TEXT')
    
    cur.execute('''
        UPDATE teaching_sessions SET pdf_hash = ?, curriculum_json = ? WHERE id = ?
    ''', (pdf_hash, json.dumps(curriculum), session_id))
    conn.commit()
    conn.close()


# ============================================================================
# AUTONOMOUS TEACHING (SSE Generator)
# ============================================================================

def start_teaching(session_id: int, db_path: str = 'auth.db') -> Generator[str, None, None]:
    """
    Start autonomous teaching for a session.
    
    Streams SSE events with sentence-level highlighting, progress, etc.
    Uses Ollama (if available) or Gemini as fallback for lecture generation.
    """
    global _teaching_state

    try:
        # Load session data
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('SELECT pdf_hash, curriculum_json FROM teaching_sessions WHERE id = ?', (session_id,))
        row = cur.fetchone()
        conn.close()

        if not row or not row[0] or not row[1]:
            yield _sse({'error': 'Session not processed yet. Run "Process Materials" first.'})
            return

        pdf_hash, curriculum_json = row
        curriculum = json.loads(curriculum_json)

        if not curriculum:
            yield _sse({'error': 'No curriculum found. Process materials first.'})
            return

        # Initialize vector DB and embedding generator
        vector_db = _get_vector_db()
        embedding_gen = _get_embedding_gen()

        # Determine LLM to use
        use_ollama = _check_ollama_available()
        ollama_model = 'mistral'
        
        if use_ollama:
            logger.info("Using Ollama (Mistral) for lecture generation")
            yield _sse({'type': 'info', 'message': 'Using Ollama (local AI) for teaching'})
        else:
            logger.info("Ollama not available, using Gemini for lecture generation")
            yield _sse({'type': 'info', 'message': 'Using Gemini AI for teaching'})

        # Create autonomous teacher
        from teaching.autonomous_teacher import AutonomousTeacher

        with _state_lock:
            _teaching_state['teaching_stopped'] = False
            _teaching_state['teaching_paused'] = False
            _teaching_state['active_session_id'] = session_id

        teacher = AutonomousTeacher(
            vector_database=vector_db,
            embedding_generator=embedding_gen,
            curriculum=curriculum,
            pdf_hash=pdf_hash,
            ollama_model=ollama_model if use_ollama else 'gemini'
        )

        with _state_lock:
            _teaching_state['teacher'] = teacher
            _teaching_state['teaching_active'] = True

        # If Ollama is NOT available, monkey-patch to use Gemini
        if not use_ollama:
            _patch_teacher_for_gemini(teacher)

        # Teach with highlighting (text-only mode, no TTS)
        for event in teacher.teach_entire_curriculum_with_highlighting():
            # Check if stopped
            with _state_lock:
                if _teaching_state['teaching_stopped']:
                    yield _sse({'type': 'stopped', 'message': 'Teaching stopped'})
                    break

            yield _sse(event)

        # Teaching complete
        yield _sse({'type': 'complete', 'message': 'Teaching session complete'})

    except Exception as e:
        logger.error(f"Teaching error: {e}")
        import traceback
        traceback.print_exc()
        yield _sse({'error': str(e)})
    finally:
        with _state_lock:
            _teaching_state['teaching_active'] = False
            _teaching_state['teacher'] = None
            _teaching_state['active_session_id'] = None


def stop_teaching():
    """Stop the current teaching session."""
    with _state_lock:
        _teaching_state['teaching_stopped'] = True
        if _teaching_state['teacher']:
            _teaching_state['teacher'].stop_teaching()
        _teaching_state['teaching_active'] = False


def pause_teaching() -> bool:
    """Toggle pause/resume. Returns True if now paused."""
    with _state_lock:
        _teaching_state['teaching_paused'] = not _teaching_state['teaching_paused']
        if _teaching_state['teacher']:
            if _teaching_state['teaching_paused']:
                _teaching_state['teacher'].interrupt()
            else:
                _teaching_state['teacher'].resume()
        return _teaching_state['teaching_paused']


def get_teaching_status() -> dict:
    """Get current teaching state."""
    with _state_lock:
        return {
            'active': _teaching_state['teaching_active'],
            'session_id': _teaching_state['active_session_id'],
            'paused': _teaching_state['teaching_paused'],
            'stopped': _teaching_state['teaching_stopped'],
        }


# ============================================================================
# GEMINI FALLBACK PATCH
# ============================================================================

def _patch_teacher_for_gemini(teacher):
    """
    Monkey-patch the AutonomousTeacher to use Gemini instead of Ollama
    for lecture generation when Ollama is not available.
    """
    import types

    original_teach_unit = teacher._teach_unit

    def _teach_unit_gemini(self, unit, unit_num, total_units):
        """Generate lecture using Gemini instead of Ollama."""
        unit_title = unit['title']
        
        # Check cache first
        cache_file = self.cache_dir / f"lesson_{unit_num}.txt"
        if cache_file.exists():
            logger.info(f"  Loading cached lecture: {cache_file.name}")
            try:
                return cache_file.read_text(encoding='utf-8')
            except Exception:
                pass
        
        # Retrieve context from vector DB
        context = self._retrieve_context(unit_title)
        if not context:
            return f"Lesson {unit_num}\n\nNo content found for: {unit_title}"
        
        # Generate with Gemini
        from teaching.autonomous_teacher import get_time_based_greeting
        greeting = get_time_based_greeting()
        
        prompt = f"""You are a passionate classroom teacher delivering a full lecture session.
Create a SPOKEN LECTURE SCRIPT for a 5-8 minute classroom lecture.

TOPIC: {unit_title}

TEXTBOOK CONTENT:
{context}

CRITICAL LENGTH REQUIREMENT:
- Target: 600-900 words (5-8 minutes of speaking)
- This is a FULL classroom lecture, NOT a summary

SPOKEN LECTURE SCRIPT FORMAT:
Write as a SPOKEN script with natural breaks:

Example: "{greeting}, class! Today, we're going to explore something fascinating.
Now, here's the key question: why does this matter? Let me explain..."

TEACHING STYLE (CS50-INSPIRED):
1. Be EXPRESSIVE and PASSIONATE
2. Use rhetorical questions
3. Explain WHY concepts matter
4. Use conversational language: "we", "let's", "notice that"

LECTURE STRUCTURE:
1. OPENING (100-150 words): Grab attention, preview
2. MAIN EXPLANATION (350-550 words): 3-4 key ideas, step-by-step
3. CONCLUSION (150-200 words): Recap, bigger picture

CRITICAL RULES:
- DO NOT ask students to respond or answer
- Use ONLY the textbook content above
- Target: 600-900 words
- DO NOT include headers, lesson numbers, or separators
- Output ONLY the spoken lecture script

Now, deliver this classroom-length lecture script:"""

        try:
            lecture_content = _generate_with_gemini(prompt)
            header = f"Lesson {unit_num}\n\n"
            lecture = header + lecture_content.strip()
            
            # Cache it
            try:
                cache_file.write_text(lecture, encoding='utf-8')
            except Exception:
                pass
            
            return lecture
        except Exception as e:
            logger.error(f"Gemini lecture generation failed: {e}")
            return f"Lesson {unit_num}\n\nI apologize, but I had difficulty preparing this lesson on \"{unit_title}\". Let's move on to the next topic."

    teacher._teach_unit = types.MethodType(_teach_unit_gemini, teacher)


# ============================================================================
# HELPERS
# ============================================================================

def _sse(data: dict) -> str:
    """Format data as an SSE event string."""
    return f"data: {json.dumps(data)}\n\n"


def get_time_based_greeting() -> str:
    """Get a time-appropriate greeting."""
    from datetime import datetime
    hour = datetime.now().hour
    if hour < 12:
        return "Good morning"
    elif hour < 17:
        return "Good afternoon"
    else:
        return "Good evening"
