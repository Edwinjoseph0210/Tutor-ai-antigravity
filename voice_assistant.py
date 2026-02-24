
import threading
import time
import os
import sqlite3
from datetime import datetime

# Audio libraries
try:
    import speech_recognition as sr
    SPEECH_AVAILABLE = True
except ImportError:
    SPEECH_AVAILABLE = False
    print("Warning: speech_recognition not found. Voice features disabled.")

try:
    import pyttsx3
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    print("Warning: pyttsx3 not found. TTS features disabled.")

# Database path (relative to project root usually)
DB_NAME = 'attendance.db'

class VoiceAssistant:
    def __init__(self):
        global SPEECH_AVAILABLE, TTS_AVAILABLE
        self.recognizer = None
        self.microphone = None
        self.tts_engine = None
        
        if SPEECH_AVAILABLE:
            self.recognizer = sr.Recognizer()
            try:
                self.microphone = sr.Microphone()
            except Exception as e:
                print(f"Error initializing microphone: {e}")
                SPEECH_AVAILABLE = False
                
        if TTS_AVAILABLE:
            try:
                self.tts_engine = pyttsx3.init()
                self.tts_engine.setProperty('rate', 150)
            except Exception as e:
                print(f"Error initializing TTS: {e}")
                TTS_AVAILABLE = False

    def speak(self, text):
        if not TTS_AVAILABLE:
            print(f"TTS (Simulated): {text}")
            return
        
        print(f"TTS: {text}")
        try:
            # TTS engine runAndWait can finish the loop, so we run in thread if needed
            # But simple phrases are fast.
            self.tts_engine.say(text)
            self.tts_engine.runAndWait()
        except Exception as e:
            print(f"TTS Error: {e}")

    def listen_and_process(self, student_id, lecture_id, callback_reset_status):
        """
        Listens for trigger word 'Doubt' or 'Excuse me', then captures doubt.
        Executed in a separate thread.
        """
        if not SPEECH_AVAILABLE:
            print("Speech recognition unavailable.")
            callback_reset_status(student_id)
            return

        print(f"🎙 Listening for doubt from {student_id}...")
        
        try:
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=1)
                
                # Step 1: Trigger Word - "Activate microphone listener"
                # User prompt: "Detect trigger word: 'Doubt' or 'Excuse me'"
                # Wait up to 10 seconds for trigger
                try:
                    audio = self.recognizer.listen(source, timeout=10, phrase_time_limit=3)
                    text = self.recognizer.recognize_google(audio).lower()
                    print(f"Heard potential trigger: {text}")
                    
                    if "doubt" in text or "excuse me" in text or "question" in text:
                        self.process_doubt_interaction(student_id, lecture_id, source)
                    else:
                        print(f"No trigger detected (heard: {text}). Resetting.")
                except sr.WaitTimeoutError:
                    print("Timeout waiting for trigger.")
                except sr.UnknownValueError:
                    print("Could not understand audio.")
                except Exception as e:
                    print(f"Error in listen loop: {e}")
                    
        except Exception as e:
            print(f"Microphone error: {e}")
        finally:
            callback_reset_status(student_id)

    def process_doubt_interaction(self, student_id, lecture_id, source):
        # Step 2: System responds
        self.speak("What is your doubt?")
        
        # Step 3: Capture Question
        try:
            print("🎙 Listening for question...")
            audio = self.recognizer.listen(source, timeout=15, phrase_time_limit=15)
            question_text = self.recognizer.recognize_google(audio)
            print(f"captured question: {question_text}")
            
            # Step 4: Store Doubt
            self.store_doubt(lecture_id, student_id, question_text)
            
            self.speak("Doubt recorded.")
            
        except sr.WaitTimeoutError:
            self.speak("I didn't hear a question. Please try raising your hand again.")
        except sr.UnknownValueError:
            self.speak("Sorry, I didn't catch that.")
        except Exception as e:
            print(f"Error processing doubt: {e}")

    def store_doubt(self, lecture_id, student_id, question_text):
        try:
            conn = sqlite3.connect(DB_NAME)
            cur = conn.cursor()
            
            # Create table if not exists (ensure backend prompt compliance)
            cur.execute('''
                CREATE TABLE IF NOT EXISTS doubts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lecture_id INTEGER,
                    student_id TEXT,
                    question_text TEXT,
                    verified BOOLEAN DEFAULT 1,
                    timestamp TEXT
                )
            ''')
            
            cur.execute('''
                INSERT INTO doubts (lecture_id, student_id, question_text, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (lecture_id, student_id, question_text, datetime.now().isoformat()))
            
            conn.commit()
            conn.close()
            print(f"✅ Doubt stored for {student_id}: {question_text}")
        except Exception as e:
            print(f"Database error storing doubt: {e}")

# Singleton
voice_assistant = VoiceAssistant()
