
import time
import math
from datetime import datetime
import threading
import queue

# Import emotion detector from utils
# We assume emotion_detector.py is in utils/ and has the necessary functions
try:
    import utils.emotion_detector as emotion_detector
except ImportError:
    # Graceful fallback for mock testing if utils not found
    print("Warning: utils.emotion_detector not found, using mocks")
    class MockDetector:
        def is_face_recognition_ready(self): return True
        def identify_face(self, encoding): return "Mock Student", 0.4
    emotion_detector = MockDetector()

class StudentState:
    def __init__(self, student_id):
        self.student_id = student_id
        self.status = 'active'  # active, awaiting_face_validation, recording_doubt
        self.emotion_history = []  # List of (timestamp, emotion, score)
        self.rolling_window_duration = 120  # 2 minutes
        self.last_update_time = time.time()
        
        # Scores
        self.attention_score = 100.0  # Start at 100
        self.discipline_score = 100.0
        self.confusion_count = 0
        self.absence_duration = 0.0
        
        # Validation State
        self.validation_attempts = 0
        self.last_face_encoding = None

    def add_emotion_sample(self, emotion, face_detected, is_attentive):
        now = time.time()
        
        # Calculate score for this sample
        # Attentive = +2, Confused = +1, Distracted = -1, Absent = -2
        # We normalize these "points" later or accumulate them to adjust the 0-100 score
        
        sample_score = 0
        state_label = "Attentive"
        
        if not face_detected:
            sample_score = -2
            state_label = "Absent"
            self.absence_duration += (now - self.last_update_time)
        elif emotion.lower() == 'confused':
            sample_score = 1
            state_label = "Confused"
            self.confusion_count += 1
        elif not is_attentive:
            sample_score = -1
            state_label = "Distracted"
        else:
            sample_score = 2
            state_label = "Attentive"
            
        self.emotion_history.append({
            'timestamp': now,
            'emotion': emotion,
            'score': sample_score,
            'label': state_label
        })
        
        self.last_update_time = now
        self._prune_history(now)
        self._calculate_scores()

    def _prune_history(self, now):
        # Remove samples older than rolling window
        cutoff = now - self.rolling_window_duration
        self.emotion_history = [s for s in self.emotion_history if s['timestamp'] > cutoff]

    def _calculate_scores(self):
        if not self.emotion_history:
            return

        # Simple weighted moving average or accumulation logic
        # Constraint: "Attention Score (0–100 normalized)"
        
        # Logic: 
        # Start with 100.
        # Calculate average "points" in window. 
        # Range of points in 2 mins (approx 24 samples if 5s interval):
        # Max: 24 * 2 = 48 points. Min: 24 * -2 = -48 points.
        # Map [-2, 2] average to [0, 100].
        
        total_score = sum(s['score'] for s in self.emotion_history)
        count = len(self.emotion_history)
        avg_score = total_score / count if count > 0 else 0
        
        # Map -2..2 to 0..100
        # -2 -> 0, 0 -> 50, 2 -> 100
        # y = 25 * x + 50
        normalized_attention = (25 * avg_score) + 50
        self.attention_score = max(0.0, min(100.0, normalized_attention))
        
        # Discipline Score: consistency based
        # Penalize frequent state changes or frequent distractions
        distractions = sum(1 for s in self.emotion_history if s['score'] < 0)
        distraction_ratio = distractions / count if count > 0 else 0
        
        # Discipline drops if distraction ratio is high
        # 100 - (ratio * 100)
        self.discipline_score = max(0, 100 - (distraction_ratio * 100))

