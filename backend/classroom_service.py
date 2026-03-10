"""
Classroom Service — Dashboard, student endpoints, attendance views, reports,
legacy student CRUD (attendance.db), cameras, lecture management, SocketIO events.
Extracted from monolithic app.py for modularity.
"""

from flask import Blueprint, request, jsonify, session, send_from_directory
from backend.auth_service import login_required, teacher_required
from datetime import datetime
import sqlite3
import os
import json

classroom_bp = Blueprint('classroom', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REACT_BUILD_DIR = os.path.join(BASE_DIR, 'frontend', 'build')

# Lazy-loaded refs (set by orchestrator)
attendance_module = None
lecture_module = None
emotion_detector = None
get_available_cameras = None  # function from app.py


def init_classroom_service(*, att=None, lec=None, ed=None, cam_fn=None):
    global attendance_module, lecture_module, emotion_detector, get_available_cameras
    attendance_module = att
    lecture_module = lec
    emotion_detector = ed
    get_available_cameras = cam_fn


# ── Dashboard ───────────────────────────────────────────────────────────────

@classroom_bp.route('/api/dashboard')
@login_required
def dashboard():
    try:
        att_data = attendance_module.calculate_attendance_percentage()
        students = attendance_module.list_students()
        today = datetime.now().strftime('%Y-%m-%d')
        today_attendance = []
        for s in students:
            conn = sqlite3.connect(attendance_module.DB_NAME)
            cur = conn.cursor()
            cur.execute('SELECT status FROM attendance WHERE student_id=? AND date=? ORDER BY id DESC LIMIT 1', (s[0], today))
            r = cur.fetchone()
            today_attendance.append({'id': s[0], 'roll_number': s[1], 'name': s[2], 'status': r[0] if r else 'Absent'})
            conn.close()
        return jsonify({'success': True, 'data': {'attendance_data': att_data, 'today_attendance': today_attendance, 'total_students': len(students)}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Student endpoints ───────────────────────────────────────────────────────

@classroom_bp.route('/api/student/attendance', methods=['GET'])
@login_required
def get_student_attendance():
    try:
        username = session.get('username')
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute('SELECT id, name FROM students WHERE name=?', (username,))
        student = cur.fetchone()
        if not student:
            conn.close()
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        cur.execute('SELECT date, status, timestamp FROM attendance WHERE student_id=? ORDER BY date DESC', (student[0],))
        records = cur.fetchall()
        conn.close()
        total = len(records)
        present = sum(1 for r in records if r[1] == 'Present')
        return jsonify({'success': True, 'data': {
            'records': [{'date': r[0], 'status': r[1], 'timestamp': r[2]} for r in records],
            'statistics': {'total_days': total, 'present_days': present, 'absent_days': total - present,
                           'attendance_percentage': round(present / total * 100, 2) if total else 0}}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/student/materials', methods=['GET'])
@login_required
def get_student_materials():
    try:
        sc = session.get('student_class')
        if not sc:
            return jsonify({'success': False, 'message': 'Student class not set'}), 400
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute("SELECT id, subject, filename, upload_date, total_topics FROM materials WHERE class_id=? AND processing_status='completed' ORDER BY upload_date DESC", (sc,))
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [{'id': r[0], 'subject': r[1], 'filename': r[2], 'upload_date': r[3], 'total_topics': r[4]} for r in rows]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/student/performance', methods=['GET'])
@login_required
def get_student_performance():
    try:
        return jsonify({'success': True, 'data': {'student_name': session.get('username'),
                        'attentiveness_average': 0, 'lectures_attended': 0,
                        'message': 'Performance tracking available after attending lectures'}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/student/lectures', methods=['GET'])
@login_required
def get_student_lectures():
    try:
        sc = session.get('student_class')
        username = session.get('username')
        if not sc:
            return jsonify({'success': False, 'message': 'Student class not set'}), 400
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute('SELECT id FROM students WHERE name=?', (username,))
        st = cur.fetchone()
        sid = st[0] if st else None
        cur.execute('''SELECT ls.id, ls.subject, ls.title, ls.start_time, ls.end_time, ls.duration_minutes, ls.status,
                       slp.attentiveness_percentage
                       FROM lecture_sessions ls
                       LEFT JOIN student_lecture_participation slp ON ls.id=slp.lecture_session_id AND slp.student_id=?
                       WHERE ls.class_id=? ORDER BY ls.start_time DESC''', (sid, sc))
        rows = cur.fetchall()
        conn.close()
        result = [{'id': r[0], 'subject': r[1], 'title': r[2], 'start_time': r[3], 'end_time': r[4],
                   'duration_minutes': r[5], 'status': r[6], 'my_attentiveness': r[7]} for r in rows]
        now = datetime.now().isoformat()
        upcoming = [l for l in result if l['status'] in ('scheduled', 'live') or (l['start_time'] and l['start_time'] > now)]
        past = [l for l in result if l['status'] == 'completed' or (l['end_time'] and l['end_time'] < now)]
        return jsonify({'success': True, 'data': {'upcoming': upcoming, 'past': past, 'total': len(result)}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/student/live-lectures', methods=['GET'])
@login_required
def get_live_lectures():
    try:
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute("SELECT id, class_id, section_id, topic_id, subject, title, start_time, status FROM lecture_sessions WHERE status='live' ORDER BY start_time DESC")
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [
            {'id': r[0], 'class_id': r[1], 'section_id': r[2], 'topic_id': r[3],
             'subject': r[4], 'title': r[5], 'start_time': r[6], 'status': r[7]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Teacher attendance logs ─────────────────────────────────────────────────

@classroom_bp.route('/api/teacher/attendance-logs', methods=['GET'])
@login_required
def get_teacher_attendance_logs():
    try:
        class_name = request.args.get('class_name', '')
        sess_id = request.args.get('session_id', '')
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'auth.db'))
        cur = conn.cursor()
        q = '''SELECT sa.id, u.username, sa.status, sa.marked_at, ts.session_name, ts.class_name, ts.subject
               FROM session_attendance sa JOIN users u ON sa.student_id=u.id
               JOIN teaching_sessions ts ON sa.session_id=ts.id WHERE 1=1'''
        params = []
        if class_name:
            q += ' AND ts.class_name=?'
            params.append(class_name)
        if sess_id:
            q += ' AND sa.session_id=?'
            params.append(int(sess_id))
        q += ' ORDER BY ts.start_time DESC, u.username'
        cur.execute(q, params)
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [
            {'id': r[0], 'student_name': r[1], 'status': r[2], 'marked_at': r[3],
             'session_name': r[4], 'class_name': r[5], 'subject': r[6]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Legacy students/attendance (attendance.db) ──────────────────────────────

@classroom_bp.route('/api/students', methods=['GET'])
@login_required
def list_students():
    try:
        class_id = request.args.get('class_id')
        section_id = request.args.get('section_id')
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        if class_id and section_id:
            cur.execute('''SELECT s.id, s.roll_number, s.name, s.age, c.name, sec.name
                           FROM students s LEFT JOIN classes c ON s.class_id=c.id LEFT JOIN sections sec ON s.section_id=sec.id
                           WHERE s.class_id=? AND s.section_id=? ORDER BY s.roll_number''', (class_id, section_id))
        elif class_id:
            cur.execute('''SELECT s.id, s.roll_number, s.name, s.age, c.name, sec.name
                           FROM students s LEFT JOIN classes c ON s.class_id=c.id LEFT JOIN sections sec ON s.section_id=sec.id
                           WHERE s.class_id=? ORDER BY s.roll_number''', (class_id,))
        else:
            cur.execute('''SELECT s.id, s.roll_number, s.name, s.age, c.name, sec.name
                           FROM students s LEFT JOIN classes c ON s.class_id=c.id LEFT JOIN sections sec ON s.section_id=sec.id
                           ORDER BY s.roll_number''')
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': rows})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/students', methods=['POST'])
@teacher_required
def add_student():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON'}), 400
        name = data.get('name')
        roll = data.get('roll_number')
        age = data.get('age')
        class_id = data.get('class_id')
        section_id = data.get('section_id')
        images = data.get('images', [])
        if not name or not roll or not class_id or not section_id:
            return jsonify({'success': False, 'message': 'Name, Roll, Class, Section required'}), 400
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute('SELECT id FROM students WHERE roll_number=?', (roll,))
        if cur.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': f'Roll {roll} exists'}), 400
        cur.execute('INSERT INTO students (roll_number, name, class_id, section_id, age) VALUES (?,?,?,?,?)',
                    (roll, name, class_id, section_id, age))
        cur.execute('SELECT grade, name FROM classes WHERE id=?', (class_id,))
        cr = cur.fetchone()
        class_name = f"Class {cr[0]}" if cr else "Class"
        cur.execute('SELECT name FROM sections WHERE id=?', (section_id,))
        sr = cur.fetchone()
        section_name = sr[0] if sr else "A"
        conn.commit()
        conn.close()
        if images:
            safe_c = "".join(c for c in class_name if c.isalnum() or c in ' -_').strip()
            safe_s = "".join(c for c in section_name if c.isalnum() or c in ' -_').strip()
            safe_n = "".join(c for c in name if c.isalnum() or c in ' -_').strip()
            target = os.path.join(BASE_DIR, 'faces', safe_c, safe_s, safe_n)
            os.makedirs(target, exist_ok=True)
            import base64 as b64
            for i, img_data in enumerate(images):
                try:
                    if ',' in img_data:
                        img_data = img_data.split(',')[1]
                    with open(os.path.join(target, f"{safe_n}_{i+1}.jpg"), "wb") as f:
                        f.write(b64.b64decode(img_data))
                except Exception:
                    pass
            # Reload face encodings
            try:
                from backend.face_service import _load_known_faces
                _load_known_faces()
            except Exception:
                pass
        return jsonify({'success': True, 'message': 'Student added'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/students/<int:sid>', methods=['PUT'])
@login_required
def update_student(sid):
    try:
        data = request.get_json()
        conn = sqlite3.connect(attendance_module.DB_NAME)
        conn.cursor().execute('UPDATE students SET roll_number=?, name=? WHERE id=?',
                              (data.get('roll_number'), data.get('name'), sid))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Updated'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/students/<int:sid>', methods=['DELETE'])
@login_required
def delete_student(sid):
    try:
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute('DELETE FROM attendance WHERE student_id=?', (sid,))
        cur.execute('DELETE FROM students WHERE id=?', (sid,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Deleted'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Attendance views ────────────────────────────────────────────────────────

@classroom_bp.route('/api/attendance')
@login_required
def attendance_page():
    try:
        class_id = request.args.get('class_id')
        section_id = request.args.get('section_id')
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        if class_id and section_id:
            cur.execute('''SELECT s.roll_number, s.name, COALESCE(a.status,'Absent'), a.date
                           FROM students s LEFT JOIN attendance a ON s.id=a.student_id AND a.date=?
                           WHERE s.class_id=? AND s.section_id=?''', (date, class_id, section_id))
        else:
            cur.execute('''SELECT s.roll_number, s.name, a.status, a.date
                           FROM attendance a JOIN students s ON a.student_id=s.id WHERE a.date=?''', (date,))
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [
            {'roll_number': r[0], 'student_name': r[1], 'status': r[2], 'date': r[3] or date} for r in rows]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/attendance/today')
@login_required
def get_today_attendance():
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        students = attendance_module.list_students()
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        data = []
        for sid, roll, name in students:
            cur.execute('SELECT status FROM attendance WHERE student_id=? AND date=? ORDER BY id DESC LIMIT 1', (sid, today))
            r = cur.fetchone()
            data.append({'id': sid, 'roll_number': roll, 'name': name, 'status': r[0] if r else 'Absent'})
        data.sort(key=lambda x: x['name'].lower())
        conn.close()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/mark_attendance', methods=['POST'])
@login_required
def mark_attendance():
    try:
        name = (request.get_json() or {}).get('name')
        result = attendance_module.mark_attendance(name)
        return jsonify({'success': result, 'message': 'Attendance marked' if result else 'Failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Reports ─────────────────────────────────────────────────────────────────

@classroom_bp.route('/api/reports')
@login_required
def reports():
    try:
        att_data = attendance_module.calculate_attendance_percentage()
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute('SELECT a.date, a.time, s.name, a.status FROM attendance a LEFT JOIN students s ON a.student_id=s.id ORDER BY a.date DESC, a.time DESC LIMIT 50')
        recent = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': {'attendance_data': att_data, 'recent_records': recent}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/export_csv')
@login_required
def export_csv():
    try:
        path = attendance_module.export_to_csv()
        if path:
            return jsonify({'success': True, 'file': path})
        return jsonify({'success': False, 'message': 'Export failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/cameras', methods=['GET'])
@login_required
def list_cameras():
    try:
        cams = get_available_cameras() if get_available_cameras else []
        return jsonify({'success': True, 'cameras': cams, 'count': len(cams)})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Lecture management (non-AI) ─────────────────────────────────────────────

@classroom_bp.route('/api/lectures/start', methods=['POST'])
@login_required
def start_lecture():
    try:
        data = request.get_json()
        sid = lecture_module.create_lecture_session(
            subject=data.get('subject', 'Biology'), chapter=data.get('chapter', 'Chapter 1'),
            title=data.get('title'), checkpoint_interval=data.get('checkpoint_interval', 300))
        if sid:
            return jsonify({'success': True, 'session_id': sid, 'message': 'Lecture started'})
        return jsonify({'success': False, 'message': 'Failed'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/lectures/end', methods=['POST'])
@login_required
def end_lecture():
    try:
        data = request.get_json()
        sid = data.get('session_id')
        if not sid:
            active = lecture_module.get_active_lecture_session()
            sid = active['id'] if active else None
        if not sid:
            return jsonify({'success': False, 'message': 'No active session'}), 404
        result = lecture_module.end_lecture_session(sid)
        return jsonify({'success': result, 'message': 'Lecture ended' if result else 'Failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/lectures/current')
@login_required
def get_current_lecture():
    try:
        active = lecture_module.get_active_lecture_session()
        if active:
            return jsonify({'success': True, 'data': active})
        return jsonify({'success': False, 'message': 'No active session'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/lectures/progress', methods=['POST'])
@login_required
def update_lecture_progress():
    try:
        data = request.get_json()
        sid = data.get('session_id')
        if not sid:
            active = lecture_module.get_active_lecture_session()
            sid = active['id'] if active else None
        if not sid:
            return jsonify({'success': False, 'message': 'No active session'}), 404
        result = lecture_module.update_lecture_progress(sid, data.get('current_section', 0), data.get('total_sections'))
        return jsonify({'success': result, 'message': 'Updated' if result else 'Failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/lectures/attendance/checkpoint', methods=['POST'])
@login_required
def record_checkpoint_attendance():
    try:
        data = request.get_json()
        sid = data.get('session_id')
        student_id = data.get('student_id')
        if not sid or not student_id:
            return jsonify({'success': False, 'message': 'session_id and student_id required'}), 400
        result = lecture_module.record_lecture_attendance(
            session_id=sid, student_id=student_id,
            checkpoint_number=data.get('checkpoint_number', 1),
            status=data.get('status', 'Present'),
            recognition_method=data.get('recognition_method', 'manual'))
        return jsonify({'success': result, 'message': 'Recorded' if result else 'Failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/lectures/attendance/<int:session_id>')
@login_required
def get_lecture_attendance(session_id):
    try:
        att = lecture_module.get_lecture_attendance(session_id)
        summary = lecture_module.get_attendance_summary(session_id)
        return jsonify({'success': True, 'data': {'attendance': att, 'summary': summary}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@classroom_bp.route('/api/lectures/attendance/override', methods=['POST'])
@login_required
def override_attendance():
    try:
        data = request.get_json()
        if not all([data.get('session_id'), data.get('student_id'), data.get('checkpoint_number'), data.get('status')]):
            return jsonify({'success': False, 'message': 'Missing fields'}), 400
        result = lecture_module.override_lecture_attendance(
            session_id=data['session_id'], student_id=data['student_id'],
            checkpoint_number=data['checkpoint_number'], status=data['status'], notes=data.get('notes'))
        return jsonify({'success': result, 'message': 'Overridden' if result else 'Failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Health check ────────────────────────────────────────────────────────────

@classroom_bp.route('/api/health', methods=['GET'])
def health_check():
    face_ready = False
    try:
        if emotion_detector and hasattr(emotion_detector, 'known_face_names'):
            face_ready = len(emotion_detector.known_face_names) > 0
    except Exception:
        pass
    return jsonify({
        'status': 'online',
        'face_recognition_ready': face_ready,
        'timestamp': datetime.now().isoformat()
    })


# ── Senku UI serving ────────────────────────────────────────────────────────

@classroom_bp.route('/senku-ui')
def senku_ui():
    return send_from_directory(os.path.join(BASE_DIR, 'static', 'senku'), 'index.html')


@classroom_bp.route('/senku-ui/<path:filename>')
def senku_static(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'static', 'senku'), filename)
