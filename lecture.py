import sqlite3
from datetime import datetime
import os
import traceback
import json

# Use the same database as attendance
DB_NAME = os.path.join(os.path.dirname(__file__), 'attendance.db')


def init_lecture_db(db_path=DB_NAME):
    """Initialize lecture-related tables in the database."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Lecture sessions table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS lecture_sessions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                chapter TEXT NOT NULL,
                title TEXT,
                start_time TEXT NOT NULL,
                end_time TEXT,
                status TEXT DEFAULT 'active',
                current_section INTEGER DEFAULT 0,
                total_sections INTEGER DEFAULT 0,
                checkpoint_interval INTEGER DEFAULT 300,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Lecture attendance checkpoints table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS lecture_attendance(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                checkpoint_time TEXT NOT NULL,
                checkpoint_number INTEGER NOT NULL,
                status TEXT DEFAULT 'Absent',
                recognition_method TEXT,
                teacher_override BOOLEAN DEFAULT 0,
                override_notes TEXT,
                override_time TEXT,
                FOREIGN KEY(session_id) REFERENCES lecture_sessions(id),
                FOREIGN KEY(student_id) REFERENCES students(id)
            )
        ''')

        # Lecture content table (for caching generated content)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS lecture_content(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                chapter TEXT NOT NULL,
                content_json TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(subject, chapter)
            )
        ''')

        # MCQ Tests table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS mcq_tests(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                subject TEXT NOT NULL,
                chapter TEXT NOT NULL,
                questions_json TEXT NOT NULL,
                duration_minutes INTEGER DEFAULT 5,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES lecture_sessions(id)
            )
        ''')

        # MCQ Responses table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS mcq_responses(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                test_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                answers_json TEXT NOT NULL,
                score INTEGER,
                total_questions INTEGER,
                submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(test_id) REFERENCES mcq_tests(id),
                FOREIGN KEY(student_id) REFERENCES students(id)
            )
        ''')

        # Study Plans table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS study_plans(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                chapter TEXT NOT NULL,
                plan_json TEXT NOT NULL,
                topics_for_today TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(subject, chapter)
            )
        ''')

        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"init_lecture_db: Failed to initialize lecture database: {e}")
        traceback.print_exc()
        return False


def create_lecture_session(subject, chapter, title=None, checkpoint_interval=300, db_path=DB_NAME):
    """Create a new lecture session."""
    try:
        now = datetime.now()
        start_time = now.strftime('%Y-%m-%d %H:%M:%S')
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            INSERT INTO lecture_sessions 
            (subject, chapter, title, start_time, status, checkpoint_interval)
            VALUES (?, ?, ?, ?, 'active', ?)
        ''', (subject, chapter, title or f"{subject} - {chapter}", start_time, checkpoint_interval))
        
        session_id = cur.lastrowid
        conn.commit()
        conn.close()
        
        return session_id
    except Exception as e:
        print(f"create_lecture_session: Error: {e}")
        traceback.print_exc()
        return None


def get_active_lecture_session(db_path=DB_NAME):
    """Get the currently active lecture session."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            SELECT id, subject, chapter, title, start_time, current_section, 
                   total_sections, checkpoint_interval, status
            FROM lecture_sessions
            WHERE status = 'active'
            ORDER BY id DESC
            LIMIT 1
        ''')
        
        row = cur.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'subject': row[1],
                'chapter': row[2],
                'title': row[3],
                'start_time': row[4],
                'current_section': row[5],
                'total_sections': row[6],
                'checkpoint_interval': row[7],
                'status': row[8]
            }
        return None
    except Exception as e:
        print(f"get_active_lecture_session: Error: {e}")
        traceback.print_exc()
        return None


def end_lecture_session(session_id, db_path=DB_NAME):
    """End a lecture session."""
    try:
        now = datetime.now()
        end_time = now.strftime('%Y-%m-%d %H:%M:%S')
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            UPDATE lecture_sessions
            SET end_time = ?, status = 'completed'
            WHERE id = ?
        ''', (end_time, session_id))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"end_lecture_session: Error: {e}")
        traceback.print_exc()
        return False


