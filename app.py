from flask import Flask, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
from datetime import datetime
import json
import base64
import cv2
import numpy as np
import face_recognition
import math
from functools import wraps
import attendance
from PIL import Image
import io

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'
CORS(app, supports_credentials=True)

# Global variables for face recognition
known_face_encodings = []
known_face_names = []

def face_confidence(face_distance, face_match_threshold=0.6):
    """Calculate confidence percentage from face distance"""
    range_val = (1.0 - face_match_threshold)
    linear_val = (1.0 - face_distance) / (range_val * 2.0)

    if face_distance > face_match_threshold:
        return str(round(linear_val * 100, 2)) + '%'
    else:
        value = (linear_val + ((1.0 - linear_val) * math.pow((linear_val - 0.5) * 2, 0.2))) * 100
        return str(round(value, 2)) + '%'

def load_known_faces():
    """Load all known face encodings from the faces directory"""
    global known_face_encodings, known_face_names
    known_face_encodings = []
    known_face_names = []
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    faces_path = os.path.join(script_dir, "faces")
    
    if not os.path.exists(faces_path):
        print(f"Faces directory not found at {faces_path}")
        return
    
    for image in os.listdir(faces_path):
        if image.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            face_image = face_recognition.load_image_file(os.path.join(faces_path, image))
            encodings = face_recognition.face_encodings(face_image)
            if encodings:
                known_face_encodings.append(encodings[0])
                known_face_names.append(os.path.splitext(image)[0])
    
    print(f"Loaded {len(known_face_names)} known faces: {known_face_names}")

def get_available_cameras():
    """Get list of available camera indices with device information"""
    available = []
    for index in range(10):  # Check up to 10 cameras
        cap = cv2.VideoCapture(index)
        if cap.isOpened():
            # Try to get camera name/backend info
            camera_name = f"Camera {index}"
            try:
                # Try to get backend name (works on some systems)
                backend = cap.getBackendName()
                # Try to get camera properties
                width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                
                # Detect Logitech Brio (4K capable, typically 1920x1080 or higher)
                if width >= 1920 or height >= 1080:
                    camera_name = f"Logitech Brio (Camera {index})"
                elif backend:
                    camera_name = f"{backend} Camera {index}"
            except:
                pass
            
            available.append({
                'index': index,
                'name': camera_name,
                'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) if cap.isOpened() else 0,
                'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) if cap.isOpened() else 0
            })
            cap.release()
    return available

