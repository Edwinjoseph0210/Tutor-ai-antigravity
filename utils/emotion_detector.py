
import cv2
import numpy as np
import os
import base64
from datetime import datetime
import math

# Try importing face_recognition
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("Warning: face_recognition library not found. Gaze/Drowsiness features disabled.")

# Global model variables
model = None
face_cascade = None
emotion_dict = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"]

# Face Recognition Globals
known_face_encodings = []
known_face_names = []
faces_loaded = False

# Attentiveness mapping
# Attentive emotions: Neutral, Happy, Surprise
ATTENTIVE_EMOTIONS = ["Neutral", "Happy", "Surprise"]

# Drowsiness Thresholds
EAR_THRESHOLD = 0.25  # Eye Aspect Ratio threshold (below this = closed) - STRICTER

# Gaze Thresholds (degrees)
# Yaw: Left/Right. > 15 or < -15 is distracted (looking sideways) - STRICTER
# Pitch: Up/Down. < -15 is looking UP (distracted), > 25 is looking DOWN (attentive at notebook)
YAW_THRESHOLD = 15  # Reduced from 25 to 15 for stricter sideways detection
PITCH_THRESHOLD_UP = -15 
# PITCH_THRESHOLD_DOWN = 30 # Not used for distraction, as looking down is allowed

def init_emotion_model():
    """Initialize the emotion recognition model and face cascade"""
    global model, face_cascade, faces_loaded
    
    # Load faces if not loaded - CRITICAL for student recognition
    if not faces_loaded:
        print("📸 Initializing face recognition - loading known faces...")
        load_known_faces()
        if not faces_loaded:
            print("⚠ Warning: Faces not loaded. Student recognition will not work!")
    
    if model is not None:
        return True
        
    try:
        from tensorflow.keras.models import load_model
        
        # Paths are relative to the root application directory where app.py runs
        model_path = "custom_model_result.h5"
        cascade_path = "haarcascade_frontalface_default.xml"
        
        if not os.path.exists(model_path):
            print(f"Error: Model file not found at {model_path}")
            return False
            
        if not os.path.exists(cascade_path):
            print(f"Error: Cascade file not found at {cascade_path}")
            return False
            
        print("Loading emotion recognition model...")
        model = load_model(model_path)
        face_cascade = cv2.CascadeClassifier(cascade_path)
        print("Emotion recognition model loaded successfully")
        return True
    except Exception as e:
        print(f"Error loading emotion model: {e}")
        return False

def load_known_faces(dataset_path="faces"):
    """Loads images from the dataset path and encodes faces."""
    global known_face_encodings, known_face_names, faces_loaded
    
    if not FACE_RECOGNITION_AVAILABLE:
        print("⚠ Face recognition not available - cannot load faces")
        return

    # Get absolute path relative to the script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up one level from utils/ to get project root, then join with faces/
    project_root = os.path.dirname(script_dir)
    full_dataset_path = os.path.join(project_root, dataset_path)
    
    if not os.path.exists(full_dataset_path):
        print(f"⚠ Dataset path '{full_dataset_path}' does not exist.")
        return

    print(f"📸 Loading known faces from {full_dataset_path}...")
    
    # Reset existing encodings
    known_face_encodings = []
    known_face_names = []
    
    image_paths = []
    for root, dirs, files in os.walk(full_dataset_path):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                image_paths.append(os.path.join(root, file))
    
    count = 0
    for image_path in image_paths:
        parent_dir = os.path.basename(os.path.dirname(image_path))
        if os.path.abspath(os.path.dirname(image_path)) == os.path.abspath(full_dataset_path):
            filename = os.path.split(image_path)[-1]
            basename = os.path.splitext(filename)[0]
            name = basename.split('_')[0]
            name = ''.join([i for i in name if not i.isdigit()])
        else:
            name = parent_dir
        
        try:
            face_image = face_recognition.load_image_file(image_path)
            # Use num_jitters=2 for better encoding quality
            encodings = face_recognition.face_encodings(face_image, num_jitters=2)
            
            if len(encodings) > 0:
                known_face_encodings.append(encodings[0])
                known_face_names.append(name)
                count += 1
                print(f"   ✓ Loaded: {name} from {os.path.basename(image_path)}")
            else:
                print(f"   ✗ No face found in {os.path.basename(image_path)}")
        except Exception as e:
            print(f"   ✗ Error processing {image_path}: {e}")

    print(f"✓ Faces loaded. {count} faces encoded from {len(set(known_face_names))} unique students.")
    if count > 0:
        print(f"   Students: {', '.join(sorted(set(known_face_names)))}")
    else:
        print("   ⚠ WARNING: No faces loaded! Student recognition will not work.")
        print("   Make sure you have student photos in the 'faces/' directory")
    faces_loaded = True

