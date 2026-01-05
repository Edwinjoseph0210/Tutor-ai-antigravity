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
# Allow disabling face recognition import via environment variable
DISABLE_FACE_RECO = os.getenv('DISABLE_FACE_RECO', '0')
face_recognition_available = False
if DISABLE_FACE_RECO != '1':
    try:
        import face_recognition
        face_recognition_available = True
    except Exception as e:
        print(f"⚠ Face recognition not available: {e}")
        face_recognition_available = False
import math
from functools import wraps
import attendance
import lecture
from PIL import Image
import io
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
import pyttsx3
import hashlib
import pathlib
import senku_bridge

# Load environment variables
load_dotenv()

# Initialize Gemini AI
gemini_available = False
try:
    import google.generativeai as genai
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if gemini_api_key:
        genai.configure(api_key=gemini_api_key)
        gemini_available = True
        print("✓ Gemini AI initialized successfully")
    else:
        print("⚠ Gemini AI not available (check GEMINI_API_KEY)")
except ImportError:
    print("⚠ Gemini AI not available (google-generativeai not installed)")
except Exception as e:
    print(f"⚠ Gemini AI initialization error: {str(e)}")

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
# For local development we allow cross-origin cookies (CRA dev server -> Flask on different port)
# In production you should set `SESSION_COOKIE_SAMESITE='Lax'` or more restrictive and enable SECURE.
app.config['SESSION_COOKIE_SAMESITE'] = None
app.config['SESSION_COOKIE_SECURE'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours
CORS(app, supports_credentials=True, origins=[
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://ai-tutor-94ff4.web.app',
    'https://aitutor-team.web.app'
])


# Simple health endpoint for frontend to verify backend connectivity
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'face_recognition': face_recognition_available}), 200

# Global variables for face recognition
known_face_encodings = []
known_face_names = []

def face_confidence(face_distance, face_match_threshold=0.65):
    """Calculate confidence percentage from face distance"""
    range_val = (1.0 - face_match_threshold)
    linear_val = (1.0 - face_distance) / (range_val * 2.0)

    if face_distance > face_match_threshold:
        return str(round(linear_val * 100, 2)) + '%'
    else:
        value = (linear_val + ((1.0 - linear_val) * math.pow((linear_val - 0.5) * 2, 0.2))) * 100
        return str(round(value, 2)) + '%'

def load_known_faces():
    """Load all known face encodings from the faces directory (including subdirectories)"""
    global known_face_encodings, known_face_names
    known_face_encodings = []
    known_face_names = []
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    faces_path = os.path.join(script_dir, "faces")
    
    if not os.path.exists(faces_path):
        print(f"Faces directory not found at {faces_path}")
        return
    
    # Walk through all subdirectories
    for root, dirs, files in os.walk(faces_path):
        for image_file in files:
            if image_file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                image_path = os.path.join(root, image_file)
                try:
                    # Load image
                    face_image = face_recognition.load_image_file(image_path)
                    encodings = face_recognition.face_encodings(face_image, num_jitters=2)
                    
                    if encodings:
                        # Use folder name as the person's name, or filename if in root
                        if root == faces_path:
                            # Image is in root faces folder
                            person_name = os.path.splitext(image_file)[0]
                        else:
                            # Image is in a subdirectory - use folder name
                            person_name = os.path.basename(root)
                        
                        # Add all encodings from this image (in case multiple faces)
                        for encoding in encodings:
                            known_face_encodings.append(encoding)
                            known_face_names.append(person_name)
                        
                        print(f"✓ Loaded face: {person_name} from {image_file}")
                    else:
                        print(f"⚠ No face detected in: {image_path}")
                except Exception as e:
                    print(f"✗ Error loading {image_path}: {e}")
    
    print(f"\n✓ Loaded {len(known_face_names)} face encodings from {len(set(known_face_names))} unique people")
    print(f"People: {', '.join(sorted(set(known_face_names)))}")

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
            role TEXT DEFAULT 'admin',
            student_class TEXT
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
            # For API endpoints, return JSON error instead of redirect
            if request.path.startswith('/api/'):
                return jsonify({'success': False, 'message': 'Authentication required'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    student_class = data.get('student_class')
    
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
        
        # Create new user (store student_class if provided)
        password_hash = generate_password_hash(password)
        cur.execute('INSERT INTO users (username, password_hash, role, student_class) VALUES (?, ?, ?, ?)', 
               (username, password_hash, 'admin', student_class))
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
    # Select id, password_hash, student_class
    cur.execute('SELECT id, password_hash, student_class FROM users WHERE username = ?', (username,))
    user = cur.fetchone()
    conn.close()

    if user and check_password_hash(user[1], password):
        session['user_id'] = user[0]
        session['username'] = username
        session['student_class'] = user[2]
        session.permanent = True
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {'id': user[0], 'username': username, 'student_class': user[2]}
        })
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


