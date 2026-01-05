import os
import sys
import cv2
import numpy as np
import face_recognition
import math
import pyttsx3
from datetime import datetime
import sys
import ctypes

# Import attendance module
try:
    # Ensure project folder is importable
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import attendance
except Exception:
    attendance = None

# Initialize TTS
engine = pyttsx3.init()
engine.say("Welcome to AI Facial Recognition System. Please wait while we initialise the project.")
engine.runAndWait()

# Non-blocking speech helper: run small pyttsx3 engine in background thread to avoid blocking main loop
def speak(text: str):
    try:
        # Create a local engine to avoid blocking the main loop or engine thread-safety issues
        import threading

        def _s(text):
            try:
                e = pyttsx3.init()
                e.say(text)
                e.runAndWait()
            except Exception:
                pass

        t = threading.Thread(target=_s, args=(text,), daemon=True)
        t.start()
    except Exception:
        pass


def window_exists(window_name: str) -> bool:
    """Return True if an OpenCV window with the given name appears to exist/visible.

    Tries cv2.getWindowProperty first. On Windows, falls back to FindWindowW if necessary.
    """
    try:
        prop = cv2.getWindowProperty(window_name, cv2.WND_PROP_VISIBLE)
        # Some backends return 1.0 when visible, 0.0 when closed
        if prop < 1:
            return False
        return True
    except Exception:
        # Fallback for Windows: use FindWindowW to check if a top-level window with this title exists
        try:
            hwnd = ctypes.windll.user32.FindWindowW(None, window_name)
            return hwnd != 0
        except Exception:
            return True

# Get the folder where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
faces_path = os.path.join(script_dir, "faces")

def face_confidence(face_distance, face_match_threshold=0.6):
    range_val = (1.0 - face_match_threshold)
    linear_val = (1.0 - face_distance) / (range_val * 2.0)

    if face_distance > face_match_threshold:
        return str(round(linear_val * 100, 2)) + '%'
    else:
        value = (linear_val + ((1.0 - linear_val) * math.pow((linear_val - 0.5) * 2, 0.2))) * 100
        return str(round(value, 2)) + '%'