def get_loaded_students():
    """Return list of loaded student names"""
    global known_face_names
    return sorted(set(known_face_names)) if known_face_names else []

def is_face_recognition_ready():
    """Check if face recognition is ready (faces loaded)"""
    global faces_loaded, known_face_encodings
    return faces_loaded and len(known_face_encodings) > 0

def get_face_landmarks(image_rgb):
    """Detect 68 facial landmarks using face_recognition"""
    if not FACE_RECOGNITION_AVAILABLE:
        return None
    
    landmarks_list = face_recognition.face_landmarks(image_rgb)
    if not landmarks_list:
        return None
    return landmarks_list[0]

def calculate_ear(eye_points):
    """Calculate Eye Aspect Ratio (EAR)"""
    # Euclidean distance between vertical eye landmarks
    A = np.linalg.norm(np.array(eye_points[1]) - np.array(eye_points[5]))
    B = np.linalg.norm(np.array(eye_points[2]) - np.array(eye_points[4]))
    # Euclidean distance between horizontal eye landmarks
    C = np.linalg.norm(np.array(eye_points[0]) - np.array(eye_points[3]))
    
    if C == 0: return 0
    ear = (A + B) / (2.0 * C)
    return ear

def get_head_pose(landmarks, image_shape):
    """
    Estimate head pose (Yaw, Pitch, Roll) using solvePnP.
    Returns (yaw, pitch, roll) in degrees.
    """
    h, w, c = image_shape
    
    # 2D Image Points (from landmarks)
    # Nose tip (30), Chin (8), Left Eye Left Corner (36), Right Eye Right Corner (45), Left Mouth Corner (48), Right Mouth Corner (54)
    # face_recognition landmarks are dicts with keys: chin, left_eyebrow, etc.
    # We need specific points.
    
    # nose_bridge: points 27-30 (4 points). Last is nose tip.
    nose_tip = landmarks['nose_bridge'][3]
    # chin: points 0-16 (17 points). Middle is chin (8).
    chin = landmarks['chin'][8]
    # left_eye: 0-5. Left corner is 0 (36 in dlib).
    left_eye_left_corner = landmarks['left_eye'][0]
    # right_eye: 0-5. Right corner is 3 (45 in dlib).
    right_eye_right_corner = landmarks['right_eye'][3]
    # top_lip: 0-11. Left Mouth Corner is 0 (48).
    left_mouth_corner = landmarks['top_lip'][0]
    # top_lip: 0-11. Right Mouth Corner is 6 (54).
    right_mouth_corner = landmarks['top_lip'][6]

    image_points = np.array([
        nose_tip,             # Nose tip
        chin,                 # Chin
        left_eye_left_corner, # Left eye left corner
        right_eye_right_corner, # Right eye right corner
        left_mouth_corner,    # Left Mouth corner
        right_mouth_corner    # Right mouth corner
    ], dtype="double")

    # 3D Model Points (Generic face)
    model_points = np.array([
        (0.0, 0.0, 0.0),             # Nose tip
        (0.0, -330.0, -65.0),        # Chin
        (-225.0, 170.0, -135.0),     # Left eye left corner
        (225.0, 170.0, -135.0),      # Right eye right corner
        (-150.0, -150.0, -125.0),    # Left Mouth corner
        (150.0, -150.0, -125.0)      # Right mouth corner
    ])

    # Camera Matrix approximation
    focal_length = w
    center = (w / 2, h / 2)
    camera_matrix = np.array(
        [[focal_length, 0, center[0]],
         [0, focal_length, center[1]],
         [0, 0, 1]], dtype="double"
    )
    dist_coeffs = np.zeros((4, 1)) # Assuming no lens distortion

    # Solve PnP
    (success, rotation_vector, translation_vector) = cv2.solvePnP(model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE)

    if not success:
        return 0, 0, 0

    # Get rotational matrix
    rmat, jac = cv2.Rodrigues(rotation_vector)

    # Get angles
    # https://stackoverflow.com/questions/15022630/how-to-calculate-the-angle-from-rotation-matrix
    sy = math.sqrt(rmat[0, 0] * rmat[0, 0] + rmat[1, 0] * rmat[1, 0])
    singular = sy < 1e-6

    if not singular:
        x = math.atan2(rmat[2, 1], rmat[2, 2])
        y = math.atan2(-rmat[2, 0], sy)
        z = math.atan2(rmat[1, 0], rmat[0, 0])
    else:
        x = math.atan2(-rmat[1, 2], rmat[1, 1])
        y = math.atan2(-rmat[2, 0], sy)
        z = 0

    # Convert to degrees
    pitch = math.degrees(x)
    yaw = math.degrees(y)
    roll = math.degrees(z)
    
    return yaw, pitch, roll