def update_lecture_progress(session_id, current_section, total_sections=None, db_path=DB_NAME):
    """Update the current progress of a lecture session."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        if total_sections:
            cur.execute('''
                UPDATE lecture_sessions
                SET current_section = ?, total_sections = ?
                WHERE id = ?
            ''', (current_section, total_sections, session_id))
        else:
            cur.execute('''
                UPDATE lecture_sessions
                SET current_section = ?
                WHERE id = ?
            ''', (current_section, session_id))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"update_lecture_progress: Error: {e}")
        traceback.print_exc()
        return False


def record_lecture_attendance(session_id, student_id, checkpoint_number, 
                              status='Present', recognition_method='manual', db_path=DB_NAME):
    """Record attendance at a checkpoint."""
    try:
        now = datetime.now()
        checkpoint_time = now.strftime('%Y-%m-%d %H:%M:%S')
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Check if attendance already recorded for this checkpoint
        cur.execute('''
            SELECT id FROM lecture_attendance
            WHERE session_id = ? AND student_id = ? AND checkpoint_number = ?
        ''', (session_id, student_id, checkpoint_number))
        
        if cur.fetchone():
            # Update existing record
            cur.execute('''
                UPDATE lecture_attendance
                SET status = ?, recognition_method = ?, checkpoint_time = ?
                WHERE session_id = ? AND student_id = ? AND checkpoint_number = ?
            ''', (status, recognition_method, checkpoint_time, session_id, student_id, checkpoint_number))
        else:
            # Insert new record
            cur.execute('''
                INSERT INTO lecture_attendance
                (session_id, student_id, checkpoint_time, checkpoint_number, status, recognition_method)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (session_id, student_id, checkpoint_time, checkpoint_number, status, recognition_method))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"record_lecture_attendance: Error: {e}")
        traceback.print_exc()
        return False


def override_lecture_attendance(session_id, student_id, checkpoint_number, 
                                status, notes=None, db_path=DB_NAME):
    """Teacher override for attendance."""
    try:
        now = datetime.now()
        override_time = now.strftime('%Y-%m-%d %H:%M:%S')
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Update or insert attendance with override flag
        cur.execute('''
            SELECT id FROM lecture_attendance
            WHERE session_id = ? AND student_id = ? AND checkpoint_number = ?
        ''', (session_id, student_id, checkpoint_number))
        
        if cur.fetchone():
            cur.execute('''
                UPDATE lecture_attendance
                SET status = ?, teacher_override = 1, override_notes = ?, override_time = ?
                WHERE session_id = ? AND student_id = ? AND checkpoint_number = ?
            ''', (status, notes, override_time, session_id, student_id, checkpoint_number))
        else:
            checkpoint_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cur.execute('''
                INSERT INTO lecture_attendance
                (session_id, student_id, checkpoint_time, checkpoint_number, status, 
                 teacher_override, override_notes, override_time)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            ''', (session_id, student_id, checkpoint_time, checkpoint_number, status, notes, override_time))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"override_lecture_attendance: Error: {e}")
        traceback.print_exc()
        return False


def get_lecture_attendance(session_id, db_path=DB_NAME):
    """Get all attendance records for a lecture session."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            SELECT la.id, la.student_id, s.roll_number, s.name, la.checkpoint_number,
                   la.checkpoint_time, la.status, la.recognition_method,
                   la.teacher_override, la.override_notes, la.override_time
            FROM lecture_attendance la
            LEFT JOIN students s ON la.student_id = s.id
            WHERE la.session_id = ?
            ORDER BY la.checkpoint_number, s.roll_number
        ''', (session_id,))
        
        rows = cur.fetchall()
        conn.close()
        
        attendance_data = []
        for row in rows:
            attendance_data.append({
                'id': row[0],
                'student_id': row[1],
                'roll_number': row[2],
                'name': row[3],
                'checkpoint_number': row[4],
                'checkpoint_time': row[5],
                'status': row[6],
                'recognition_method': row[7],
                'teacher_override': bool(row[8]),
                'override_notes': row[9],
                'override_time': row[10]
            })
        
        return attendance_data
    except Exception as e:
        print(f"get_lecture_attendance: Error: {e}")
        traceback.print_exc()
        return []


def get_attendance_summary(session_id, db_path=DB_NAME):
    """Get attendance summary for a session (students with all checkpoints)."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Get all students
        cur.execute('SELECT id, roll_number, name FROM students ORDER BY roll_number')
        students = cur.fetchall()
        
        # Get all checkpoints for this session
        cur.execute('''
            SELECT DISTINCT checkpoint_number
            FROM lecture_attendance
            WHERE session_id = ?
            ORDER BY checkpoint_number
        ''', (session_id,))
        checkpoints = [row[0] for row in cur.fetchall()]
        
        summary = []
        for student_id, roll_number, name in students:
            student_attendance = {
                'student_id': student_id,
                'roll_number': roll_number,
                'name': name,
                'checkpoints': {}
            }
            
            # Get attendance for each checkpoint
            for checkpoint in checkpoints:
                cur.execute('''
                    SELECT status, teacher_override, recognition_method
                    FROM lecture_attendance
                    WHERE session_id = ? AND student_id = ? AND checkpoint_number = ?
                ''', (session_id, student_id, checkpoint))
                
                row = cur.fetchone()
                if row:
                    student_attendance['checkpoints'][checkpoint] = {
                        'status': row[0],
                        'teacher_override': bool(row[1]),
                        'recognition_method': row[2]
                    }
                else:
                    student_attendance['checkpoints'][checkpoint] = {
                        'status': 'Absent',
                        'teacher_override': False,
                        'recognition_method': None
                    }
            
            # Calculate overall status
            present_count = sum(1 for cp in student_attendance['checkpoints'].values() 
                              if cp['status'] == 'Present')
            total_checkpoints = len(checkpoints) if checkpoints else 1
            attendance_percent = (present_count / total_checkpoints * 100) if total_checkpoints > 0 else 0
            
            student_attendance['present_count'] = present_count
            student_attendance['total_checkpoints'] = total_checkpoints
            student_attendance['attendance_percent'] = round(attendance_percent, 2)
            
            if attendance_percent >= 80:
                student_attendance['overall_status'] = 'Present'
            elif attendance_percent >= 50:
                student_attendance['overall_status'] = 'Partial'
            else:
                student_attendance['overall_status'] = 'Absent'
            
            summary.append(student_attendance)
        
        conn.close()
        return summary
    except Exception as e:
        print(f"get_attendance_summary: Error: {e}")
        traceback.print_exc()
        return []


def save_lecture_content(subject, chapter, content_json, db_path=DB_NAME):
    """Save or update lecture content."""
    try:
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        content_str = json.dumps(content_json) if isinstance(content_json, dict) else content_json
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Check if content exists
        cur.execute('SELECT id FROM lecture_content WHERE subject = ? AND chapter = ?', 
                   (subject, chapter))
        
        if cur.fetchone():
            # Update
            cur.execute('''
                UPDATE lecture_content
                SET content_json = ?, updated_at = ?
                WHERE subject = ? AND chapter = ?
            ''', (content_str, now, subject, chapter))
        else:
            # Insert
            cur.execute('''
                INSERT INTO lecture_content (subject, chapter, content_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (subject, chapter, content_str, now, now))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"save_lecture_content: Error: {e}")
        traceback.print_exc()
        return False