def fetch_text_from_urls(urls, max_chars=20000):
    """Fetch and extract visible text from a list of URLs."""
    texts = []
    for url in urls:
        try:
            resp = requests.get(url, timeout=8)
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, 'html.parser')
            # Remove scripts/styles
            for s in soup(['script', 'style', 'noscript']):
                s.decompose()
            # Extract visible text
            text = ' '.join(soup.stripped_strings)
            if text:
                texts.append(text[:max_chars])
        except Exception:
            continue
    return '\n\n'.join(texts)


def generate_tts_for_content(content_json, out_filename):
    """Generate a TTS audio file (wav) from lecture content and return file path."""
    try:
        parts = []
        title = content_json.get('title') or f"{content_json.get('subject')} - {content_json.get('chapter')}"
        parts.append(title)
        for sec in content_json.get('sections', []):
            parts.append(sec.get('title', ''))
            parts.append(sec.get('summary', ''))
            # read key points briefly
            kps = sec.get('key_points', [])
            if kps:
                parts.append('Key points: ' + '. '.join(kps))

        lecture_text = '\n\n'.join(parts)

        # Ensure output directory exists
        out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lecture_audio')
        pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)
        out_path = os.path.join(out_dir, out_filename)

        engine = pyttsx3.init()
        # Optionally adjust voice rate/volume
        rate = engine.getProperty('rate')
        engine.setProperty('rate', int(rate * 0.95))

        engine.save_to_file(lecture_text, out_path)
        engine.runAndWait()
        return out_path
    except Exception as e:
        print(f"TTS generation failed: {e}")
        return None


@app.route('/api/lectures/content/generate_from_web', methods=['POST'])
@login_required
def generate_lecture_from_web():
    """Fetch content from provided URLs, ask Gemini to synthesize a 45-min lecture, cache it and produce TTS."""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI not available'}), 503

    try:
        data = request.get_json() or {}
        urls = data.get('urls', [])
        subject = data.get('subject', 'General')
        chapter = data.get('chapter', 'Lecture')

        if not urls:
            return jsonify({'success': False, 'message': 'No URLs provided'}), 400

        # Fetch web text
        web_text = fetch_text_from_urls(urls)

        model = genai.GenerativeModel('gemini-pro')

        prompt = f"""You are an expert teacher. Using the following source material, create a 45-minute lecture for {subject} - {chapter}. Use NCERT-friendly language suitable for class 10.

Source material:
{web_text[:20000]}

Produce a JSON structure with title, total_duration_minutes=45 and sections as in the existing generator (section_number, title, summary, key_points, image_descriptions, duration_minutes)."""

        response = model.generate_content(prompt)
        content_text = response.text

        # Try to extract JSON
        import re
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content_text, re.DOTALL)
        if json_match:
            content_json = json.loads(json_match.group(1))
        else:
            json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
            if json_match:
                content_json = json.loads(json_match.group(0))
            else:
                return jsonify({'success': False, 'message': 'Failed to parse generated content'}), 500

        # Save content
        lecture.save_lecture_content(subject, chapter, content_json)

        # Generate TTS audio file (filename based on hash)
        h = hashlib.sha1((subject + chapter).encode()).hexdigest()[:12]
        filename = f"lecture_{h}.wav"
        audio_path = generate_tts_for_content(content_json, filename)

        # Return relative audio URL and content
        audio_url = None
        if audio_path:
            audio_url = '/lecture_audio/' + os.path.basename(audio_path)

        return jsonify({'success': True, 'data': content_json, 'audio_url': audio_url})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


    @app.route('/api/lectures/upload_pdf', methods=['POST'])
    @login_required
    def upload_pdf():
        """Upload a PDF, extract curriculum using Senku ingestion, and return JSON."""
        try:
            if 'pdf' not in request.files:
                return jsonify({'success': False, 'message': 'No PDF file provided (field name: pdf)'}), 400

            pdf = request.files['pdf']
            if pdf.filename == '':
                return jsonify({'success': False, 'message': 'Empty filename'}), 400

            # Save uploaded file to a temporary folder
            upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploaded_pdfs')
            os.makedirs(upload_dir, exist_ok=True)
            safe_name = os.path.basename(pdf.filename)
            save_path = os.path.join(upload_dir, safe_name)
            pdf.save(save_path)

            # Use senku_bridge to extract curriculum
            result = senku_bridge.extract_curriculum_from_pdf(save_path)

            return jsonify({'success': True, 'data': result})
        except Exception as e:
            import traceback
            traceback.print_exc()
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