# Database initialization
def init_auth_db():
    """Initialize authentication database"""
    conn = sqlite3.connect('auth.db')
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'admin'
        )
    ''')
    
    # Create default admin user if not exists
    cur.execute('SELECT COUNT(*) FROM users')
    if cur.fetchone()[0] == 0:
        default_password = generate_password_hash('admin123')
        cur.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', 
                   ('admin', default_password, 'admin'))
    
    conn.commit()
    conn.close()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'}), 400
    
    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match'}), 400
    
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters long'}), 400
    
    try:
        conn = sqlite3.connect('auth.db')
        cur = conn.cursor()
        
        # Check if username already exists
        cur.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cur.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
        
        # Create new user
        password_hash = generate_password_hash(password)
        cur.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', 
                   (username, password_hash, 'admin'))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Registration successful'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Registration failed'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    conn = sqlite3.connect('auth.db')
    cur = conn.cursor()
    cur.execute('SELECT id, password_hash FROM users WHERE username = ?', (username,))
    user = cur.fetchone()
    conn.close()
    
    if user and check_password_hash(user[1], password):
        session['user_id'] = user[0]
        session['username'] = username
        return jsonify({'success': True, 'message': 'Login successful'})
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/dashboard')
@login_required
def dashboard():
    try:
        attendance_data = attendance.calculate_attendance_percentage()
        students = attendance.list_students()
        
        # Get today's attendance
        today = datetime.now().strftime('%Y-%m-%d')
        today_attendance = []
        for student in students:
            student_id = student[0]
            conn = sqlite3.connect(attendance.DB_NAME)
            cur = conn.cursor()
            cur.execute('SELECT status FROM attendance WHERE student_id = ? AND date = ? ORDER BY id DESC LIMIT 1', 
                       (student_id, today))
            result = cur.fetchone()
            status = result[0] if result else 'Absent'
            today_attendance.append({
                'id': student[0],
                'roll_number': student[1],
                'name': student[2],
                'status': status
            })
            conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'attendance_data': attendance_data,
                'today_attendance': today_attendance,
                'total_students': len(students)
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/students')
@login_required
def students():
    try:
        students_list = attendance.list_students()
        return jsonify({'success': True, 'data': students_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/students', methods=['POST'])
@login_required
def add_student():
    try:
        # Check if it's a JSON request or multipart
        if request.is_json:
            data = request.get_json()
            roll_number = data.get('roll_number')
            name = data.get('name')
        else:
            roll_number = request.form.get('roll_number')
            name = request.form.get('name')
            
        if not roll_number or not name:
             return jsonify({'success': False, 'message': 'Roll number and name are required'}), 400

        attendance.add_student(roll_number, name)
        
        # Handle photo upload
        if 'photo' in request.files:
            photo = request.files['photo']
            if photo.filename != '':
                # Save photo to faces directory
                script_dir = os.path.dirname(os.path.abspath(__file__))
                faces_dir = os.path.join(script_dir, "faces")
                if not os.path.exists(faces_dir):
                    os.makedirs(faces_dir)
                
                # Use name for filename, defaulting to .jpg if no extension
                _, ext = os.path.splitext(photo.filename)
                if not ext:
                    ext = '.jpg'
                
                # Sanitize filename to prevent directory traversal or issues
                # For simplicity, we trust the name but ensure it's safe for FS
                safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c==' ']).rstrip()
                filename = f"{safe_name}{ext}"
                
                photo.save(os.path.join(faces_dir, filename))
                
                # Reload faces to include the new one immediately
                load_known_faces()
                
        return jsonify({'success': True, 'message': 'Student added successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/students/<int:student_id>', methods=['PUT'])
@login_required
def update_student(student_id):
    try:
        data = request.get_json()
        roll_number = data.get('roll_number')
        name = data.get('name')
        
        conn = sqlite3.connect(attendance.DB_NAME)
        cur = conn.cursor()
        cur.execute('UPDATE students SET roll_number = ?, name = ? WHERE id = ?', 
                   (roll_number, name, student_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Student updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@login_required
def delete_student(student_id):
    try:
        conn = sqlite3.connect(attendance.DB_NAME)
        cur = conn.cursor()
        cur.execute('DELETE FROM attendance WHERE student_id = ?', (student_id,))
        cur.execute('DELETE FROM students WHERE id = ?', (student_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Student deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/attendance')
@login_required
def attendance_page():
    try:
        attendance_records = attendance.list_attendance()
        return jsonify({'success': True, 'data': attendance_records})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reports')
@login_required
def reports():
    try:
        attendance_data = attendance.calculate_attendance_percentage()
        
        conn = sqlite3.connect(attendance.DB_NAME)
        cur = conn.cursor()
        cur.execute('''
            SELECT a.date, a.time, s.name, a.status
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.id
            ORDER BY a.date DESC, a.time DESC
            LIMIT 50
        ''')
        recent_records = cur.fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'attendance_data': attendance_data,
                'recent_records': recent_records
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/export_csv')
@login_required
def export_csv():
    try:
        output_path = attendance.export_to_csv()
        if output_path:
            return jsonify({'success': True, 'file': output_path})
        else:
            return jsonify({'success': False, 'message': 'Export failed'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/mark_attendance', methods=['POST'])
@login_required
def mark_attendance():
    try:
        data = request.get_json()
        name = data.get('name')
        result = attendance.mark_attendance(name)
        return jsonify({'success': result, 'message': 'Attendance marked' if result else 'Failed to mark attendance'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/cameras', methods=['GET'])
@login_required
def list_cameras():
    """List all available cameras with device information"""
    try:
        cameras = get_available_cameras()
        return jsonify({
            'success': True,
            'cameras': cameras,
            'count': len(cameras)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/recognize_faces', methods=['POST'])
@login_required
def recognize_faces():
    """Recognize multiple faces (up to 15) from an image"""
    try:
        data = request.get_json()
        
        # Get image data (base64 encoded)
        image_data = data.get('image')
        if not image_data:
            return jsonify({'success': False, 'message': 'No image data provided'}), 400
        
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL image to numpy array
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV (if needed)
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            rgb_image = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        else:
            rgb_image = image_array
        
        # Convert BGR to RGB for face_recognition
        rgb_image = cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB)
        
        # Resize for faster processing (maintain aspect ratio)
        height, width = rgb_image.shape[:2]
        if width > 1280:
            scale = 1280 / width
            new_width = 1280
            new_height = int(height * scale)
            rgb_image = cv2.resize(rgb_image, (new_width, new_height))
        
        # Find face locations and encodings
        # Use HOG model for faster processing (optimized for 15 faces)
        # HOG is faster than CNN and sufficient for real-time multi-face detection
        face_locations = face_recognition.face_locations(rgb_image, model='hog', number_of_times_to_upsample=1)
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations, num_jitters=1)
        
        # Limit to 15 faces (prioritize first 15 detected)
        if len(face_locations) > 15:
            face_locations = face_locations[:15]
            face_encodings = face_encodings[:15]
        
        recognized_faces = []
        
        for face_encoding, face_location in zip(face_encodings, face_locations):
            # Compare with known faces
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
            name = "Unknown"
            confidence = "0%"
            
            if known_face_encodings:
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                best_match_index = np.argmin(face_distances)
                
                if matches[best_match_index]:
                    name = known_face_names[best_match_index]
                    confidence = face_confidence(face_distances[best_match_index])
            
            # Convert face_location from (top, right, bottom, left) to (x, y, width, height)
            top, right, bottom, left = face_location
            recognized_faces.append({
                'name': name,
                'confidence': confidence,
                'location': {
                    'x': int(left),
                    'y': int(top),
                    'width': int(right - left),
                    'height': int(bottom - top)
                }
            })
        
        return jsonify({
            'success': True,
            'faces': recognized_faces,
            'count': len(recognized_faces)
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/mark_multiple_attendance', methods=['POST'])
@login_required
def mark_multiple_attendance():
    """Mark attendance for multiple recognized faces"""
    try:
        data = request.get_json()
        names = data.get('names', [])
        
        if not names:
            return jsonify({'success': False, 'message': 'No names provided'}), 400
        
        results = []
        for name in names:
            if name and name != "Unknown":
                result = attendance.mark_attendance(name)
                results.append({'name': name, 'success': result})
        
        return jsonify({
            'success': True,
            'results': results,
            'message': f'Processed {len(results)} attendance records'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/mark_attendance_batch', methods=['POST'])
@login_required
def mark_attendance_batch():
    try:
        data = request.get_json()
        name = data.get('name')
        status = data.get('status', 'Present')  # Present, Absent, or Partial
        
        # Use record_attendance_status which allows setting the status
        now = datetime.now()
        date_str = now.strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M:%S')
        
        student = attendance._get_student_by_name(name)
        if not student:
            return jsonify({'success': False, 'message': f'Student {name} not found'}), 404
        
        student_id = student[0]
        conn = sqlite3.connect(attendance.DB_NAME)
        cur = conn.cursor()
        
        # Remove any existing record for this student on this date
        cur.execute('DELETE FROM attendance WHERE student_id = ? AND date = ?', (student_id, date_str))
        
        # Insert new attendance record with specified status
        cur.execute('INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
                    (student_id, date_str, time_str, status))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': f'Attendance marked as {status} for {name}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/attendance/today')
@login_required
def get_today_attendance():
    """Get all students with their attendance status for today"""
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        students = attendance.list_students()
        
        conn = sqlite3.connect(attendance.DB_NAME)
        cur = conn.cursor()
        
        attendance_data = []
        for student in students:
            student_id, roll_number, name = student
            # Get the latest attendance record for today
            cur.execute('''
                SELECT status FROM attendance 
                WHERE student_id = ? AND date = ? 
                ORDER BY id DESC LIMIT 1
            ''', (student_id, today))
            result = cur.fetchone()
            status = result[0] if result else 'Absent'
            
            attendance_data.append({
                'id': student_id,
                'roll_number': roll_number,
                'name': name,
                'status': status
            })
        
        conn.close()
        return jsonify({'success': True, 'data': attendance_data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Initialize databases
    init_auth_db()
    attendance.init_db()
    
    # Load known faces
    load_known_faces()
    
    app.run(debug=True, host='0.0.0.0', port=5001)