class IntelligenceEngine:
    def __init__(self):
        self.active_lectures = {} # lecture_id -> set of student_ids
        self.student_states = {} # student_id -> StudentState
        self.lock = threading.Lock()
        
        # Voice Doubts
        self.doubt_queue = queue.Queue()
        
    def start_lecture(self, lecture_id):
        with self.lock:
            self.active_lectures[lecture_id] = set()
            print(f"Intelligence Engine: Started lecture {lecture_id}")

    def end_lecture(self, lecture_id):
        with self.lock:
            if lecture_id in self.active_lectures:
                del self.active_lectures[lecture_id]
                print(f"Intelligence Engine: Ended lecture {lecture_id}")
                
    def register_student(self, lecture_id, student_id):
        with self.lock:
            if lecture_id in self.active_lectures:
                self.active_lectures[lecture_id].add(student_id)
            if student_id not in self.student_states:
                self.student_states[student_id] = StudentState(student_id)

    def process_frame(self, lecture_id, student_id, emotion_data):
        """
        emotion_data dict from emotion_detector.analyze_emotion_from_base64
        keys: success, emotion, is_attentive, confidence, etc.
        """
        with self.lock:
            if student_id not in self.student_states:
                self.register_student(lecture_id, student_id)
            
            state = self.student_states[student_id]
            
            face_detected = emotion_data.get('success', False) and emotion_data.get('message') != 'No face detected'
            emotion = emotion_data.get('emotion', 'Neutral')
            is_attentive = emotion_data.get('is_attentive', False)
            
            state.add_emotion_sample(emotion, face_detected, is_attentive)
            
            # Check if awaiting face validation for voice doubt
            if state.status == 'awaiting_face_validation':
                 return self._validate_face_for_voice(state, emotion_data, lecture_id)
            
            return {
                'attention_score': round(state.attention_score, 1),
                'discipline_score': round(state.discipline_score, 1),
                'status': state.status
            }

    def trigger_raise_hand(self, student_id, lecture_id):
        print(f"Intelligence Engine: Raise Hand triggered for {student_id}")
        with self.lock:
            if student_id not in self.student_states:
                self.register_student(lecture_id, student_id)
            
            state = self.student_states[student_id]
            state.status = 'awaiting_face_validation'
            state.validation_attempts = 0
            return True

    def _validate_face_for_voice(self, state, emotion_data, lecture_id):
        # Module 3: Face Recognition Validation
        recognition_confidence = emotion_data.get('recognition_confidence', 0)
        student_name_detected = emotion_data.get('student_name', 'Unknown')
        
        print(f"Validating face for {state.student_id}. Detected: {student_name_detected} ({recognition_confidence}%)")
        
        # Threshold >= 0.6 (translated to 60% confidence in emotion_detector logic usually, 
        # but pure distance < 0.6 is good. Helper returns 0-100 score. 
        # Let's assume > 60 is valid based on USER prompt "confidence threshold >= 0.6")
        
        # User prompt says "Match with stored facial embedding... confidence threshold >= 0.6"
        # emotion_detector.identify_face returns name and distance. 
        # analyze_emotion returns 'recognition_confidence' (0-100). 
        # So we check if > 60.
        
        valid = False
        if student_name_detected != 'Unknown' and recognition_confidence >= 60:
             # Check if name matches student_id (assuming student_id IS the name for now, as app.py uses name as key)
             if student_name_detected == state.student_id:
                 valid = True
        
        if valid:
            print(f"Face Validated for {state.student_id}. Triggering Voice Doubt.")
            state.status = 'recording_doubt'
            # Trigger Voice Capture in separate thread/process to not block frame processing
            # We return a flag to app.py to initiate the voice assistant
            return {'action': 'trigger_voice_doubt', 'student_id': state.student_id}
        else:
            state.validation_attempts += 1
            if state.validation_attempts > 5: # Timeout after 5 bad frames (~10s)
                print(f"Face validation failed for {state.student_id} timeout.")
                state.status = 'active'
                return {'action': 'validation_failed'}
            return {'action': 'validating'}

    def reset_student_status(self, student_id):
        with self.lock:
            if student_id in self.student_states:
                self.student_states[student_id].status = 'active'

# Singleton instance
engine = IntelligenceEngine()
