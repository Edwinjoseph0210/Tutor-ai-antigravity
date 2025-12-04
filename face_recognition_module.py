import cv2
import os
import numpy as np
import face_recognition
import math
import sys

def face_confidence(face_distance, face_match_threshold=0.6):
    """
    Calculates confidence percentage from face distance.
    """
    range_val = (1.0 - face_match_threshold)
    linear_val = (1.0 - face_distance) / (range_val * 2.0)

    if face_distance > face_match_threshold:
        return str(round(linear_val * 100, 2)) + '%'
    else:
        value = (linear_val + ((1.0 - linear_val) * math.pow((linear_val - 0.5) * 2, 0.2))) * 100
        return str(round(value, 2)) + '%'

class FaceRecognition:
    def __init__(self, dataset_path="faces"):
        """
        Initialize the FaceRecognition class.
        """
        self.dataset_path = dataset_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.process_current_frame = True

    def load_dataset(self):
        """
        Loads images from the dataset path and encodes faces.
        Supports both flat files and subdirectories.
        """
        if not os.path.exists(self.dataset_path):
            print(f"Dataset path '{self.dataset_path}' does not exist.")
            return

        print(f"Loading dataset from {self.dataset_path}...")
        
        image_paths = []
        
        # Walk through the directory to get all image files
        for root, dirs, files in os.walk(self.dataset_path):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    image_paths.append(os.path.join(root, file))
        
        count = 0
        for image_path in image_paths:
            # Determine name based on folder structure or filename
            parent_dir = os.path.basename(os.path.dirname(image_path))
            
            # If parent dir is the dataset folder itself, use filename
            if os.path.abspath(os.path.dirname(image_path)) == os.path.abspath(self.dataset_path):
                filename = os.path.split(image_path)[-1]
                basename = os.path.splitext(filename)[0]
                name = basename.split('_')[0]
                name = ''.join([i for i in name if not i.isdigit()])
            else:
                # Use the subdirectory name as the person's name
                name = parent_dir
            
            try:
                # Load image
                face_image = face_recognition.load_image_file(image_path)
                
                # Encode face
                # We assume one face per image for training. 
                # If multiple faces are found, we might want to skip or take the first one.
                encodings = face_recognition.face_encodings(face_image)
                
                if len(encodings) > 0:
                    face_encoding = encodings[0]
                    self.known_face_encodings.append(face_encoding)
                    self.known_face_names.append(name)
                    count += 1
                    print(f"Encoded {name} from {os.path.basename(image_path)}")
                else:
                    print(f"Warning: No face found in {os.path.basename(image_path)}")
                    
            except Exception as e:
                print(f"Error processing {image_path}: {e}")

        print(f"Dataset loaded. {count} faces encoded.")

    def run(self):
        """
        Starts the webcam loop for real-time face recognition.
        """
        if not self.known_face_encodings:
            print("No faces learned. Please run load_dataset() first.")
            return

        video_capture = cv2.VideoCapture(0)

        if not video_capture.isOpened():
            print('Video Source not found...')
            return

        print("Starting Face Recognition... Press 'q' to quit.")

        while True:
            ret, frame = video_capture.read()
            if not ret:
                break

            # Resize frame of video to 1/4 size for faster face recognition processing
            if self.process_current_frame:
                small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
                
                # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
                # Note: cv2.cvtColor is faster than slicing [:, :, ::-1]
                rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

                # Find all the faces and face encodings in the current frame of video
                self.face_locations = face_recognition.face_locations(rgb_small_frame)
                self.face_encodings = face_recognition.face_encodings(rgb_small_frame, self.face_locations)

                self.face_names = []
                for face_encoding in self.face_encodings:
                    # See if the face is a match for the known face(s)
                    matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
                    name = "Unknown"
                    confidence = "Unknown"

                    # Or instead, use the known face with the smallest distance to the new face
                    face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                    
                    if len(face_distances) > 0:
                        best_match_index = np.argmin(face_distances)
                        if matches[best_match_index]:
                            name = self.known_face_names[best_match_index]
                            confidence = face_confidence(face_distances[best_match_index])

                    self.face_names.append(f'{name} ({confidence})')

            self.process_current_frame = not self.process_current_frame

            # Display the results
            for (top, right, bottom, left), name in zip(self.face_locations, self.face_names):
                # Scale back up face locations since the frame we detected in was scaled to 1/4 size
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4

                # Draw a box around the face
                color = (0, 255, 0) if "Unknown" not in name else (0, 0, 255)
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)

                # Draw a label with a name below the face
                cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
                cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 1)

            cv2.imshow('Face Recognition', frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        video_capture.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    fr = FaceRecognition()
    fr.load_dataset()
    fr.run()
