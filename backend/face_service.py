"""
Face Service — Face recognition, attendance marking, student/face management
Extracted from monolithic app.py for modularity.
"""

from flask import Blueprint, request, jsonify, session
from backend.auth_service import login_required, teacher_required
from datetime import datetime
from werkzeug.security import generate_password_hash
import sqlite3
import os
import base64
import json

face_bp = Blueprint('face', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACES_DIR = os.path.join(BASE_DIR, 'faces')

# Lazy-loaded refs (set by orchestrator)
face_recognition = None
face_recognition_available = False
emotion_detector = None
attendance_module = None
cv2_mod = None
np_mod = None
Image_mod = None
io_mod = None


def init_face_service(*, fr=None, fr_available=False, ed=None, att=None, cv2=None, np=None, pil_image=None, io=None):
    global face_recognition, face_recognition_available, emotion_detector, attendance_module
    global cv2_mod, np_mod, Image_mod, io_mod
    face_recognition = fr
    face_recognition_available = fr_available
    emotion_detector = ed
    attendance_module = att
    cv2_mod = cv2
    np_mod = np
    Image_mod = pil_image
    io_mod = io


def face_confidence(face_distance, face_match_threshold=0.50):
    distance_range = (1.0 - face_match_threshold)
    linear = (1.0 - face_distance) / distance_range
    value = max(0, min(1, linear))
    return f"{round(value * 100, 2)}%"


def _load_known_faces():
    """Reload face encodings from the faces directory."""
    if not face_recognition_available or not face_recognition:
        return 0, []
    encodings = []
    names = []
    for root, dirs, files in os.walk(FACES_DIR):
        for fn in files:
            if fn.lower().endswith(('.jpg', '.jpeg', '.png')):
                path = os.path.join(root, fn)
                try:
                    img = face_recognition.load_image_file(path)
                    encs = face_recognition.face_encodings(img)
                    if encs:
                        # Folder name = person name
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
    return len(encodings), list(set(names))


# ── Routes ──────────────────────────────────────────────────────────────────

@face_bp.route('/api/faces/reload', methods=['POST'])
@login_required
def reload_faces():
    try:
        count, people = _load_known_faces()
        return jsonify({'success': True, 'message': f'Reloaded {count} face encodings', 'count': count, 'people': people})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/faces/status', methods=['GET'])
@login_required
def get_faces_status():
    try:
        names = emotion_detector.known_face_names if emotion_detector and hasattr(emotion_detector, 'known_face_names') else []
        enc_len = len(emotion_detector.known_face_encodings) if emotion_detector and hasattr(emotion_detector, 'known_face_encodings') else 0
        return jsonify({'success': True, 'total_encodings': enc_len, 'unique_people': len(set(names)), 'people': list(set(names))})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/faces/students', methods=['GET'])
@login_required
def get_students_from_faces():
    try:
        if not os.path.exists(FACES_DIR):
            return jsonify({'success': True, 'data': []})
        student_names = sorted([d for d in os.listdir(FACES_DIR) if os.path.isdir(os.path.join(FACES_DIR, d))], key=str.lower)
        today = datetime.now().strftime('%Y-%m-%d')
        conn = sqlite3.connect(attendance_module.DB_NAME) if attendance_module else None
        result = []
        for name in student_names:
            status, att_time = 'Absent', None
            if conn and attendance_module:
                student = attendance_module._get_student_by_name(name)
                if student:
                    cur = conn.cursor()
                    cur.execute('SELECT status, time FROM attendance WHERE student_id=? AND date=? ORDER BY id DESC LIMIT 1', (student[0], today))
                    row = cur.fetchone()
                    if row:
                        status, att_time = row[0], row[1]
            result.append({'name': name, 'status': status, 'attendance_time': att_time})
        if conn:
            conn.close()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/recognize_faces', methods=['POST'])
@login_required
def recognize_faces():
    try:
        data = request.get_json()
        image_data = data.get('image')
        if not image_data:
            return jsonify({'success': False, 'message': 'No image data'}), 400
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        image = Image_mod.open(io_mod.BytesIO(image_bytes))
        rgb_image = np_mod.array(image)
        if len(rgb_image.shape) == 2:
            rgb_image = cv2_mod.cvtColor(rgb_image, cv2_mod.COLOR_GRAY2RGB)
        elif rgb_image.shape[2] == 4:
            rgb_image = cv2_mod.cvtColor(rgb_image, cv2_mod.COLOR_RGBA2RGB)
        h, w = rgb_image.shape[:2]
        if w > 1280:
            scale = 1280 / w
            rgb_image = cv2_mod.resize(rgb_image, (1280, int(h * scale)))
        face_locations = face_recognition.face_locations(rgb_image, model='hog', number_of_times_to_upsample=1)
        if not face_locations:
            return jsonify({'success': True, 'faces': [], 'count': 0, 'message': 'No faces detected'})
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations[:15], num_jitters=1)
        known_enc = emotion_detector.known_face_encodings if emotion_detector else []
        known_names = emotion_detector.known_face_names if emotion_detector else []
        recognized = []
        for enc, loc in zip(face_encodings, face_locations[:15]):
            name, confidence = "Unknown", "0%"
            if known_enc:
                dists = face_recognition.face_distance(known_enc, enc)
                idx = np_mod.argmin(dists)
                if dists[idx] < 0.50:
                    person = known_names[idx]
                    pdists = [dists[i] for i, n in enumerate(known_names) if n == person]
                    best = min(pdists) if pdists else dists[idx]
                    conf = face_confidence(best)
                    try:
                        if float(conf.replace('%', '')) >= 70:
                            name, confidence = person, conf
                    except Exception:
                        pass
            top, right, bottom, left = loc
            recognized.append({'name': name, 'confidence': confidence,
                               'location': {'x': int(left), 'y': int(top), 'width': int(right - left), 'height': int(bottom - top)}})
        return jsonify({'success': True, 'faces': recognized, 'count': len(recognized)})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/mark_multiple_attendance', methods=['POST'])