def identify_face(face_encoding):
    """Matches a face encoding to known faces"""
    global known_face_encodings, known_face_names, faces_loaded
    
    name = "Unknown"
    confidence_score = 1.0
    
    # Ensure faces are loaded
    if not faces_loaded:
        load_known_faces()
    
    if not known_face_encodings:
        print("⚠ No known faces loaded for recognition")
        return name, confidence_score
        
    face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
    best_match_index = np.argmin(face_distances)
    confidence_score = face_distances[best_match_index]
    
    # Use a more lenient threshold (0.65 instead of 0.6) for better recognition
    # Also return confidence for better tracking
    if face_distances[best_match_index] < 0.65:
        name = known_face_names[best_match_index]
        print(f"✓ Recognized: {name} (distance: {face_distances[best_match_index]:.3f})")
    else:
        print(f"✗ No match found (best distance: {face_distances[best_match_index]:.3f}, threshold: 0.65)")
        
    return name, confidence_score

def analyze_emotion_from_base64(base64_string):
    """
    Analyze emotion, gaze, and drowsiness from a base64 encoded image string.
    Returns:
        dict: {
            'success': bool,
            'emotion': str,
            'is_attentive': bool,
            'confidence': float,
            'student_name': str,
            'message': str
        }
    """
    global model, face_cascade, faces_loaded
    
    if model is None:
        if not init_emotion_model():
            return {'success': False, 'message': 'Model not initialized'}

    try:
        # Decode base64 image
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
            
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {'success': False, 'message': 'Failed to decode image'}

        # 1. EMOTION DETECTION (Existing logic on crop)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
        
        emotion_result = "Unknown"
        confidence = 0.0
        face_detected = False
        student_name = "Unknown"
        
        if len(faces) > 0:
            face_detected = True
            faces = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
            (x, y, w, h) = faces[0]
            
            roi_gray = gray[y:y + h, x:x + w]
            roi_gray = cv2.resize(roi_gray, (48, 48), interpolation=cv2.INTER_AREA)
            
            if np.sum([roi_gray]) != 0:
                roi = roi_gray.astype('float') / 255.0
                roi = np.expand_dims(roi, axis=0) # Normalize and reshape for model
                
                # Predict
                from tensorflow.keras.preprocessing.image import img_to_array
                roi = img_to_array(roi[0])
                roi = np.expand_dims(roi, axis=0)
                
                prediction = model.predict(roi, verbose=0)[0]
                maxindex = int(np.argmax(prediction))
                emotion_result = emotion_dict[maxindex]
                confidence = float(prediction[maxindex])
        else:
            return {'success': False, 'message': 'No face detected'}

        # 2. GAZE, DROWSINESS & IDENTIFICATION
        is_attentive = False
        status_message = ""
        recognition_confidence = 0.0
        
        if FACE_RECOGNITION_AVAILABLE:
            image_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            landmarks = get_face_landmarks(image_rgb)
            
            # Identify Face - CRITICAL: This must work for individual student tracking
            face_encodings = face_recognition.face_encodings(image_rgb, num_jitters=1)
            if face_encodings:
                student_name, face_distance = identify_face(face_encodings[0])
                # Convert distance to confidence percentage (distance 0.0 = 100%, distance 0.65 = 0%)
                # Use linear mapping: confidence = (0.65 - distance) / 0.65 * 100
                if face_distance < 0.65:
                    recognition_confidence = max(0.0, min(100.0, ((0.65 - face_distance) / 0.65) * 100))
                else:
                    recognition_confidence = 0.0
            else:
                print("⚠ No face encodings generated from image")
                student_name = "Unknown"
                recognition_confidence = 0.0
            
            if landmarks:
                # Gaze Estimation
                yaw, pitch, roll = get_head_pose(landmarks, img.shape)
                
                # Drowsiness
                left_ear = calculate_ear(landmarks['left_eye'])
                right_ear = calculate_ear(landmarks['right_eye'])
                avg_ear = (left_ear + right_ear) / 2.0
                
                # Logic Determination - STRICTER RULES
                # Yaw: Left/Right head turn (should be close to 0 for looking at screen)
                # Pitch: Up/Down head tilt (negative = looking up, positive = looking down)
                is_looking_sideways = abs(yaw) > YAW_THRESHOLD
                is_looking_up = pitch < PITCH_THRESHOLD_UP  # Looking up (away from screen)
                is_looking_too_far_down = pitch > 30  # Looking too far down (not at screen)
                is_sleeping = avg_ear < EAR_THRESHOLD
                
                # Check if person is looking at screen (yaw close to 0, pitch reasonable)
                is_looking_at_screen = abs(yaw) <= 10 and pitch >= -10 and pitch <= 25
                
                # Emotion Check
                is_positive_emotion = emotion_result in ATTENTIVE_EMOTIONS
                is_negative_emotion = emotion_result in ["Angry", "Disgust", "Fear", "Sad"]
                
                distracted_reasons = []
                if is_sleeping: 
                    distracted_reasons.append("Drowsy/Sleeping")
                if is_looking_sideways: 
                    distracted_reasons.append("Looking Sideways")
                if is_looking_up:
                    distracted_reasons.append("Looking Up")
                if is_looking_too_far_down:
                    distracted_reasons.append("Looking Down")
                if is_negative_emotion:
                    distracted_reasons.append(emotion_result)
                
                # STRICT LOGIC: Only attentive if looking at screen AND no distractions AND positive/neutral emotion
                if not is_looking_at_screen:
                    is_attentive = False
                    if not distracted_reasons:  # Add reason if not already in list
                        if abs(yaw) > 10:
                            status_message = "Not Looking at Screen (Sideways)"
                        elif pitch < -10:
                            status_message = "Not Looking at Screen (Up)"
                        else:
                            status_message = "Not Looking at Screen"
                    else:
                        status_message = f"Distracted ({', '.join(distracted_reasons)})"
                elif distracted_reasons:
                    is_attentive = False
                    status_message = f"Distracted ({', '.join(distracted_reasons)})"
                else:
                    # Looking at screen, no distractions, check emotion
                    if is_positive_emotion or emotion_result == "Neutral":
                        is_attentive = True
                        status_message = "Attentive"
                    else:
                        # Unknown or negative emotion
                        is_attentive = False
                        status_message = f"Distracted ({emotion_result})"
                    
                # Debug print
                print(f"User: {student_name}, Yaw: {yaw:.1f}, Pitch: {pitch:.1f}, EAR: {avg_ear:.2f}, Emotion: {emotion_result} -> {status_message}")
                
            else:
                is_attentive = emotion_result in ATTENTIVE_EMOTIONS
                status_message = "Attentive (Emotion Only)"
        else:
             is_attentive = emotion_result in ATTENTIVE_EMOTIONS
             status_message = "Attentive (Emotion Only)"

        return {
            'success': True,
            'emotion': f"{emotion_result} | {status_message}" if "Distracted" in status_message else emotion_result,
            'is_attentive': is_attentive,
            'confidence': confidence,
            'student_name': student_name,
            'recognition_confidence': recognition_confidence if FACE_RECOGNITION_AVAILABLE else 0.0,
            'distraction_reason': status_message if not is_attentive else None  # Add distraction reason
        }
            
    except Exception as e:
        print(f"Error in analyze_emotion: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'message': str(e)}