class FaceRecognition:
    face_locations = []
    face_encodings = []
    face_names = []
    known_face_encodings = []
    known_face_names = []
    process_current_frame = True

    def __init__(self):
        self.encode_faces()
        # Initialize detection counters for session-based attendance
        self.processed_frames = 0  # number of frames where detection was run
        # map name -> count of frames where face was detected
        self.detect_counts = {name: 0 for name in self.known_face_names}

    def encode_faces(self):
        # Ensure faces folder exists. If not, create it and warn the user.
        if not os.path.exists(faces_path):
            print(f"Folder 'faces' not found at {faces_path}. Creating folder now...")
            try:
                os.makedirs(faces_path, exist_ok=True)
                print(f"Created folder: {faces_path}. Please add face images (.jpg/.png) into this folder and re-run the script.")
            except Exception as e:
                print(f"Failed to create faces folder at {faces_path}: {e}")
                sys.exit(1)
            # No images to encode yet; return early to allow user to add images.
            return

        # Walk through the directory to get all image files (supports subdirectories)
        for root, dirs, files in os.walk(faces_path):
            for image_file in files:
                if image_file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    image_path = os.path.join(root, image_file)
                    # Determine name based on folder structure
                    parent_dir = os.path.basename(os.path.dirname(image_path))
                    
                    # If parent dir is the faces folder itself, use filename
                    if os.path.abspath(os.path.dirname(image_path)) == os.path.abspath(faces_path):
                        name = os.path.splitext(image_file)[0]
                    else:
                        # Use the subdirectory name as the person's name
                        name = parent_dir
                    
                    try:
                        face_image = face_recognition.load_image_file(image_path)
                        encodings = face_recognition.face_encodings(face_image)
                        if encodings:
                            self.known_face_encodings.append(encodings[0])
                            self.known_face_names.append(name)
                            print(f"Encoded {name} from {os.path.basename(image_path)}")
                        else:
                            print(f"Warning: No face found in {image_path}")
                    except Exception as e:
                        print(f"Error processing {image_path}: {e}")

        print("Known faces:", self.known_face_names)

    def run_recognition(self):
        # Try multiple camera indices if needed
        for index in range(0, 3):
            video_capture = cv2.VideoCapture(index)
            if video_capture.isOpened():
                print(f"Camera opened successfully at index {index}")
                break
            else:
                video_capture.release()
        else:
            sys.exit("Cannot open camera. Please check camera permissions or try another camera.")

        while True:
            ret, frame = video_capture.read()
            if not ret:
                print("Failed to grab frame")
                break

            if self.process_current_frame:
                small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
                rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

                self.face_locations = face_recognition.face_locations(rgb_small_frame)
                self.face_encodings = face_recognition.face_encodings(rgb_small_frame, self.face_locations)

                self.face_names = []
                for face_encoding in self.face_encodings:
                    matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
                    name = "Unknown"
                    confidence = "Unknown"

                    face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                    if len(face_distances) > 0:
                        best_match_index = np.argmin(face_distances)
                        if matches[best_match_index]:
                            name = self.known_face_names[best_match_index]
                            confidence = face_confidence(face_distances[best_match_index])

                    self.face_names.append(f"{name} ({confidence})")
                    # speak in background so it doesn't block frame processing
                    try:
                        speak(name)
                    except Exception:
                        pass

                    # Count detections per processed frame (skip Unknown)
                    # We'll evaluate final attendance at the end of the session.
                    if not name.startswith('Unknown'):
                        # increment counter for this name; ensure key exists
                        if name not in self.detect_counts:
                            self.detect_counts[name] = 0
                        self.detect_counts[name] += 1

                # increment number of processed frames after handling this frame
                self.processed_frames += 1

            self.process_current_frame = not self.process_current_frame

            # Draw boxes and labels
            for (top, right, bottom, left), name in zip(self.face_locations, self.face_names):
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4

                cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 255, 0), -1)
                cv2.putText(frame, name, (left + 6, bottom - 6),
                            cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 1)

            cv2.imshow('Face Recognition', frame)

            # Check for 'q' key
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print('Quit key pressed')
                break

            # If the window was closed by the user, break the loop. Use a robust helper.
            try:
                if not window_exists('Face Recognition'):
                    print('Window closed by user (detected).')
                    break
            except Exception:
                # If detection fails, continue running; user can still press 'q'
                pass

        video_capture.release()
        cv2.destroyAllWindows()
        # Session finished - finalize attendance based on detection counts
        try:
            if attendance:
                print('\nFinalizing attendance for session...')
                total = self.processed_frames if self.processed_frames > 0 else 1
                # use current time/date as session end time
                session_time = datetime.now().strftime('%H:%M:%S')
                session_date = datetime.now().strftime('%Y-%m-%d')

                # iterate all students in DB to ensure absent students get a record
                try:
                    students = attendance.list_students()
                except Exception:
                    students = []

                for s in students:
                    # s is (id, roll_number, name)
                    name = s[2]
                    detected = self.detect_counts.get(name, 0)
                    percent = (detected / total) * 100.0
                    if percent > 80.0:
                        status = 'Present'
                    elif 50.0 <= percent <= 80.0:
                        status = 'Partial'
                    else:
                        status = 'Absent'

                    # record final status with session end timestamp
                    try:
                        attendance.record_attendance_status(name, status, timestamp=session_time, date=session_date)
                    except Exception as e:
                        print(f"Error recording final status for {name}: {e}")

                # Export today's report automatically
                try:
                    attendance.export_today_csv(date=session_date, session_time=session_time)
                except Exception as e:
                    print(f"Error exporting today's CSV: {e}")
        except Exception as e:
            print(f"Finalization error: {e}")


if __name__ == "__main__":
    fr = FaceRecognition()
    fr.run_recognition()