@app.route('/api/faces/reload', methods=['POST'])
@login_required
def reload_faces():
    """Reload face encodings from the faces directory"""
    try:
        load_known_faces()
        return jsonify({
            'success': True,
            'message': f'Reloaded {len(known_face_names)} face encodings',
            'count': len(known_face_names),
            'people': list(set(known_face_names))
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/faces/status', methods=['GET'])
@login_required
def get_faces_status():
    """Get status of loaded faces"""
    try:
        return jsonify({
            'success': True,
            'total_encodings': len(known_face_encodings),
            'unique_people': len(set(known_face_names)) if known_face_names else 0,
            'people': list(set(known_face_names)) if known_face_names else []
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/faces/students', methods=['GET'])
@login_required
def get_students_from_faces():
    """Get all student names from faces folder (alphabetically sorted)"""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        faces_path = os.path.join(script_dir, "faces")
        
        if not os.path.exists(faces_path):
            return jsonify({'success': True, 'data': []})
        
        # Get all folder names (student names) from faces directory
        student_names = []
        for item in os.listdir(faces_path):
            item_path = os.path.join(faces_path, item)
            if os.path.isdir(item_path):
                student_names.append(item)
        
        # Sort alphabetically (case-insensitive)
        student_names.sort(key=str.lower)
        
        # Get today's attendance status for each student
        today = datetime.now().strftime('%Y-%m-%d')
        conn = sqlite3.connect(attendance.DB_NAME)
        cur = conn.cursor()
        
        result = []
        for name in student_names:
            # Try to find student in database
            student = attendance._get_student_by_name(name)
            student_id = student[0] if student else None
            
            # Get attendance status for today
            status = 'Absent'
            attendance_time = None
            if student_id:
                cur.execute('''
                    SELECT status, time FROM attendance 
                    WHERE student_id = ? AND date = ? 
                    ORDER BY id DESC LIMIT 1
                ''', (student_id, today))
                result_row = cur.fetchone()
                if result_row:
                    status = result_row[0]
                    attendance_time = result_row[1]
            
            result.append({
                'name': name,
                'student_id': student_id,
                'status': status,
                'attendance_time': attendance_time
            })
        
        conn.close()
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        import traceback
        traceback.print_exc()
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
        face_locations = face_recognition.face_locations(rgb_image, model='hog', number_of_times_to_upsample=2)
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations, num_jitters=2)
        
        # Limit to 15 faces (prioritize first 15 detected)
        if len(face_locations) > 15:
            face_locations = face_locations[:15]
            face_encodings = face_encodings[:15]
        
        recognized_faces = []
        
        for face_encoding, face_location in zip(face_encodings, face_locations):
            # Compare with known faces
            name = "Unknown"
            confidence = "0%"
            
            if known_face_encodings:
                # Calculate distances to all known faces
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                
                # Find the best match (lowest distance)
                best_match_index = np.argmin(face_distances)
                best_distance = face_distances[best_match_index]
                
                # Use more lenient threshold (0.65 instead of default 0.6)
                # Also check if this person has multiple photos - use the best match among all their photos
                if best_distance < 0.65:
                    # Get all matches for this person (they might have multiple photos)
                    person_name = known_face_names[best_match_index]
                    
                    # Check all encodings for this person to find the best match
                    person_distances = []
                    for idx, stored_name in enumerate(known_face_names):
                        if stored_name == person_name:
                            person_distances.append(face_distances[idx])
                    
                    # Use the best (lowest) distance among all this person's photos
                    if person_distances:
                        best_person_distance = min(person_distances)
                        name = person_name
                        confidence = face_confidence(best_person_distance)
                    else:
                        name = person_name
                        confidence = face_confidence(best_distance)
            
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
        
        if not name:
            return jsonify({'success': False, 'message': 'Student name is required'}), 400
        
        # Use record_attendance_status which allows setting the status
        now = datetime.now()
        date_str = now.strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M:%S')
        
        student = attendance._get_student_by_name(name)
        
        # If student doesn't exist, create them automatically from faces folder
        if not student:
            # Check if student exists in faces folder
            script_dir = os.path.dirname(os.path.abspath(__file__))
            faces_path = os.path.join(script_dir, "faces", name)
            
            if os.path.exists(faces_path) and os.path.isdir(faces_path):
                # Auto-create student in database
                try:
                    # Generate a roll number if not provided (use name as roll number)
                    roll_number = name.replace(' ', '_').upper()
                    attendance.add_student(roll_number=roll_number, name=name)
                    student = attendance._get_student_by_name(name)
                    print(f"Auto-created student: {name} with roll number: {roll_number}")
                except Exception as e:
                    print(f"Error auto-creating student {name}: {e}")
                    return jsonify({'success': False, 'message': f'Failed to create student {name}: {str(e)}'}), 500
            else:
                return jsonify({'success': False, 'message': f'Student {name} not found in database or faces folder'}), 404
        
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
        import traceback
        traceback.print_exc()
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
        
        # Sort alphabetically by name (case-insensitive)
        attendance_data.sort(key=lambda x: x['name'].lower())
        
        conn.close()
        return jsonify({'success': True, 'data': attendance_data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/timetable/generate', methods=['POST'])
@login_required
def generate_timetable_api():
    """Generate a simple weekly timetable for a given class.

    Accepts JSON: { class: '10', start_date: 'YYYY-MM-DD' (optional), holidays: ['YYYY-MM-DD', ...] }
    Returns a weekly schedule (Monday-Friday) with 8 periods per day.
    """
    try:
        data = request.get_json() or {}
        class_name = data.get('class') or data.get('student_class')
        if not class_name:
            return jsonify({'success': False, 'message': 'class is required'}), 400

        # Basic subject pool per class (fallback)
        subjects_map = {
            '10': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Computer', 'Life Skills', 'Art'],
            '9': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Computer', 'Sanskrit', 'Art']
        }

        key = str(class_name).split()[0]
        subjects = subjects_map.get(key, ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Computer', 'Art', 'Physical Education'])

        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        timetable = {}

        # Simple round-robin assignment of subjects to 8 periods per day
        for di, day in enumerate(days):
            periods = []
            for p in range(8):
                subj = subjects[(di + p) % len(subjects)]
                periods.append({
                    'period': p + 1,
                    'subject': subj,
                    'start_time': None,
                    'duration_minutes': 40
                })
            timetable[day] = periods

        return jsonify({'success': True, 'class': class_name, 'timetable': timetable})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Gemini AI Endpoints
@app.route('/api/gemini/ask', methods=['POST'])
@login_required
def gemini_ask():
    """Ask a general question to Gemini AI"""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI is not available'}), 503
    
    try:
        data = request.get_json()
        query = data.get('query', '')
        context = data.get('context', 'educational')
        
        if not query:
            return jsonify({'success': False, 'message': 'Query is required'}), 400
        
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"You are an educational assistant. {query}"
        response = model.generate_content(prompt)
        
        return jsonify({
            'success': True,
            'response': response.text
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/gemini/syllabus', methods=['POST'])
@login_required
def gemini_syllabus():
    """Get syllabus information for a subject/course"""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI is not available'}), 503
    
    try:
        data = request.get_json()
        subject = data.get('subject', '')
        grade_level = data.get('grade_level', '')
        course = data.get('course', '')
        
        if not subject:
            return jsonify({'success': False, 'message': 'Subject is required'}), 400
        
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"Create a comprehensive syllabus for {subject}"
        if grade_level:
            prompt += f" at {grade_level} level"
        if course:
            prompt += f" for the course: {course}"
        prompt += ". Include: 1. Course overview, 2. Learning objectives, 3. Topics/chapters with brief descriptions, 4. Assessment methods, 5. Recommended resources. Format it clearly with sections."
        
        response = model.generate_content(prompt)
        
        return jsonify({
            'success': True,
            'response': response.text
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/gemini/notes', methods=['POST'])
@login_required
def gemini_notes():
    """Generate study notes for a topic"""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI is not available'}), 503
    
    try:
        data = request.get_json()
        topic = data.get('topic', '')
        subject = data.get('subject', '')
        detail_level = data.get('detail_level', 'medium')
        
        if not topic:
            return jsonify({'success': False, 'message': 'Topic is required'}), 400
        
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"Create well-structured study notes on '{topic}'"
        if subject:
            prompt += f" in the subject of {subject}"
        prompt += f" with {detail_level} detail level. "
        prompt += "Include: key concepts, important points, examples, and a summary. Format it clearly with headings and bullet points."
        
        response = model.generate_content(prompt)
        
        return jsonify({
            'success': True,
            'response': response.text
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/gemini/explain', methods=['POST'])
@login_required
def gemini_explain():
    """Explain a concept in detail"""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI is not available'}), 503
    
    try:
        data = request.get_json()
        concept = data.get('concept', '')
        level = data.get('level', 'intermediate')
        
        if not concept:
            return jsonify({'success': False, 'message': 'Concept is required'}), 400
        
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"Explain the concept of '{concept}' at a {level} level. "
        prompt += "Include: a clear definition, key components, real-world examples, and practical applications. Make it comprehensive and easy to understand."
        
        response = model.generate_content(prompt)
        
        return jsonify({
            'success': True,
            'response': response.text
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Lecture Management API Endpoints
@app.route('/api/lectures/start', methods=['POST'])
@login_required
def start_lecture():
    """Start a new lecture session"""
    try:
        data = request.get_json()
        subject = data.get('subject', 'Biology')
        chapter = data.get('chapter', 'Chapter 1')
        title = data.get('title')
        checkpoint_interval = data.get('checkpoint_interval', 300)  # 5 minutes default
        
        session_id = lecture.create_lecture_session(
            subject=subject,
            chapter=chapter,
            title=title,
            checkpoint_interval=checkpoint_interval
        )
        
        if session_id:
            return jsonify({
                'success': True,
                'session_id': session_id,
                'message': 'Lecture session started'
            })
        else:
            return jsonify({'success': False, 'message': 'Failed to start lecture session'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/end', methods=['POST'])
@login_required
def end_lecture():
    """End the current lecture session"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            # Get active session
            active_session = lecture.get_active_lecture_session()
            if active_session:
                session_id = active_session['id']
            else:
                return jsonify({'success': False, 'message': 'No active lecture session'}), 404
        
        result = lecture.end_lecture_session(session_id)
        
        if result:
            return jsonify({'success': True, 'message': 'Lecture session ended'})
        else:
            return jsonify({'success': False, 'message': 'Failed to end lecture session'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/current')
@login_required
def get_current_lecture():
    """Get the currently active lecture session"""
    try:
        active_session = lecture.get_active_lecture_session()
        
        if active_session:
            return jsonify({'success': True, 'data': active_session})
        else:
            return jsonify({'success': False, 'message': 'No active lecture session'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/progress', methods=['POST'])
@login_required
def update_lecture_progress():
    """Update lecture progress"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        current_section = data.get('current_section', 0)
        total_sections = data.get('total_sections')
        
        if not session_id:
            active_session = lecture.get_active_lecture_session()
            if active_session:
                session_id = active_session['id']
            else:
                return jsonify({'success': False, 'message': 'No active lecture session'}), 404
        
        result = lecture.update_lecture_progress(session_id, current_section, total_sections)
        
        if result:
            return jsonify({'success': True, 'message': 'Progress updated'})
        else:
            return jsonify({'success': False, 'message': 'Failed to update progress'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/attendance/checkpoint', methods=['POST'])
@login_required
def record_checkpoint_attendance():
    """Record attendance at a checkpoint"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        student_id = data.get('student_id')
        checkpoint_number = data.get('checkpoint_number', 1)
        status = data.get('status', 'Present')
        recognition_method = data.get('recognition_method', 'manual')
        
        if not session_id or not student_id:
            return jsonify({'success': False, 'message': 'session_id and student_id required'}), 400
        
        result = lecture.record_lecture_attendance(
            session_id=session_id,
            student_id=student_id,
            checkpoint_number=checkpoint_number,
            status=status,
            recognition_method=recognition_method
        )
        
        if result:
            return jsonify({'success': True, 'message': 'Attendance recorded'})
        else:
            return jsonify({'success': False, 'message': 'Failed to record attendance'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/attendance/<int:session_id>')
@login_required
def get_lecture_attendance(session_id):
    """Get attendance for a lecture session"""
    try:
        attendance_data = lecture.get_lecture_attendance(session_id)
        summary = lecture.get_attendance_summary(session_id)
        
        return jsonify({
            'success': True,
            'data': {
                'attendance': attendance_data,
                'summary': summary
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/attendance/override', methods=['POST'])
@login_required
def override_attendance():
    """Teacher override for attendance"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        student_id = data.get('student_id')
        checkpoint_number = data.get('checkpoint_number')
        status = data.get('status')
        notes = data.get('notes')
        
        if not all([session_id, student_id, checkpoint_number, status]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        result = lecture.override_lecture_attendance(
            session_id=session_id,
            student_id=student_id,
            checkpoint_number=checkpoint_number,
            status=status,
            notes=notes
        )
        
        if result:
            return jsonify({'success': True, 'message': 'Attendance overridden'})
        else:
            return jsonify({'success': False, 'message': 'Failed to override attendance'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/content/<subject>/<chapter>')
@login_required
def get_lecture_content(subject, chapter):
    """Get lecture content (cached or generate if not exists)"""
    try:
        # Try to get cached content
        content = lecture.get_lecture_content(subject, chapter)
        
        if content:
            return jsonify({'success': True, 'data': content, 'cached': True})
        
        # If not cached, return message that content needs to be generated
        return jsonify({
            'success': False,
            'message': 'Content not found. Please generate content first.',
            'cached': False
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/content/generate', methods=['POST'])
@login_required
def generate_lecture_content():
    """Generate lecture content using Gemini AI"""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI is not available'}), 503
    
    try:
        data = request.get_json()
        subject = data.get('subject', 'Biology')
        chapter = data.get('chapter', 'Chapter 1')
        
        # Check if content already exists
        cached_content = lecture.get_lecture_content(subject, chapter)
        if cached_content:
            return jsonify({
                'success': True,
                'data': cached_content,
                'cached': True,
                'message': 'Using cached content'
            })
        
        # Generate content using Gemini
        model = genai.GenerativeModel('gemini-pro')
        
        # Generate comprehensive content for NCERT Class 10 Biology Chapter 1: Life Processes
        prompt = f"""Create comprehensive lecture content for NCERT Class 10 Biology {chapter}: Life Processes.

Structure the content as follows:
1. Introduction to Life Processes
2. Nutrition (Autotrophic and Heterotrophic)
3. Respiration
4. Transportation
5. Excretion

For each section, provide:
- Title
- Summary text (2-3 paragraphs, educational and clear)
- Key points (bullet list of 5-7 important concepts)
- Image descriptions (describe what images/diagrams would be helpful)
- Estimated duration in minutes

Format the response as a JSON structure with this exact format:
{{
  "title": "Life Processes - NCERT Class 10 Biology Chapter 1",
  "subject": "Biology",
  "chapter": "Chapter 1",
  "total_duration_minutes": 45,
  "sections": [
    {{
      "section_number": 1,
      "title": "Section Title",
      "summary": "Detailed summary text...",
      "key_points": ["Point 1", "Point 2", ...],
      "image_descriptions": ["Description 1", "Description 2", ...],
      "duration_minutes": 8
    }},
    ...
  ]
}}

Make it comprehensive, educational, and suitable for Class 10 students. Focus on NCERT curriculum content."""
        
        response = model.generate_content(prompt)
        
        # Parse the response (Gemini may return markdown with code blocks)
        content_text = response.text
        
        # Try to extract JSON from markdown code blocks
        import re
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content_text, re.DOTALL)
        if json_match:
            content_json = json.loads(json_match.group(1))
        else:
            # Try to find JSON object directly
            json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
            if json_match:
                content_json = json.loads(json_match.group(0))
            else:
                # Fallback: create structure from text
                content_json = {
                    "title": f"{subject} - {chapter}",
                    "subject": subject,
                    "chapter": chapter,
                    "total_duration_minutes": 45,
                    "sections": [
                        {
                            "section_number": 1,
                            "title": "Introduction",
                            "summary": content_text[:500] if len(content_text) > 500 else content_text,
                            "key_points": ["Key concept 1", "Key concept 2"],
                            "image_descriptions": ["Diagram showing life processes"],
                            "duration_minutes": 8
                        }
                    ]
                }
        
        # Save to cache
        lecture.save_lecture_content(subject, chapter, content_json)
        
        return jsonify({
            'success': True,
            'data': content_json,
            'cached': False,
            'message': 'Content generated successfully'
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error generating content: {str(e)}'}), 500

@app.route('/api/lectures/syllabus/generate', methods=['POST'])
@login_required
def generate_syllabus():
    """Generate complete syllabus using Gemini AI"""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI is not available'}), 503
    
    try:
        data = request.get_json()
        subject = data.get('subject', 'Biology')
        grade = data.get('grade', 'Class 10')
        
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""Create a comprehensive syllabus for {subject} for {grade} following NCERT curriculum.

Include:
1. Course overview
2. Learning objectives
3. All chapters/topics with brief descriptions
4. Time allocation for each chapter
5. Assessment methods
6. Recommended resources

Format as JSON with structure:
{{
  "subject": "{subject}",
  "grade": "{grade}",
  "overview": "...",
  "objectives": ["obj1", "obj2", ...],
  "chapters": [
    {{"number": 1, "title": "...", "description": "...", "duration_weeks": 2}},
    ...
  ],
  "assessment": "...",
  "resources": ["resource1", ...]
}}"""
        
        response = model.generate_content(prompt)
        content_text = response.text
        
        import re
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content_text, re.DOTALL)
        if json_match:
            syllabus = json.loads(json_match.group(1))
        else:
            json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
            syllabus = json.loads(json_match.group(0)) if json_match else {"error": "Failed to parse"}
        
        return jsonify({'success': True, 'data': syllabus})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/study-plan/generate', methods=['POST'])
@login_required
def generate_study_plan():
    """Generate study plan and topics for today using Gemini AI"""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI is not available'}), 503
    
    try:
        data = request.get_json()
        subject = data.get('subject', 'Biology')
        chapter = data.get('chapter', 'Chapter 1')
        class_duration = data.get('duration_minutes', 45)
        
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""Create a detailed study plan for {subject} {chapter} for a {class_duration}-minute class.

Provide:
1. Complete study plan for the entire chapter
2. Specific topics to cover in today's class (fit within {class_duration} minutes)
3. Learning objectives for today
4. Key concepts to emphasize
5. Time breakdown for each topic

Format as JSON:
{{
  "subject": "{subject}",
  "chapter": "{chapter}",
  "full_study_plan": {{
    "overview": "...",
    "sections": [
      {{"title": "...", "duration": 10, "key_points": [...]}},
      ...
    ]
  }},
  "topics_for_today": [
    {{"topic": "...", "duration_minutes": 8, "key_concepts": [...]}},
    ...
  ],
  "learning_objectives": ["obj1", "obj2", ...],
  "total_duration": {class_duration}
}}"""
        
        response = model.generate_content(prompt)
        content_text = response.text
        
        import re
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content_text, re.DOTALL)
        if json_match:
            study_plan = json.loads(json_match.group(1))
        else:
            json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
            study_plan = json.loads(json_match.group(0)) if json_match else {"error": "Failed to parse"}
        
        # Save study plan
        topics_today = json.dumps(study_plan.get('topics_for_today', []))
        lecture.save_study_plan(subject, chapter, study_plan, topics_today)
        
        return jsonify({'success': True, 'data': study_plan})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/study-plan/<subject>/<chapter>')
@login_required
def get_study_plan(subject, chapter):
    """Get study plan for subject/chapter"""
    try:
        plan_data = lecture.get_study_plan(subject, chapter)
        if plan_data:
            return jsonify({'success': True, 'data': plan_data})
        return jsonify({'success': False, 'message': 'Study plan not found'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/mcq/generate', methods=['POST'])
@login_required
def generate_mcq_test():
    """Generate MCQ test using Gemini AI"""
    if not gemini_available:
        return jsonify({'success': False, 'message': 'Gemini AI is not available'}), 503
    
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        subject = data.get('subject', 'Biology')
        chapter = data.get('chapter', 'Chapter 1')
        num_questions = data.get('num_questions', 5)
        duration_minutes = data.get('duration_minutes', 5)
        
        if not session_id:
            active_session = lecture.get_active_lecture_session()
            if active_session:
                session_id = active_session['id']
            else:
                return jsonify({'success': False, 'message': 'No active session'}), 404
        
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""Create {num_questions} multiple choice questions (MCQ) for {subject} {chapter} based on NCERT Class 10 curriculum.

Each question should:
- Be clear and educational
- Have 4 options (A, B, C, D)
- Have one correct answer
- Test understanding of key concepts covered in the chapter

Format as JSON:
{{
  "subject": "{subject}",
  "chapter": "{chapter}",
  "questions": [
    {{
      "id": 1,
      "question": "Question text?",
      "options": {{
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      }},
      "correct_answer": "A",
      "explanation": "Brief explanation of why this is correct"
    }},
    ...
  ]
}}"""
        
        response = model.generate_content(prompt)
        content_text = response.text
        
        import re
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content_text, re.DOTALL)
        if json_match:
            mcq_data = json.loads(json_match.group(1))
        else:
            json_match = re.search(r'\{.*\}', content_text, re.DOTALL)
            mcq_data = json.loads(json_match.group(0)) if json_match else {"error": "Failed to parse"}
        
        # Save MCQ test
        test_id = lecture.save_mcq_test(session_id, subject, chapter, mcq_data, duration_minutes)
        
        return jsonify({
            'success': True,
            'data': mcq_data,
            'test_id': test_id,
            'duration_minutes': duration_minutes
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/mcq/<int:test_id>')
@login_required
def get_mcq_test(test_id):
    """Get MCQ test by ID"""
    try:
        test_data = lecture.get_mcq_test(test_id)
        if test_data:
            return jsonify({'success': True, 'data': test_data})
        return jsonify({'success': False, 'message': 'Test not found'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/mcq/session/<int:session_id>')
@login_required
def get_mcq_by_session(session_id):
    """Get MCQ test for a session"""
    try:
        test_data = lecture.get_mcq_test_by_session(session_id)
        if test_data:
            return jsonify({'success': True, 'data': test_data})
        return jsonify({'success': False, 'message': 'No test found for this session'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/mcq/submit', methods=['POST'])
@login_required
def submit_mcq_response():
    """Submit student's MCQ answers"""
    try:
        data = request.get_json()
        test_id = data.get('test_id')
        student_id = data.get('student_id')
        answers = data.get('answers', {})
        
        if not test_id or not student_id:
            return jsonify({'success': False, 'message': 'test_id and student_id required'}), 400
        
        # Get test to calculate score
        test_data = lecture.get_mcq_test(test_id)
        if not test_data:
            return jsonify({'success': False, 'message': 'Test not found'}), 404
        
        questions = test_data['questions'].get('questions', [])
        total_questions = len(questions)
        score = 0
        
        for q in questions:
            q_id = str(q.get('id', ''))
            student_answer = answers.get(q_id, '').upper()
            correct_answer = q.get('correct_answer', '').upper()
            if student_answer == correct_answer:
                score += 1
        
        # Save response
        response_id = lecture.save_mcq_response(test_id, student_id, answers, score, total_questions)
        
        return jsonify({
            'success': True,
            'response_id': response_id,
            'score': score,
            'total_questions': total_questions,
            'percentage': round((score / total_questions * 100) if total_questions > 0 else 0, 2)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/lectures/attendance/background', methods=['POST'])
@login_required
def background_attendance_check():
    """Background attendance check using webcam (non-intrusive)"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        checkpoint_number = data.get('checkpoint_number', 1)
        image_data = data.get('image')  # Base64 encoded image from webcam
        
        if not session_id or not image_data:
            return jsonify({'success': False, 'message': 'session_id and image required'}), 400
        
        # Use existing face recognition endpoint logic
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert RGB to BGR for OpenCV
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            rgb_image = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        else:
            rgb_image = image_array
        
        rgb_image = cv2.cvtColor(rgb_image, cv2.COLOR_BGR2RGB)
        
        # Resize for faster processing
        height, width = rgb_image.shape[:2]
        if width > 1280:
            scale = 1280 / width
            new_width = 1280
            new_height = int(height * scale)
            rgb_image = cv2.resize(rgb_image, (new_width, new_height))
        
        # Face recognition - use more lenient settings
        face_locations = face_recognition.face_locations(rgb_image, model='hog', number_of_times_to_upsample=2)
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations, num_jitters=2)
        
        recognized_students = []
        for face_encoding in face_encodings:
            if known_face_encodings:
                # Calculate distances to all known faces
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                
                if len(face_distances) > 0:
                    # Find the best match (lowest distance)
                    best_match_index = np.argmin(face_distances)
                    best_distance = face_distances[best_match_index]
                    
                    # More lenient matching - accept if distance is less than 0.65
                    if best_distance < 0.65:
                        person_name = known_face_names[best_match_index]
                        
                        # Check all encodings for this person to find the best match among their photos
                        person_distances = []
                        for idx, stored_name in enumerate(known_face_names):
                            if stored_name == person_name:
                                person_distances.append(face_distances[idx])
                        
                        # Use the best (lowest) distance among all this person's photos
                        if person_distances:
                            best_person_distance = min(person_distances)
                            confidence = face_confidence(best_person_distance)
                        else:
                            confidence = face_confidence(best_distance)
                        
                        # Get student ID
                        student = attendance._get_student_by_name(person_name)
                        if student:
                            student_id = student[0]
                            # Record attendance
                            lecture.record_lecture_attendance(
                                session_id=session_id,
                                student_id=student_id,
                                checkpoint_number=checkpoint_number,
                                status='Present',
                                recognition_method='face_recognition'
                            )
                            recognized_students.append({
                                'name': person_name,
                                'student_id': student_id,
                                'confidence': confidence,
                                'distance': float(best_person_distance if person_distances else best_distance)
                            })
        
        return jsonify({
            'success': True,
            'recognized_count': len(recognized_students),
            'students': recognized_students,
            'message': f'Attendance recorded for {len(recognized_students)} students'
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Initialize databases
    init_auth_db()
    attendance.init_db()
    lecture.init_lecture_db()
    
    # Load known faces if face_recognition is available
    if 'face_recognition_available' in globals() and face_recognition_available:
        try:
            load_known_faces()
        except Exception as e:
            print(f"⚠ Failed to load known faces on startup: {e}")
    else:
        print("⚠ Skipping face dataset load because face_recognition is not available")
    
    port = int(os.getenv('PORT', '5001'))
    app.run(debug=True, host='0.0.0.0', port=port)
