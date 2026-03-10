"""
Session Service — Teaching sessions, materials, lectures, attendance
Extracted from monolithic app.py for modularity.
"""

from flask import Blueprint, request, jsonify, session, Response
from backend.auth_service import login_required, teacher_required
from datetime import datetime
import sqlite3
import os
import json

session_bp = Blueprint('sessions', __name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'auth.db')
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _get_db():
    return sqlite3.connect(DB_PATH)


def init_sessions_db():
    conn = _get_db()
    cur = conn.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS teaching_sessions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_name TEXT NOT NULL, subject TEXT, class_name TEXT,
        teacher_id INTEGER, status TEXT DEFAULT 'created',
        start_time TEXT, duration INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, ended_at TEXT,
        end_time TEXT, description TEXT DEFAULT "",
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP, scheduled_time TEXT,
        FOREIGN KEY(teacher_id) REFERENCES users(id))''')
    cur.execute('''CREATE TABLE IF NOT EXISTS session_materials(
        id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER,
        filename TEXT, filepath TEXT, file_text TEXT,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        file_type TEXT DEFAULT "pdf", file_size INTEGER DEFAULT 0,
        processed BOOLEAN DEFAULT 0,
        FOREIGN KEY(session_id) REFERENCES teaching_sessions(id))''')
    cur.execute('''CREATE TABLE IF NOT EXISTS session_lectures(
        id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER,
        material_id INTEGER, title TEXT NOT NULL, content TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        source_file TEXT, generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES teaching_sessions(id),
        FOREIGN KEY(material_id) REFERENCES session_materials(id))''')
    cur.execute('''CREATE TABLE IF NOT EXISTS session_attendance(
        id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER,
        student_id INTEGER, status TEXT DEFAULT 'absent', marked_at TEXT,
        FOREIGN KEY(session_id) REFERENCES teaching_sessions(id),
        FOREIGN KEY(student_id) REFERENCES users(id))''')
    try:
        cur.execute('CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON teaching_sessions(teacher_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_sessions_status ON teaching_sessions(status)')
    except Exception:
        pass
    conn.commit()
    conn.close()


# ── Session CRUD ────────────────────────────────────────────────────────────

@session_bp.route('/api/sessions', methods=['GET'])
@login_required
def get_sessions():
    try:
        teacher_id = session.get('user_id')
        conn = _get_db()
        cur = conn.cursor()
        try:
            cur.execute('ALTER TABLE teaching_sessions ADD COLUMN scheduled_time TEXT')
            conn.commit()
        except Exception:
            pass
        cur.execute('''
            SELECT id, session_name, subject, class_name, status, start_time,
                   duration, created_at, ended_at, scheduled_time
            FROM teaching_sessions WHERE teacher_id = ? ORDER BY created_at DESC
        ''', (teacher_id,))
        rows = cur.fetchall()
        result = []
        for r in rows:
            sid = r[0]
            cur.execute('SELECT COUNT(*) FROM session_materials WHERE session_id=?', (sid,))
            mat = cur.fetchone()[0]
            try:
                cur.execute('SELECT COUNT(*) FROM session_lectures WHERE session_id=?', (sid,))
                lec = cur.fetchone()[0]
            except Exception:
                lec = 0
            try:
                cur.execute("SELECT COUNT(*), SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) FROM session_attendance WHERE session_id=?", (sid,))
                ar = cur.fetchone()
                att_total = ar[0] if ar else 0
                att_present = ar[1] if ar and ar[1] else 0
            except Exception:
                att_total = att_present = 0
            result.append({
                'id': sid, 'session_name': r[1], 'subject': r[2], 'class_name': r[3],
                'status': r[4], 'start_time': r[5], 'duration': r[6], 'created_at': r[7],
                'ended_at': r[8], 'scheduled_time': r[9], 'material_count': mat,
                'lecture_count': lec, 'attendance_total': att_total, 'attendance_present': att_present
            })
        conn.close()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions', methods=['POST'])
@login_required
def create_session():
    try:
        data = request.get_json()
        name = data.get('session_name')
        if not name:
            return jsonify({'success': False, 'message': 'Session name required'}), 400
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('INSERT INTO teaching_sessions (session_name, subject, class_name, teacher_id, status) VALUES (?,?,?,?,?)',
                    (name, data.get('subject', ''), data.get('class_name', ''), session.get('user_id'), 'created'))
        conn.commit()
        sid = cur.lastrowid
        conn.close()
        return jsonify({'success': True, 'message': 'Session created', 'data': {'id': sid, 'session_name': name}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/<int:sid>', methods=['DELETE'])
@login_required
def delete_session(sid):
    try:
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('DELETE FROM teaching_sessions WHERE id=? AND teacher_id=?', (sid, session.get('user_id')))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Session deleted'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/<int:sid>/schedule', methods=['POST'])
@login_required
def schedule_session(sid):
    try:
        data = request.get_json(force=True, silent=True) or {}
        scheduled_time = data.get('scheduled_time')
        if not scheduled_time:
            return jsonify({'success': False, 'message': 'scheduled_time required'}), 400
        conn = _get_db()
        cur = conn.cursor()
        try:
            cur.execute('ALTER TABLE teaching_sessions ADD COLUMN scheduled_time TEXT')
            conn.commit()
        except Exception:
            pass
        cur.execute('UPDATE teaching_sessions SET status=?, scheduled_time=? WHERE id=? AND teacher_id=?',
                    ('scheduled', scheduled_time, sid, session.get('user_id')))
        if cur.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'message': 'Not found'}), 404
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'Scheduled for {scheduled_time}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/<int:sid>/start', methods=['POST'])
@login_required
def start_session(sid):
    try:
        data = request.get_json(force=True, silent=True) or {}
        start_time = data.get('start_time', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        teacher_id = session.get('user_id')
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('UPDATE teaching_sessions SET status=?, start_time=? WHERE id=? AND teacher_id=?',
                    ('active', start_time, sid, teacher_id))
        if cur.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'message': 'Not found'}), 404
        cur.execute('SELECT class_name FROM teaching_sessions WHERE id=?', (sid,))
        rw = cur.fetchone()
        class_name = rw[0] if rw else None
        if class_name:
            cur.execute("SELECT id FROM users WHERE role='student' AND student_class=?", (class_name,))
        else:
            cur.execute("SELECT id FROM users WHERE role='student'")
        students = cur.fetchall()
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        for s in students:
            cur.execute('SELECT id FROM session_attendance WHERE session_id=? AND student_id=?', (sid, s[0]))
            if not cur.fetchone():
                cur.execute('INSERT INTO session_attendance (session_id, student_id, status, marked_at) VALUES (?,?,?,?)',
                            (sid, s[0], 'absent', now))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Session started', 'student_count': len(students)})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/<int:sid>/end', methods=['POST'])
@login_required
def end_session(sid):
    try:
        ended_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('UPDATE teaching_sessions SET status=?, ended_at=? WHERE id=? AND teacher_id=?',
                    ('completed', ended_at, sid, session.get('user_id')))
        if cur.rowcount == 0:
            conn.close()
            return jsonify({'success': False, 'message': 'Not found'}), 404
        cur.execute("SELECT COUNT(*), SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) FROM session_attendance WHERE session_id=?", (sid,))
        ar = cur.fetchone()
        total = ar[0] if ar else 0
        present = ar[1] if ar else 0
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Session ended',
                        'attendance_summary': {'total': total, 'present': present, 'absent': total - present}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/active', methods=['GET'])
@login_required
def get_active_sessions():
    try:
        conn = _get_db()
        cur = conn.cursor()
        try:
            cur.execute('ALTER TABLE teaching_sessions ADD COLUMN scheduled_time TEXT')
            conn.commit()
        except Exception:
            pass
        cur.execute('''
            SELECT ts.id, ts.session_name, ts.subject, ts.class_name, ts.status,
                   ts.start_time, ts.duration, ts.created_at, u.username, ts.scheduled_time
            FROM teaching_sessions ts JOIN users u ON ts.teacher_id=u.id
            WHERE ts.status IN ('active','scheduled','created')
            ORDER BY CASE ts.status WHEN 'active' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
                     ts.scheduled_time ASC, ts.created_at DESC
        ''')
        rows = cur.fetchall()
        result = []
        for r in rows:
            try:
                cur.execute('SELECT COUNT(*) FROM session_lectures WHERE session_id=?', (r[0],))
                lec = cur.fetchone()[0]
            except Exception:
                lec = 0
            result.append({
                'id': r[0], 'session_name': r[1], 'subject': r[2], 'class_name': r[3],
                'status': r[4], 'start_time': r[5], 'duration': r[6], 'created_at': r[7],
                'teacher_name': r[8], 'scheduled_time': r[9], 'lecture_count': lec
            })
        conn.close()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/completed', methods=['GET'])
@login_required
def get_completed_sessions():
    try:
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('''
            SELECT ts.id, ts.session_name, ts.subject, ts.class_name, ts.status,
                   ts.start_time, ts.duration, ts.created_at, ts.ended_at, u.username
            FROM teaching_sessions ts JOIN users u ON ts.teacher_id=u.id
            WHERE ts.status='completed' ORDER BY ts.ended_at DESC
        ''')
        rows = cur.fetchall()
        result = []
        for r in rows:
            try:
                cur.execute('SELECT COUNT(*) FROM session_lectures WHERE session_id=?', (r[0],))
                lec = cur.fetchone()[0]
            except Exception:
                lec = 0
            result.append({
                'id': r[0], 'session_name': r[1], 'subject': r[2], 'class_name': r[3],
                'status': r[4], 'start_time': r[5], 'duration': r[6], 'created_at': r[7],
                'ended_at': r[8], 'teacher_name': r[9], 'lecture_count': lec
            })
        conn.close()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Attendance ──────────────────────────────────────────────────────────────

@session_bp.route('/api/sessions/<int:sid>/attendance', methods=['GET'])
@login_required
def get_session_attendance(sid):
    try:
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('''
            SELECT sa.student_id, u.username, sa.status, sa.marked_at
            FROM session_attendance sa JOIN users u ON sa.student_id=u.id
            WHERE sa.session_id=? ORDER BY u.username
        ''', (sid,))
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [
            {'id': r[0], 'student_name': r[1], 'status': r[2], 'marked_at': r[3]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/<int:sid>/attendance', methods=['POST'])
@login_required
def mark_session_attendance(sid):
    try:
        data = request.get_json(force=True, silent=True) or {}
        student_ids = data.get('student_ids', [])
        status = data.get('status', 'present')
        now = datetime.now().strftime('%Y-%m-%d %H:%M')
        conn = _get_db()
        cur = conn.cursor()
        for student_id in student_ids:
            cur.execute('SELECT id FROM session_attendance WHERE session_id=? AND student_id=?', (sid, student_id))
            if cur.fetchone():
                cur.execute('UPDATE session_attendance SET status=?, marked_at=? WHERE session_id=? AND student_id=?',
                            (status, now, sid, student_id))
            else:
                cur.execute('INSERT INTO session_attendance (session_id, student_id, status, marked_at) VALUES (?,?,?,?)',
                            (sid, student_id, status, now))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Attendance marked'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/student/session-attendance', methods=['GET'])
@login_required
def get_student_session_attendance():
    try:
        student_id = session.get('user_id')
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('''
            SELECT ts.id, ts.session_name, ts.subject, ts.class_name,
                   sa.status, sa.marked_at, ts.start_time, u.username
            FROM session_attendance sa JOIN teaching_sessions ts ON sa.session_id=ts.id
            JOIN users u ON ts.teacher_id=u.id
            WHERE sa.student_id=? ORDER BY ts.start_time DESC
        ''', (student_id,))
        rows = cur.fetchall()
        conn.close()
        records = [{'session_id': r[0], 'session_name': r[1], 'subject': r[2], 'class_name': r[3],
                     'status': r[4], 'marked_at': r[5], 'start_time': r[6], 'teacher_name': r[7]} for r in rows]
        attended = [r for r in records if r['status'] == 'present']
        return jsonify({'success': True, 'data': {
            'records': records, 'attended': attended,
            'absent': [r for r in records if r['status'] != 'present'],
            'total': len(records), 'present_count': len(attended),
            'absent_count': len(records) - len(attended),
            'percentage': round(len(attended) / len(records) * 100, 1) if records else 0
        }})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Materials ───────────────────────────────────────────────────────────────

@session_bp.route('/api/sessions/<int:sid>/materials', methods=['GET'])
@login_required
def get_session_materials(sid):
    try:
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('SELECT id, filename, filepath, uploaded_at FROM session_materials WHERE session_id=? ORDER BY uploaded_at DESC', (sid,))
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [
            {'id': r[0], 'filename': r[1], 'filepath': r[2], 'uploaded_at': r[3]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/<int:sid>/materials/upload', methods=['POST'])
@login_required
def upload_session_materials(sid):
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
        f = request.files['file']
        if not f.filename:
            return jsonify({'success': False, 'message': 'Empty filename'}), 400
        safe_name = f.filename.replace(' ', '_')
        session_dir = os.path.join(UPLOAD_DIR, str(sid))
        os.makedirs(session_dir, exist_ok=True)
        fpath = os.path.join(session_dir, safe_name)
        f.save(fpath)
        file_size = os.path.getsize(fpath)
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('INSERT INTO session_materials (session_id, filename, filepath, file_type, file_size) VALUES (?,?,?,?,?)',
                    (sid, f.filename, fpath, 'pdf', file_size))
        conn.commit()
        mid = cur.lastrowid
        conn.close()
        return jsonify({'success': True, 'message': 'Material uploaded', 'data': {'id': mid, 'filename': f.filename}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/sessions/<int:sid>/materials/<int:mid>', methods=['DELETE'])
@login_required
def delete_session_material(sid, mid):
    try:
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('SELECT filepath FROM session_materials WHERE id=? AND session_id=?', (mid, sid))
        row = cur.fetchone()
        if row and row[0] and os.path.exists(row[0]):
            os.remove(row[0])
        cur.execute('DELETE FROM session_materials WHERE id=? AND session_id=?', (mid, sid))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Material deleted'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Lectures ────────────────────────────────────────────────────────────────

@session_bp.route('/api/sessions/<int:sid>/lectures', methods=['GET'])
@login_required
def get_session_lectures(sid):
    try:
        conn = _get_db()
        cur = conn.cursor()
        cur.execute('SELECT id, title, content, order_index, created_at FROM session_lectures WHERE session_id=? ORDER BY order_index', (sid,))
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [
            {'id': r[0], 'title': r[1], 'content': r[2], 'order_index': r[3], 'created_at': r[4]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Timetable ───────────────────────────────────────────────────────────────

@session_bp.route('/api/teacher/timetable', methods=['GET'])
@login_required
def get_teacher_timetable():
    try:
        teacher_id = session.get('user_id')
        conn = sqlite3.connect(os.path.join(os.path.dirname(DB_PATH), 'attendance.db'))
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS timetable_entries(
            id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER,
            day_of_week TEXT, start_time TEXT, end_time TEXT,
            subject TEXT, class_name TEXT, room TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')
        conn.commit()
        cur.execute('SELECT * FROM timetable_entries WHERE teacher_id=? ORDER BY day_of_week, start_time', (teacher_id,))
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        conn.close()
        return jsonify({'success': True, 'data': [dict(zip(cols, r)) for r in rows]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/teacher/timetable', methods=['POST'])
@login_required
def create_timetable_entry():
    try:
        data = request.get_json()
        teacher_id = session.get('user_id')
        conn = sqlite3.connect(os.path.join(os.path.dirname(DB_PATH), 'attendance.db'))
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS timetable_entries(
            id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER,
            day_of_week TEXT, start_time TEXT, end_time TEXT,
            subject TEXT, class_name TEXT, room TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')
        cur.execute('INSERT INTO timetable_entries (teacher_id, day_of_week, start_time, end_time, subject, class_name, room) VALUES (?,?,?,?,?,?,?)',
                    (teacher_id, data.get('day_of_week'), data.get('start_time'), data.get('end_time'),
                     data.get('subject'), data.get('class_name'), data.get('room', '')))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Entry created'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@session_bp.route('/api/student/timetable', methods=['GET'])
@login_required
def get_student_timetable():
    try:
        student_class = session.get('student_class')
        conn = sqlite3.connect(os.path.join(os.path.dirname(DB_PATH), 'attendance.db'))
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS timetable_entries(
            id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER,
            day_of_week TEXT, start_time TEXT, end_time TEXT,
            subject TEXT, class_name TEXT, room TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP)''')
        conn.commit()
        if student_class:
            cur.execute('SELECT * FROM timetable_entries WHERE class_name=? ORDER BY day_of_week, start_time', (student_class,))
        else:
            cur.execute('SELECT * FROM timetable_entries ORDER BY day_of_week, start_time')
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        conn.close()
        return jsonify({'success': True, 'data': [dict(zip(cols, r)) for r in rows]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Notifications ───────────────────────────────────────────────────────────

@session_bp.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    try:
        user_id = session.get('user_id')
        conn = sqlite3.connect(os.path.join(os.path.dirname(DB_PATH), 'attendance.db'))
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS notifications(
            id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, message TEXT,
            type TEXT DEFAULT 'info', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            target_role TEXT, target_class TEXT)''')
        cur.execute('''CREATE TABLE IF NOT EXISTS user_notifications(
            id INTEGER PRIMARY KEY AUTOINCREMENT, notification_id INTEGER, user_id INTEGER,
            is_read BOOLEAN DEFAULT 0, read_at TEXT)''')
        conn.commit()
        role = session.get('role', 'student')
        student_class = session.get('student_class')
        cur.execute('''
            SELECT n.id, n.title, n.message, n.type, n.created_at,
                   COALESCE(un.is_read, 0) as is_read
            FROM notifications n
            LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = ?
            WHERE (n.target_role IS NULL OR n.target_role = ?)
            AND (n.target_class IS NULL OR n.target_class = ?)
            ORDER BY n.created_at DESC LIMIT 50
        ''', (user_id, role, student_class))
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [
            {'id': r[0], 'title': r[1], 'message': r[2], 'type': r[3], 'created_at': r[4], 'is_read': bool(r[5])} for r in rows
        ]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