@login_required
def mark_multiple_attendance():
    try:
        names = (request.get_json() or {}).get('names', [])
        if not names:
            return jsonify({'success': False, 'message': 'No names'}), 400
        results = [{'name': n, 'success': attendance_module.mark_attendance(n)} for n in names if n and n != "Unknown"]
        return jsonify({'success': True, 'results': results, 'message': f'Processed {len(results)} records'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/mark_attendance_batch', methods=['POST'])
@login_required
def mark_attendance_batch():
    try:
        data = request.get_json()
        name = data.get('name')
        status = data.get('status', 'Present')
        if not name:
            return jsonify({'success': False, 'message': 'Student name required'}), 400
        student = attendance_module._get_student_by_name(name)
        if not student:
            faces_path = os.path.join(FACES_DIR, name)
            if os.path.exists(faces_path) and os.path.isdir(faces_path):
                roll = name.replace(' ', '_').upper()
                attendance_module.add_student(roll_number=roll, name=name)
                student = attendance_module._get_student_by_name(name)
        if not student:
            return jsonify({'success': False, 'message': f'{name} not found'}), 404
        now = datetime.now()
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute('DELETE FROM attendance WHERE student_id=? AND date=?', (student[0], now.strftime('%Y-%m-%d')))
        cur.execute('INSERT INTO attendance (student_id, date, time, status) VALUES (?,?,?,?)',
                    (student[0], now.strftime('%Y-%m-%d'), now.strftime('%H:%M:%S'), status))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'Marked {status} for {name}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/attendance/bulk', methods=['POST'])
@teacher_required
def mark_bulk_attendance():
    try:
        data = request.get_json()
        records = data.get('attendance', [])
        class_id = data.get('class_id')
        section_id = data.get('section_id')
        date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        time_str = datetime.now().strftime('%H:%M:%S')
        if not class_id or not section_id:
            return jsonify({'success': False, 'message': 'Class and Section required'}), 400
        conn = sqlite3.connect(attendance_module.DB_NAME)
        cur = conn.cursor()
        cur.execute('SELECT id, name FROM students WHERE class_id=? AND section_id=?', (class_id, section_id))
        all_students = cur.fetchall()
        if not all_students:
            conn.close()
            return jsonify({'success': False, 'message': 'No students in this class/section'}), 404
        present_names = {r.get('name') for r in records if r.get('status') == 'Present'}
        present_list, absent_list = [], []
        for sid, sname in all_students:
            status = 'Present' if sname in present_names else 'Absent'
            cur.execute('DELETE FROM attendance WHERE student_id=? AND date=?', (sid, date_str))
            cur.execute('INSERT INTO attendance (student_id, date, time, status, class_id, section_id) VALUES (?,?,?,?,?,?)',
                        (sid, date_str, time_str, status, class_id, section_id))
            (present_list if status == 'Present' else absent_list).append(sname)
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'Attendance marked for {date_str}',
                        'marked': len(all_students), 'details': {'present': present_list, 'absent': absent_list}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/lectures/attendance/background', methods=['POST'])
@login_required
def background_attendance_check():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        checkpoint = data.get('checkpoint_number', 1)
        image_data = data.get('image')
        if not session_id or not image_data:
            return jsonify({'success': False, 'message': 'session_id and image required'}), 400
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        image = Image_mod.open(io_mod.BytesIO(image_bytes))
        rgb_image = np_mod.array(image)
        if len(rgb_image.shape) == 2:
            rgb_image = cv2_mod.cvtColor(rgb_image, cv2_mod.COLOR_GRAY2RGB)
        elif rgb_image.shape[2] == 4:
            rgb_image = cv2_mod.cvtColor(rgb_image, cv2_mod.COLOR_RGBA2RGB)
        h, w = rgb_image.shape[:2]
        if w > 1280:
            rgb_image = cv2_mod.resize(rgb_image, (1280, int(h * (1280 / w))))
        recognized = []
        if face_recognition_available:
            locs = face_recognition.face_locations(rgb_image, model='hog', number_of_times_to_upsample=2)
            encs = face_recognition.face_encodings(rgb_image, locs, num_jitters=2)
            known_enc = emotion_detector.known_face_encodings if emotion_detector else []
            known_names = emotion_detector.known_face_names if emotion_detector else []
            import lecture as lec_mod
            for enc in encs:
                if known_enc:
                    dists = face_recognition.face_distance(known_enc, enc)
                    if len(dists) > 0:
                        idx = np_mod.argmin(dists)
                        if dists[idx] < 0.65:
                            person = known_names[idx]
                            student = attendance_module._get_student_by_name(person)
                            if student:
                                lec_mod.record_lecture_attendance(session_id=session_id, student_id=student[0],
                                                                 checkpoint_number=checkpoint, status='Present',
                                                                 recognition_method='face_recognition')
                                recognized.append({'name': person, 'student_id': student[0]})
        return jsonify({'success': True, 'recognized_count': len(recognized), 'students': recognized})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ── Teacher student management ──────────────────────────────────────────────

@face_bp.route('/api/teacher/add-student', methods=['POST'])
@login_required
def teacher_add_student():
    try:
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            email = request.form.get('email', '')
            roll_no = request.form.get('roll_no', '')
            student_class = request.form.get('student_class', '')
            uploaded_files = request.files.getlist('photos')
            photos_b64 = []
        else:
            data = request.get_json()
            name = data.get('name')
            email = data.get('email', '')
            roll_no = data.get('roll_no', '')
            student_class = data.get('student_class', '')
            uploaded_files = None
            photos_b64 = data.get('photos', [])
        if not name:
            return jsonify({'success': False, 'message': 'Student name required'}), 400
        username = name.lower().replace(' ', '_')
        default_pw = 'student123'
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'auth.db'))
        cur = conn.cursor()
        base = username
        ctr = 1
        while True:
            cur.execute('SELECT id FROM users WHERE username=?', (username,))
            if not cur.fetchone():
                break
            username = f"{base}_{ctr}"
            ctr += 1
        pw_hash = generate_password_hash(default_pw)
        cur.execute('INSERT INTO users (username, password_hash, role, student_class, email, roll_no, full_name) VALUES (?,?,?,?,?,?,?)',
                    (username, pw_hash, 'student', student_class, email, roll_no, name))
        uid = cur.lastrowid
        conn.commit()
        conn.close()
        if roll_no and attendance_module:
            try:
                att_conn = sqlite3.connect(attendance_module.DB_NAME)
                att_conn.cursor().execute('INSERT OR IGNORE INTO students (roll_number, name) VALUES (?,?)', (roll_no, name))
                att_conn.commit()
                att_conn.close()
            except Exception:
                pass
        face_dir = os.path.join(FACES_DIR, name)
        if uploaded_files:
            os.makedirs(face_dir, exist_ok=True)
            for i, f in enumerate(uploaded_files):
                try:
                    f.save(os.path.join(face_dir, f'{name}_{i+1}.jpg'))
                except Exception:
                    pass
        elif photos_b64:
            os.makedirs(face_dir, exist_ok=True)
            for i, pd in enumerate(photos_b64):
                try:
                    if ',' in pd:
                        pd = pd.split(',')[1]
                    with open(os.path.join(face_dir, f'{name}_{i+1}.jpg'), 'wb') as f:
                        f.write(base64.b64decode(pd))
                except Exception:
                    pass
        return jsonify({'success': True, 'message': f'Student added. Username: {username}, Password: {default_pw}',
                        'data': {'id': uid, 'username': username, 'name': name, 'default_password': default_pw}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/teacher/students', methods=['GET'])
@login_required
def get_teacher_students():
    try:
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'auth.db'))
        cur = conn.cursor()
        cur.execute("SELECT id, username, student_class, role, email, roll_no, full_name FROM users WHERE role='student' ORDER BY full_name, username")
        rows = cur.fetchall()
        conn.close()
        return jsonify({'success': True, 'data': [
            {'id': r[0], 'username': r[1], 'student_class': r[2], 'role': r[3],
             'email': r[4] or '', 'roll_no': r[5] or '', 'name': r[6] or r[1]} for r in rows
        ]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/teacher/students/<int:sid>', methods=['PUT'])
@login_required
def update_teacher_student(sid):
    try:
        data = request.get_json()
        updates, params = [], []
        for k, col in [('username', 'username'), ('student_class', 'student_class'), ('email', 'email'), ('roll_no', 'roll_no'), ('name', 'full_name')]:
            v = data.get(k)
            if v is not None:
                updates.append(f'{col}=?')
                params.append(v)
        if updates:
            params += [sid, 'student']
            conn = sqlite3.connect(os.path.join(BASE_DIR, 'auth.db'))
            conn.cursor().execute(f"UPDATE users SET {','.join(updates)} WHERE id=? AND role=?", params)
            conn.commit()
            conn.close()
        return jsonify({'success': True, 'message': 'Updated'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@face_bp.route('/api/teacher/students/<int:sid>', methods=['DELETE'])
@login_required
def delete_teacher_student(sid):
    try:
        conn = sqlite3.connect(os.path.join(BASE_DIR, 'auth.db'))
        conn.cursor().execute("DELETE FROM users WHERE id=? AND role='student'", (sid,))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Deleted'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
