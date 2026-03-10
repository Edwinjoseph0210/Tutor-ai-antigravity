"""
AI Service — Gemini AI endpoints, lecture generation, Senku teaching, study plans, MCQs
Extracted from monolithic app.py for modularity.
"""

from flask import Blueprint, request, jsonify, session, Response
from backend.auth_service import login_required, teacher_required
from datetime import datetime
import sqlite3
import os
import json
import re
import hashlib
import pathlib

ai_bp = Blueprint('ai', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── Lazy-loaded module refs (populated by orchestrator) ─────────────────────
gemini_available = False
genai = None
lecture_module = None
attendance_module = None
senku_teaching_module = None
senku_bridge_module = None
tts_available = False


def init_ai_service(*, genai_mod=None, gemini_ok=False, lecture_mod=None,
                    attendance_mod=None, senku_teaching_mod=None,
                    senku_bridge_mod=None, tts_ok=False):
    """Called once from orchestrator to inject shared modules."""
    global gemini_available, genai, lecture_module, attendance_module
    global senku_teaching_module, senku_bridge_module, tts_available
    gemini_available = gemini_ok
    genai = genai_mod
    lecture_module = lecture_mod
    attendance_module = attendance_mod
    senku_teaching_module = senku_teaching_mod
    senku_bridge_module = senku_bridge_mod
    tts_available = tts_ok


def _extract_json(text):
    """Best-effort JSON extraction from Gemini markdown output."""
    m = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if m:
        return json.loads(m.group(1))
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        return json.loads(m.group(0))
    return None


# ── Gemini general endpoints ────────────────────────────────────────────────

@ai_bp.route('/api/gemini/ask', methods=['POST'])
@login_required
def gemini_ask():
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503
    try:
        data = request.get_json()
        query = data.get('query', '')
        if not query:
            return jsonify({'success': False, 'message': 'Query is required'}), 400
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(f"You are an educational assistant. {query}")
        return jsonify({'success': True, 'response': response.text})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/gemini/syllabus', methods=['POST'])
@login_required
def gemini_syllabus():
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503
    try:
        data = request.get_json()
        subject = data.get('subject', '')
        grade_level = data.get('grade_level', '')
        course = data.get('course', '')
        if not subject:
            return jsonify({'success': False, 'message': 'Subject required'}), 400
        prompt = f"Create a comprehensive syllabus for {subject}"
        if grade_level:
            prompt += f" at {grade_level} level"
        if course:
            prompt += f" for the course: {course}"
        prompt += ". Include: 1. Course overview, 2. Learning objectives, 3. Topics/chapters, 4. Assessment methods, 5. Recommended resources."
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return jsonify({'success': True, 'response': response.text})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/gemini/notes', methods=['POST'])
@login_required
def gemini_notes():
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503
    try:
        data = request.get_json()
        topic = data.get('topic', '')
        subject = data.get('subject', '')
        detail_level = data.get('detail_level', 'medium')
        if not topic:
            return jsonify({'success': False, 'message': 'Topic required'}), 400
        prompt = f"Create well-structured study notes on '{topic}'"
        if subject:
            prompt += f" in the subject of {subject}"
        prompt += f" with {detail_level} detail level. Include: key concepts, important points, examples, and a summary."
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return jsonify({'success': True, 'response': response.text})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/gemini/explain', methods=['POST'])
@login_required
def gemini_explain():
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503
    try:
        data = request.get_json()
        concept = data.get('concept', '')
        level = data.get('level', 'intermediate')
        if not concept:
            return jsonify({'success': False, 'message': 'Concept required'}), 400
        prompt = (f"Explain the concept of '{concept}' at a {level} level. "
                  "Include: a clear definition, key components, real-world examples, and practical applications.")
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return jsonify({'success': True, 'response': response.text})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Lecture content generation ──────────────────────────────────────────────

@ai_bp.route('/api/lectures/content/generate', methods=['POST'])
@login_required
def generate_lecture_content():
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503
    try:
        data = request.get_json()
        subject = data.get('subject', 'Biology')
        chapter = data.get('chapter', 'Chapter 1')
        cached = lecture_module.get_lecture_content(subject, chapter)
        if cached:
            return jsonify({'success': True, 'data': cached, 'cached': True, 'message': 'Using cached content'})
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""Create comprehensive lecture content for NCERT Class 10 {subject} {chapter}.
Return JSON: {{"title":"...","subject":"{subject}","chapter":"{chapter}","total_duration_minutes":45,
"sections":[{{"section_number":1,"title":"...","summary":"...","key_points":[...],"image_descriptions":[...],"duration_minutes":8}}]}}"""
        response = model.generate_content(prompt)
        content_json = _extract_json(response.text)
        if not content_json:
            content_json = {"title": f"{subject} - {chapter}", "subject": subject, "chapter": chapter,
                            "total_duration_minutes": 45, "sections": [{"section_number": 1, "title": "Introduction",
                            "summary": response.text[:500], "key_points": [], "image_descriptions": [], "duration_minutes": 8}]}
        lecture_module.save_lecture_content(subject, chapter, content_json)
        return jsonify({'success': True, 'data': content_json, 'cached': False, 'message': 'Content generated'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/lectures/content/<subject>/<chapter>')
@login_required
def get_lecture_content(subject, chapter):
    try:
        content = lecture_module.get_lecture_content(subject, chapter)
        if content:
            return jsonify({'success': True, 'data': content, 'cached': True})
        return jsonify({'success': False, 'message': 'Not found. Generate first.', 'cached': False})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/lectures/syllabus/generate', methods=['POST'])
@login_required
def generate_syllabus():
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503
    try:
        data = request.get_json()
        subject = data.get('subject', 'Biology')
        grade = data.get('grade', 'Class 10')
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""Create comprehensive syllabus for {subject} for {grade} (NCERT). Return JSON with subject, grade, overview, objectives, chapters[], assessment, resources[]."""
        response = model.generate_content(prompt)
        syllabus = _extract_json(response.text) or {"error": "Failed to parse"}
        return jsonify({'success': True, 'data': syllabus})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/lectures/study-plan/generate', methods=['POST'])
@login_required
def generate_study_plan():
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503
    try:
        data = request.get_json()
        subject = data.get('subject', 'Biology')
        chapter = data.get('chapter', 'Chapter 1')
        duration = data.get('duration_minutes', 45)
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""Create study plan for {subject} {chapter} for {duration}-minute class. Return JSON with full_study_plan, topics_for_today, learning_objectives, total_duration."""
        response = model.generate_content(prompt)
        plan = _extract_json(response.text) or {"error": "Failed to parse"}
        topics_today = json.dumps(plan.get('topics_for_today', []))
        lecture_module.save_study_plan(subject, chapter, plan, topics_today)
        return jsonify({'success': True, 'data': plan})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/lectures/study-plan/<subject>/<chapter>')
@login_required
def get_study_plan(subject, chapter):
    try:
        data = lecture_module.get_study_plan(subject, chapter)
        if data:
            return jsonify({'success': True, 'data': data})
        return jsonify({'success': False, 'message': 'Not found'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── MCQ generation ──────────────────────────────────────────────────────────

@ai_bp.route('/api/lectures/mcq/generate', methods=['POST'])
@login_required
def generate_mcq_test():
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        subject = data.get('subject', 'Biology')
        chapter = data.get('chapter', 'Chapter 1')
        num_q = data.get('num_questions', 5)
        dur = data.get('duration_minutes', 5)
        if not session_id:
            active = lecture_module.get_active_lecture_session()
            session_id = active['id'] if active else None
        if not session_id:
            return jsonify({'success': False, 'message': 'No active session'}), 404
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""Create {num_q} MCQs for {subject} {chapter} (NCERT Class 10). Return JSON with questions array."""
        response = model.generate_content(prompt)
        mcq = _extract_json(response.text) or {"error": "Failed to parse"}
        test_id = lecture_module.save_mcq_test(session_id, subject, chapter, mcq, dur)
        return jsonify({'success': True, 'data': mcq, 'test_id': test_id, 'duration_minutes': dur})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/lectures/mcq/<int:test_id>')
@login_required
def get_mcq_test(test_id):
    try:
        data = lecture_module.get_mcq_test(test_id)
        if data:
            return jsonify({'success': True, 'data': data})
        return jsonify({'success': False, 'message': 'Not found'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/lectures/mcq/session/<int:session_id>')
@login_required
def get_mcq_by_session(session_id):
    try:
        data = lecture_module.get_mcq_test_by_session(session_id)
        if data:
            return jsonify({'success': True, 'data': data})
        return jsonify({'success': False, 'message': 'No test for session'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@ai_bp.route('/api/lectures/mcq/submit', methods=['POST'])
@login_required
def submit_mcq_response():
    try:
        data = request.get_json()
        test_id = data.get('test_id')
        student_id = data.get('student_id')
        answers = data.get('answers', {})
        if not test_id or not student_id:
            return jsonify({'success': False, 'message': 'test_id and student_id required'}), 400
        test = lecture_module.get_mcq_test(test_id)
        if not test:
            return jsonify({'success': False, 'message': 'Test not found'}), 404
        questions = test['questions'].get('questions', [])
        score = sum(1 for q in questions if answers.get(str(q.get('id', '')), '').upper() == q.get('correct_answer', '').upper())
        total = len(questions)
        rid = lecture_module.save_mcq_response(test_id, student_id, answers, score, total)
        return jsonify({'success': True, 'response_id': rid, 'score': score,
                        'total_questions': total, 'percentage': round(score / total * 100, 2) if total else 0})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Session lecture generation via Gemini ────────────────────────────────────

@ai_bp.route('/api/sessions/<int:session_id>/generate-lectures', methods=['POST'])
@login_required
def generate_session_lectures(session_id):
    try:
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'auth.db'))
        cur = conn.cursor()
        cur.execute('SELECT id, filename, file_text FROM session_materials WHERE session_id=?', (session_id,))
        materials = cur.fetchall()
        if not materials:
            conn.close()
            return jsonify({'success': False, 'message': 'No materials uploaded'}), 400
        cur.execute('DELETE FROM session_lectures WHERE session_id=?', (session_id,))
        generated = []
        order = 0
        for mat_id, filename, file_text in materials:
            if not file_text or len(file_text) < 50:
                order += 1
                cur.execute('INSERT INTO session_lectures (session_id, material_id, title, content, order_index) VALUES (?,?,?,?,?)',
                            (session_id, mat_id, f'Material: {filename}',
                             f'File "{filename}" could not be processed for text extraction.', order))
                generated.append({'title': f'Material: {filename}', 'status': 'no_text'})
                continue
            if gemini_available:
                try:
                    model = genai.GenerativeModel('gemini-pro')
                    text_sample = file_text[:40000]
                    prompt = f"""You are an expert teacher. Given study material, create structured lecture notes.
Study Material: {text_sample}
Create 1-3 lectures. Return JSON: {{"lectures":[{{"title":"...","content":"markdown content"}}]}}"""
                    response = model.generate_content(prompt)
                    result = _extract_json(response.text)
                    for lec in (result or {}).get('lectures', []):
                        order += 1
                        cur.execute('INSERT INTO session_lectures (session_id, material_id, title, content, order_index) VALUES (?,?,?,?,?)',
                                    (session_id, mat_id, lec.get('title', f'Lecture {order}'), lec.get('content', ''), order))
                        generated.append({'title': lec.get('title', ''), 'status': 'ai_generated'})
                except Exception:
                    order += 1
                    cur.execute('INSERT INTO session_lectures (session_id, material_id, title, content, order_index) VALUES (?,?,?,?,?)',
                                (session_id, mat_id, f'Lecture: {filename}', file_text[:5000], order))
                    generated.append({'title': f'Lecture: {filename}', 'status': 'fallback'})
            else:
                order += 1
                cur.execute('INSERT INTO session_lectures (session_id, material_id, title, content, order_index) VALUES (?,?,?,?,?)',
                            (session_id, mat_id, f'Lecture: {filename}', f"## {filename}\n\n{file_text[:5000]}", order))
                generated.append({'title': f'Lecture: {filename}', 'status': 'text_only'})
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'Generated {len(generated)} lecture(s)', 'data': generated})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Senku autonomous teaching SSE endpoints ─────────────────────────────────

@ai_bp.route('/api/sessions/<int:session_id>/process-materials', methods=['POST'])
@login_required
def process_session_materials_sse(session_id):
    def generate():
        for chunk in senku_teaching_module.process_session_materials(session_id, db_path='auth.db'):
            yield chunk
    return Response(generate(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@ai_bp.route('/api/sessions/<int:session_id>/teach', methods=['POST'])
@login_required
def start_session_teaching(session_id):
    def generate():
        for chunk in senku_teaching_module.start_teaching(session_id, db_path='auth.db'):
            yield chunk
    return Response(generate(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@ai_bp.route('/api/sessions/<int:session_id>/teach/stop', methods=['POST'])
@login_required
def stop_session_teaching(session_id):
    senku_teaching_module.stop_teaching()
    return jsonify({'success': True, 'message': 'Teaching stopped'})


@ai_bp.route('/api/sessions/<int:session_id>/teach/pause', methods=['POST'])
@login_required
def pause_session_teaching(session_id):
    paused = senku_teaching_module.pause_teaching()
    return jsonify({'success': True, 'paused': paused})


@ai_bp.route('/api/sessions/<int:session_id>/teaching-status', methods=['GET'])
@login_required
def get_session_teaching_status(session_id):
    status = senku_teaching_module.get_teaching_status()
    return jsonify({'success': True, 'data': status})


@ai_bp.route('/api/sessions/<int:session_id>/curriculum', methods=['GET'])
@login_required
def get_session_curriculum(session_id):
    try:
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'auth.db'))
        cur = conn.cursor()
        try:
            cur.execute('SELECT pdf_hash, curriculum_json FROM teaching_sessions WHERE id=?', (session_id,))
        except Exception:
            conn.close()
            return jsonify({'success': True, 'data': {'pdf_hash': None, 'curriculum': None}})
        row = cur.fetchone()
        conn.close()
        if not row:
            return jsonify({'success': False, 'message': 'Session not found'}), 404
        curriculum = json.loads(row[1]) if row[1] else None
        return jsonify({'success': True, 'data': {'pdf_hash': row[0], 'curriculum': curriculum, 'processed': row[0] is not None}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Senku standalone (original) endpoints ────────────────────────────────────

senku_state = {
    'current_teacher': None,
    'teaching_active': False,
    'teaching_stopped': False,
    'teaching_paused': False,
    'curriculum_cache': {}
}


def _save_curriculum(pdf_hash, curriculum):
    d = pathlib.Path(os.path.join(BASE_DIR, 'data', 'curriculum'))
    d.mkdir(parents=True, exist_ok=True)
    with open(d / f'{pdf_hash}.json', 'w', encoding='utf-8') as f:
        json.dump(curriculum, f, indent=2)
    senku_state['curriculum_cache'][pdf_hash] = curriculum


def _load_curriculum(pdf_hash):
    if pdf_hash in senku_state['curriculum_cache']:
        return senku_state['curriculum_cache'][pdf_hash]
    p = pathlib.Path(os.path.join(BASE_DIR, 'data', 'curriculum')) / f'{pdf_hash}.json'
    if p.exists():
        with open(p, 'r', encoding='utf-8') as f:
            c = json.load(f)
            senku_state['curriculum_cache'][pdf_hash] = c
            return c
    return None


@ai_bp.route('/api/senku/status', methods=['GET'])
@login_required
def senku_status():
    return jsonify({'status': 'online', 'gemini_available': gemini_available,
                    'teaching_active': senku_state['teaching_active']})


@ai_bp.route('/api/senku/process', methods=['POST'])
@login_required
def senku_process_textbook():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Invalid file. Only PDF allowed'}), 400
    try:
        import tempfile
        from senku_ingestion.pdf_fingerprint import compute_bytes_hash, get_chroma_path_for_pdf, pdf_embeddings_exist
        from senku_ingestion.document_loader import DocumentLoader
        from senku_ingestion.text_processor import chunk_text
        from senku_ingestion.curriculum_extractor import CurriculumExtractor
        from vector_store.database import VectorDatabase
        from vector_store.embeddings import EmbeddingGenerator

        pdf_bytes = file.read()

        def generate():
            try:
                yield f'data: {json.dumps({"step":"fingerprint","progress":10,"message":"Computing fingerprint..."})}\n\n'
                pdf_hash = compute_bytes_hash(pdf_bytes)
                chroma_path = get_chroma_path_for_pdf(pdf_hash, base_dir='./data/chroma_db')
                if pdf_embeddings_exist(pdf_hash, base_dir='./data/chroma_db'):
                    yield f'data: {json.dumps({"step":"check","progress":40,"message":"Reusing existing embeddings..."})}\n\n'
                    db = VectorDatabase(collection_name='ai_tutor_documents', persist_directory=str(chroma_path))
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                        tmp.write(pdf_bytes)
                        tmp_path = tmp.name
                    full_text = DocumentLoader().load_pdf(tmp_path)
                    os.unlink(tmp_path)
                    chunks = None
                else:
                    yield f'data: {json.dumps({"step":"extract","progress":30,"message":"Extracting text..."})}\n\n'
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                        tmp.write(pdf_bytes)
                        tmp_path = tmp.name
                    full_text = DocumentLoader().load_pdf(tmp_path)
                    chunks = chunk_text(full_text, chunk_size=600, chunk_overlap=60)
                    yield f'data: {json.dumps({"step":"embed","progress":50,"message":"Generating embeddings..."})}\n\n'
                    gen = EmbeddingGenerator(provider='gemini')
                    embeddings = gen.generate_embeddings_batch(chunks)
                    valid = [(c, e) for c, e in zip(chunks, embeddings) if e and len(e) > 0]
                    if not valid:
                        yield f'data: {json.dumps({"error":"Failed to generate embeddings"})}\n\n'
                        return
                    yield f'data: {json.dumps({"step":"store","progress":70,"message":"Storing vectors..."})}\n\n'
                    db = VectorDatabase(collection_name='ai_tutor_documents', persist_directory=str(chroma_path))
                    db.add_documents([v[0] for v in valid], [v[1] for v in valid])
                    os.unlink(tmp_path)
                yield f'data: {json.dumps({"step":"curriculum","progress":80,"message":"Extracting curriculum..."})}\n\n'
                curriculum = CurriculumExtractor().extract_curriculum(full_text, chunks)
                _save_curriculum(pdf_hash, curriculum)
                cdata = [{'title': u['title'], 'type': u['type']} for u in curriculum]
                yield f'data: {json.dumps({"step":"complete","progress":100,"message":"Done!","curriculum":cdata,"pdf_hash":pdf_hash})}\n\n'
            except Exception as e:
                yield f'data: {json.dumps({"error": str(e)})}\n\n'

        return Response(generate(), mimetype='text/event-stream')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/api/senku/teach', methods=['POST'])
@login_required
def senku_start_teaching():
    try:
        from senku_ingestion.pdf_fingerprint import get_chroma_path_for_pdf
        from vector_store.database import VectorDatabase
        from vector_store.embeddings import EmbeddingGenerator
        from teaching.autonomous_teacher import AutonomousTeacher

        data = request.json
        pdf_hash = data.get('pdf_hash')
        voice_enabled = data.get('voice_enabled', True)
        if not pdf_hash:
            return jsonify({'error': 'pdf_hash required'}), 400
        chroma_path = get_chroma_path_for_pdf(pdf_hash, base_dir='./data/chroma_db')
        if not os.path.exists(chroma_path):
            return jsonify({'error': 'PDF not processed'}), 400
        db = VectorDatabase(collection_name='ai_tutor_documents', persist_directory=str(chroma_path))
        embedder = EmbeddingGenerator(provider='gemini')
        curriculum = _load_curriculum(pdf_hash)
        if not curriculum:
            return jsonify({'error': 'Curriculum not found. Reprocess the PDF.'}), 400
        teacher = AutonomousTeacher(vector_database=db, embedding_generator=embedder,
                                    curriculum=curriculum, pdf_hash=pdf_hash, ollama_model='mistral')
        if voice_enabled:
            try:
                teacher.enable_voice(rate=130, volume=1.0, voice_gender='male')
            except Exception:
                pass
        senku_state['current_teacher'] = teacher
        senku_state['teaching_active'] = True
        senku_state['teaching_stopped'] = False
        senku_state['teaching_paused'] = False

        def generate():
            import time as _time
            try:
                for progress in teacher.teach_entire_curriculum_with_highlighting():
                    if senku_state.get('teaching_stopped'):
                        yield f'data: {json.dumps({"type":"stopped","message":"Teaching stopped"})}\n\n'
                        break
                    while senku_state.get('teaching_paused'):
                        _time.sleep(0.5)
                        if senku_state.get('teaching_stopped'):
                            yield f'data: {json.dumps({"type":"stopped","message":"Teaching stopped"})}\n\n'
                            break
                    if senku_state.get('teaching_stopped'):
                        break
                    yield f'data: {json.dumps(progress)}\n\n'
                senku_state['teaching_active'] = False
                senku_state['current_teacher'] = None
            except Exception as e:
                yield f'data: {json.dumps({"error": str(e)})}\n\n'
                senku_state['teaching_active'] = False
                senku_state['current_teacher'] = None

        return Response(generate(), mimetype='text/event-stream')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ai_bp.route('/api/senku/teach/pause', methods=['POST'])
@login_required
def senku_pause():
    senku_state['teaching_paused'] = not senku_state.get('teaching_paused', False)
    return jsonify({'status': 'paused' if senku_state['teaching_paused'] else 'resumed',
                    'paused': senku_state['teaching_paused']})


@ai_bp.route('/api/senku/teach/stop', methods=['POST'])
@login_required
def senku_stop():
    senku_state['teaching_stopped'] = True
    senku_state['teaching_paused'] = False
    return jsonify({'status': 'stopped'})


# ── Timetable generation ────────────────────────────────────────────────────

@ai_bp.route('/api/timetable/generate', methods=['POST'])
@login_required
def generate_timetable():
    try:
        data = request.get_json() or {}
        class_name = data.get('class') or data.get('student_class')
        if not class_name:
            return jsonify({'success': False, 'message': 'class required'}), 400
        subjects_map = {
            '10': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Computer', 'Life Skills', 'Art'],
            '9': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Computer', 'Sanskrit', 'Art']
        }
        key = str(class_name).split()[0]
        subjects = subjects_map.get(key, ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Computer', 'Art', 'Physical Education'])
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        timetable = {}
        for di, day in enumerate(days):
            timetable[day] = [{'period': p + 1, 'subject': subjects[(di + p) % len(subjects)],
                               'start_time': None, 'duration_minutes': 40} for p in range(8)]
        return jsonify({'success': True, 'class': class_name, 'timetable': timetable})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
