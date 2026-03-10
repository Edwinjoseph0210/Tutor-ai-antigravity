"""
Orchestrator — New modular entry point for Tutor-AI-Antigravity.
Registers all Blueprint services and initializes shared resources.

Run with:  python backend/orchestrator.py
           (or set FLASK_APP=backend.orchestrator)
"""

import os
import sys
import time
import threading

# Ensure project root is on sys.path so imports resolve correctly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# ── Flask app creation ──────────────────────────────────────────────────────

REACT_BUILD_DIR = os.path.join(BASE_DIR, 'frontend', 'build')

app = Flask(
    __name__,
    static_folder=os.path.join(REACT_BUILD_DIR, 'static'),
    static_url_path='/static'
)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-this-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = None
app.config['SESSION_COOKIE_SECURE'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = 86400
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

ORIGINS = [
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:5001', 'http://127.0.0.1:5001',
    'https://ai-tutor-94ff4.web.app',
    'https://aitutor-team.web.app',
    'https://tutor-ai-antigravity.vercel.app',
]
CORS(app, supports_credentials=True, origins=ORIGINS)

socketio = SocketIO(
    app,
    cors_allowed_origins=ORIGINS,
    async_mode='threading',
    logger=True,
    engineio_logger=True,
)

# ── Shared module imports ───────────────────────────────────────────────────

import attendance
import lecture
import senku_bridge
import senku_teaching
import cv2
import numpy as np
from PIL import Image
import io as _io
import sqlite3

# Optional: face recognition
face_recognition = None
face_recognition_available = False
if os.getenv('DISABLE_FACE_RECO', '0') != '1':
    try:
        import face_recognition as _fr
        face_recognition = _fr
        face_recognition_available = True
    except Exception as e:
        print(f"⚠ Face recognition not available: {e}")

# Optional: emotion detector
emotion_detector = None
try:
    import utils.emotion_detector as _ed
    emotion_detector = _ed
    print("✓ Emotion detector loaded")
except Exception as e:
    print(f"⚠ Emotion detector not loaded: {e}")

# Optional: Gemini AI
gemini_available = False
genai = None
try:
    import google.generativeai as _genai
    key = os.getenv('GEMINI_API_KEY')
    if key:
        _genai.configure(api_key=key)
        genai = _genai
        gemini_available = True
        print("✓ Gemini AI initialized")
    else:
        print("⚠ Gemini AI not available (no GEMINI_API_KEY)")
except ImportError:
    print("⚠ google-generativeai not installed")

# Optional: TTS
tts_available = False
try:
    import pyttsx3
    tts_available = True
except Exception:
    pass

# Camera helper (lightweight)
def get_available_cameras():
    cameras = []
    for i in range(5):
        try:
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                cameras.append({'index': i, 'name': f'Camera {i}'})
                cap.release()
        except Exception:
            pass
    return cameras

# Helper to load faces
def load_known_faces():
    """Scan faces/ directory and populate emotion_detector globals."""
    if not face_recognition_available or not face_recognition:
        return
    faces_dir = os.path.join(BASE_DIR, 'faces')
    encodings, names = [], []
    for root, dirs, files in os.walk(faces_dir):
        for fn in files:
            if fn.lower().endswith(('.jpg', '.jpeg', '.png')):
                path = os.path.join(root, fn)
                try:
                    img = face_recognition.load_image_file(path)
                    encs = face_recognition.face_encodings(img)
                    if encs:
                        person = os.path.basename(os.path.dirname(path))
                        if person == 'faces':
                            person = os.path.splitext(fn)[0]
                        encodings.append(encs[0])
                        names.append(person)
                except Exception:
                    pass
    if emotion_detector:
        emotion_detector.known_face_encodings = encodings
        emotion_detector.known_face_names = names
    print(f"✓ Loaded {len(encodings)} face encodings for {len(set(names))} people")

# ── Register Blueprints ─────────────────────────────────────────────────────

from backend.auth_service import auth_bp, init_auth_db
from backend.session_service import session_bp, init_sessions_db
from backend.ai_service import ai_bp, init_ai_service
from backend.face_service import face_bp, init_face_service
from backend.classroom_service import classroom_bp, init_classroom_service

# Initialize service dependencies
init_ai_service(
    genai_mod=genai, gemini_ok=gemini_available,
    lecture_mod=lecture, attendance_mod=attendance,
    senku_teaching_mod=senku_teaching, senku_bridge_mod=senku_bridge,
    tts_ok=tts_available,
)
init_face_service(
    fr=face_recognition, fr_available=face_recognition_available,
    ed=emotion_detector, att=attendance,
    cv2=cv2, np=np, pil_image=Image, io=_io,
)
init_classroom_service(
    att=attendance, lec=lecture,
    ed=emotion_detector, cam_fn=get_available_cameras,
)

# Register all blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(session_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(face_bp)
app.register_blueprint(classroom_bp)

# ── SocketIO event handlers ─────────────────────────────────────────────────

from flask import session as flask_session

@socketio.on('connect')
def handle_connect(auth):
    user_id = flask_session.get('user_id')
    role = flask_session.get('role', 'student')
    student_class = flask_session.get('student_class')
    class_id = flask_session.get('current_lecture_class_id')
    if user_id:
        print(f"📡 Connected: User {user_id} ({role})")
        if role == 'student' and student_class:
            join_room(f"classroom:{student_class}")
        elif role == 'teacher' and class_id:
            join_room(f"classroom:{class_id}")
    else:
        return False


@socketio.on('disconnect')
def handle_disconnect():
    uid = flask_session.get('user_id')
    print(f"📡 Disconnected: User {uid}")


@socketio.on('join_classroom')
def handle_join(data):
    uid = flask_session.get('user_id')
    role = flask_session.get('role')
    cid = data.get('class_id')
    sid = data.get('section_id')
    if cid:
        room = f"classroom:{cid}:{sid}" if sid else f"classroom:{cid}"
        join_room(room)
        emit('joined_classroom', {'room': room, 'class_id': cid, 'section_id': sid})


@socketio.on('leave_classroom')
def handle_leave(data):
    cid = data.get('class_id')
    sid = data.get('section_id')
    if cid:
        room = f"classroom:{cid}:{sid}" if sid else f"classroom:{cid}"
        leave_room(room)


# ── React catch-all (must be LAST) ──────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path and os.path.exists(os.path.join(REACT_BUILD_DIR, path)):
        return send_from_directory(REACT_BUILD_DIR, path)
    return send_from_directory(REACT_BUILD_DIR, 'index.html')


# ── Startup ─────────────────────────────────────────────────────────────────

def initialize():
    """Initialize all databases and load resources."""
    init_auth_db()
    init_sessions_db()
    attendance.init_db()
    lecture.init_lecture_db()

    # Scheduled lectures table
    try:
        conn = sqlite3.connect(attendance.DB_NAME)
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS scheduled_lectures(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER, section_id INTEGER, topic_id INTEGER,
            subject TEXT, title TEXT, scheduled_time TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 30, status TEXT DEFAULT 'pending',
            created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠ scheduled_lectures init: {e}")

    # Load faces
    if face_recognition_available:
        try:
            load_known_faces()
        except Exception as e:
            print(f"⚠ Face load failed: {e}")

    # Background scheduler for auto-starting scheduled lectures
    def _lecture_scheduler():
        while True:
            try:
                conn = sqlite3.connect(attendance.DB_NAME)
                cur = conn.cursor()
                now = datetime.now().isoformat()
                cur.execute('''SELECT id, class_id, section_id, topic_id, subject, title, scheduled_time, duration_minutes
                               FROM scheduled_lectures WHERE status='pending'
                               AND scheduled_time<=? AND scheduled_time>=datetime(?,'-1 minute')''', (now, now))
                for s in cur.fetchall():
                    cur.execute('''INSERT INTO lecture_sessions
                                   (class_id, section_id, topic_id, subject, title, start_time, status, created_by)
                                   VALUES (?,?,?,?,?,?,?,?)''',
                                (s[1], s[2], s[3], s[4], s[5], datetime.now().isoformat(), 'live', None))
                    lid = cur.lastrowid
                    cur.execute('UPDATE scheduled_lectures SET status=? WHERE id=?', ('started', s[0]))
                    conn.commit()
                    room = f"classroom:{s[1]}:{s[2]}" if s[2] else f"classroom:{s[1]}"
                    socketio.emit('lecture_started', {
                        'session_id': lid, 'title': s[5], 'subject': s[4],
                        'class_id': s[1], 'section_id': s[2], 'start_time': datetime.now().isoformat()
                    }, room=room)
                    print(f"📡 Auto-started lecture {s[0]} → session {lid}")
                conn.close()
            except Exception as e:
                print(f"Scheduler error: {e}")
            time.sleep(60)

    t = threading.Thread(target=_lecture_scheduler, daemon=True)
    t.start()
    print("✓ Lecture scheduler started")


if __name__ == '__main__':
    initialize()
    port = int(os.getenv('PORT', '5001'))
    print(f"🚀 Starting modular server on port {port}")
    print(f"📱 Open http://localhost:{port}")
    socketio.run(app, debug=True, use_reloader=False, host='0.0.0.0',
                 port=port, allow_unsafe_werkzeug=True)