def get_lecture_content(subject, chapter, db_path=DB_NAME):
    """Get cached lecture content."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            SELECT content_json FROM lecture_content
            WHERE subject = ? AND chapter = ?
        ''', (subject, chapter))
        
        row = cur.fetchone()
        conn.close()
        
        if row:
            return json.loads(row[0])
        return None
    except Exception as e:
        print(f"get_lecture_content: Error: {e}")
        traceback.print_exc()
        return None


def save_mcq_test(session_id, subject, chapter, questions_json, duration_minutes=5, db_path=DB_NAME):
    """Save a generated MCQ test."""
    try:
        questions_str = json.dumps(questions_json) if isinstance(questions_json, dict) else questions_json
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            INSERT INTO mcq_tests
            (session_id, subject, chapter, questions_json, duration_minutes)
            VALUES (?, ?, ?, ?, ?)
        ''', (session_id, subject, chapter, questions_str, duration_minutes))
        
        test_id = cur.lastrowid
        conn.commit()
        conn.close()
        return test_id
    except Exception as e:
        print(f"save_mcq_test: Error: {e}")
        traceback.print_exc()
        return None


def get_mcq_test(test_id, db_path=DB_NAME):
    """Get an MCQ test by ID."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            SELECT id, session_id, subject, chapter, questions_json, duration_minutes, created_at
            FROM mcq_tests WHERE id = ?
        ''', (test_id,))
        
        row = cur.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'session_id': row[1],
                'subject': row[2],
                'chapter': row[3],
                'questions': json.loads(row[4]),
                'duration_minutes': row[5],
                'created_at': row[6]
            }
        return None
    except Exception as e:
        print(f"get_mcq_test: Error: {e}")
        traceback.print_exc()
        return None


def get_mcq_test_by_session(session_id, db_path=DB_NAME):
    """Get MCQ test for a session."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            SELECT id, session_id, subject, chapter, questions_json, duration_minutes, created_at
            FROM mcq_tests WHERE session_id = ?
            ORDER BY id DESC LIMIT 1
        ''', (session_id,))
        
        row = cur.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'session_id': row[1],
                'subject': row[2],
                'chapter': row[3],
                'questions': json.loads(row[4]),
                'duration_minutes': row[5],
                'created_at': row[6]
            }
        return None
    except Exception as e:
        print(f"get_mcq_test_by_session: Error: {e}")
        traceback.print_exc()
        return None


def save_mcq_response(test_id, student_id, answers_json, score=None, total_questions=None, db_path=DB_NAME):
    """Save student's MCQ test response."""
    try:
        answers_str = json.dumps(answers_json) if isinstance(answers_json, dict) else answers_json
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            INSERT INTO mcq_responses
            (test_id, student_id, answers_json, score, total_questions)
            VALUES (?, ?, ?, ?, ?)
        ''', (test_id, student_id, answers_str, score, total_questions))
        
        response_id = cur.lastrowid
        conn.commit()
        conn.close()
        return response_id
    except Exception as e:
        print(f"save_mcq_response: Error: {e}")
        traceback.print_exc()
        return None


def save_study_plan(subject, chapter, plan_json, topics_for_today=None, db_path=DB_NAME):
    """Save or update study plan."""
    try:
        plan_str = json.dumps(plan_json) if isinstance(plan_json, dict) else plan_json
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('SELECT id FROM study_plans WHERE subject = ? AND chapter = ?', 
                   (subject, chapter))
        
        if cur.fetchone():
            cur.execute('''
                UPDATE study_plans
                SET plan_json = ?, topics_for_today = ?
                WHERE subject = ? AND chapter = ?
            ''', (plan_str, topics_for_today, subject, chapter))
        else:
            cur.execute('''
                INSERT INTO study_plans (subject, chapter, plan_json, topics_for_today)
                VALUES (?, ?, ?, ?)
            ''', (subject, chapter, plan_str, topics_for_today))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"save_study_plan: Error: {e}")
        traceback.print_exc()
        return False


def get_study_plan(subject, chapter, db_path=DB_NAME):
    """Get study plan."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        cur.execute('''
            SELECT plan_json, topics_for_today FROM study_plans
            WHERE subject = ? AND chapter = ?
        ''', (subject, chapter))
        
        row = cur.fetchone()
        conn.close()
        
        if row:
            return {
                'plan': json.loads(row[0]),
                'topics_for_today': row[1]
            }
        return None
    except Exception as e:
        print(f"get_study_plan: Error: {e}")
        traceback.print_exc()
        return None

