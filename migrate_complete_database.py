"""
Comprehensive Database Migration Script for AI Tutor System
Ensures all required tables exist with proper schema and relationships.
This script safely migrates existing databases and creates missing tables.
"""

import sqlite3
import os
from datetime import datetime

# Database paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AUTH_DB_PATH = os.path.join(SCRIPT_DIR, 'auth.db')
ATTENDANCE_DB_PATH = os.path.join(SCRIPT_DIR, 'attendance.db')

def safe_add_column(cursor, table, column, column_type_and_default):
    """Safely add a column if it doesn't exist"""
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in cursor.fetchall()]
        if column not in columns:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_type_and_default}")
            print(f"  ✓ Added column {column} to {table}")
        else:
            print(f"  - Column {column} already exists in {table}")
    except Exception as e:
        print(f"  ⚠ Error adding column {column} to {table}: {e}")

def migrate_auth_database():
    """Migrate auth.db - handles user management and teaching sessions"""
    print(f"\n📊 Migrating auth database: {AUTH_DB_PATH}")
    
    conn = sqlite3.connect(AUTH_DB_PATH)
    cur = conn.cursor()
    
    print("📋 Creating/updating users table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'student',
            student_class TEXT,
            email TEXT DEFAULT '',
            roll_no TEXT DEFAULT '',
            full_name TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add missing columns to users table
    safe_add_column(cur, 'users', 'email', 'TEXT DEFAULT ""')
    safe_add_column(cur, 'users', 'roll_no', 'TEXT DEFAULT ""')
    safe_add_column(cur, 'users', 'full_name', 'TEXT DEFAULT ""')
    safe_add_column(cur, 'users', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP')
    safe_add_column(cur, 'users', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP')
    
    print("📋 Creating teaching_sessions table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS teaching_sessions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_name TEXT NOT NULL,
            subject TEXT,
            class_name TEXT,
            teacher_id INTEGER,
            status TEXT DEFAULT 'created',
            start_time TEXT,
            end_time TEXT,
            duration INTEGER DEFAULT 45,
            description TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(teacher_id) REFERENCES users(id)
        )
    ''')
    
    # Add missing columns to teaching_sessions
    safe_add_column(cur, 'teaching_sessions', 'end_time', 'TEXT')
    safe_add_column(cur, 'teaching_sessions', 'description', 'TEXT DEFAULT ""')
    safe_add_column(cur, 'teaching_sessions', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP')
    
    print("📋 Creating session_materials table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS session_materials(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            filename TEXT,
            filepath TEXT,
            file_text TEXT,
            file_type TEXT DEFAULT 'pdf',
            file_size INTEGER DEFAULT 0,
            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
            processed BOOLEAN DEFAULT 0,
            FOREIGN KEY(session_id) REFERENCES teaching_sessions(id)
        )
    ''')
    
    # Add missing columns to session_materials
    safe_add_column(cur, 'session_materials', 'file_type', 'TEXT DEFAULT "pdf"')
    safe_add_column(cur, 'session_materials', 'file_size', 'INTEGER DEFAULT 0')
    safe_add_column(cur, 'session_materials', 'processed', 'BOOLEAN DEFAULT 0')
    
    print("📋 Creating session_lectures table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS session_lectures(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            material_id INTEGER,
            title TEXT NOT NULL,
            content TEXT,
            order_index INTEGER DEFAULT 0,
            source_file TEXT,
            generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES teaching_sessions(id),
            FOREIGN KEY(material_id) REFERENCES session_materials(id)
        )
    ''')
    
    # Add missing columns to session_lectures
    safe_add_column(cur, 'session_lectures', 'source_file', 'TEXT')
    safe_add_column(cur, 'session_lectures', 'generated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP')
    
    print("📋 Creating session_attendance table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS session_attendance(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            student_id INTEGER,
            status TEXT DEFAULT 'absent',
            marked_at TEXT,
            detection_method TEXT DEFAULT 'manual',
            confidence REAL DEFAULT 0.0,
            FOREIGN KEY(session_id) REFERENCES teaching_sessions(id),
            FOREIGN KEY(student_id) REFERENCES users(id)
        )
    ''')
    
    # Add missing columns to session_attendance
    safe_add_column(cur, 'session_attendance', 'detection_method', 'TEXT DEFAULT "manual"')
    safe_add_column(cur, 'session_attendance', 'confidence', 'REAL DEFAULT 0.0')
    
    # Create default admin user if no users exist
    cur.execute('SELECT COUNT(*) FROM users')
    if cur.fetchone()[0] == 0:
        print("👤 Creating default users...")
        from werkzeug.security import generate_password_hash
        
        # Default admin
        admin_password = generate_password_hash('admin123')
        cur.execute('''INSERT INTO users (username, password_hash, role, full_name, email) 
                      VALUES (?, ?, ?, ?, ?)''', 
                   ('admin', admin_password, 'teacher', 'System Administrator', 'admin@example.com'))
        
        # Default student
        student_password = generate_password_hash('student123')
        cur.execute('''INSERT INTO users (username, password_hash, role, student_class, full_name, email, roll_no) 
                      VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                   ('student1', student_password, 'student', 'Class 10', 'Demo Student', 'student@example.com', '001'))
    
    conn.commit()
    conn.close()
    print("✅ Auth database migration complete!")

def migrate_attendance_database():
    """Migrate attendance.db - handles attendance, lectures, materials, and analytics"""
    print(f"\n📊 Migrating attendance database: {ATTENDANCE_DB_PATH}")
    
    conn = sqlite3.connect(ATTENDANCE_DB_PATH)
    cur = conn.cursor()
    
    print("📋 Creating/updating students table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS students(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roll_number TEXT UNIQUE,
            name TEXT,
            email TEXT DEFAULT '',
            class_name TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add missing columns to students
    safe_add_column(cur, 'students', 'email', 'TEXT DEFAULT ""')
    safe_add_column(cur, 'students', 'class_name', 'TEXT DEFAULT ""')
    safe_add_column(cur, 'students', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP')
    
    print("📋 Creating attendance table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS attendance(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            date TEXT,
            time TEXT,
            status TEXT,
            session_id INTEGER,
            detection_method TEXT DEFAULT 'manual',
            confidence REAL DEFAULT 0.0,
            FOREIGN KEY(student_id) REFERENCES students(id)
        )
    ''')
    
    # Add missing columns to attendance
    safe_add_column(cur, 'attendance', 'session_id', 'INTEGER')
    safe_add_column(cur, 'attendance', 'detection_method', 'TEXT DEFAULT "manual"')
    safe_add_column(cur, 'attendance', 'confidence', 'REAL DEFAULT 0.0')
    
    print("📋 Creating sessions table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS sessions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            start_time TEXT,
            end_time TEXT,
            class_name TEXT,
            subject TEXT,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    # Add missing columns to sessions
    safe_add_column(cur, 'sessions', 'end_time', 'TEXT')
    safe_add_column(cur, 'sessions', 'class_name', 'TEXT')
    safe_add_column(cur, 'sessions', 'subject', 'TEXT')
    safe_add_column(cur, 'sessions', 'status', 'TEXT DEFAULT "active"')
    
    print("📋 Creating materials table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER,
            subject TEXT,
            filename TEXT,
            filepath TEXT,
            upload_date TEXT,
            processing_status TEXT DEFAULT 'pending',
            total_topics INTEGER DEFAULT 0,
            file_type TEXT DEFAULT 'pdf',
            file_size INTEGER DEFAULT 0
        )
    ''')
    
    # Add missing columns to materials
    safe_add_column(cur, 'materials', 'processing_status', 'TEXT DEFAULT "pending"')
    safe_add_column(cur, 'materials', 'total_topics', 'INTEGER DEFAULT 0')
    safe_add_column(cur, 'materials', 'file_type', 'TEXT DEFAULT "pdf"')
    safe_add_column(cur, 'materials', 'file_size', 'INTEGER DEFAULT 0')
    
    print("📋 Creating topics table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            material_id INTEGER,
            class_id INTEGER,
            subject TEXT,
            title TEXT NOT NULL,
            description TEXT,
            content TEXT,
            order_index INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id)
        )
    ''')
    
    # Add missing columns to topics
    safe_add_column(cur, 'topics', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP')
    
    print("📋 Creating lecture_sessions table...")
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
    
    print("📋 Creating lecture_attendance table...")
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
    
    print("📋 Creating analytics tables...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS student_lecture_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lecture_id INTEGER,
            student_id TEXT,
            attention_score REAL,
            discipline_score REAL,
            confusion_moments INTEGER,
            absence_duration REAL,
            timestamp TEXT
        )
    ''')
    
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
    
    print("📋 Creating scheduled_lectures table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS scheduled_lectures(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER,
            section_id INTEGER,
            topic_id INTEGER,
            subject TEXT,
            title TEXT,
            scheduled_time TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 30,
            status TEXT DEFAULT 'pending',
            created_by INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    print("📋 Creating lecture_content cache table...")
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
    
    print("📋 Creating MCQ and study plan tables...")
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
    print("✅ Attendance database migration complete!")

def create_database_indexes():
    """Create database indexes for better performance"""
    print("\n🚀 Creating database indexes for performance...")
    
    # Auth DB indexes
    auth_conn = sqlite3.connect(AUTH_DB_PATH)
    auth_cur = auth_conn.cursor()
    
    try:
        auth_cur.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
        auth_cur.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)')
        auth_cur.execute('CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON teaching_sessions(teacher_id)')
        auth_cur.execute('CREATE INDEX IF NOT EXISTS idx_sessions_status ON teaching_sessions(status)')
        auth_cur.execute('CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id)')
        print("✅ Auth database indexes created")
    except Exception as e:
        print(f"⚠ Some auth indexes may already exist: {e}")
    
    auth_conn.commit()
    auth_conn.close()
    
    # Attendance DB indexes
    att_conn = sqlite3.connect(ATTENDANCE_DB_PATH)
    att_cur = att_conn.cursor()
    
    try:
        att_cur.execute('CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number)')
        att_cur.execute('CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)')
        att_cur.execute('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)')
        att_cur.execute('CREATE INDEX IF NOT EXISTS idx_materials_class_subject ON materials(class_id, subject)')
        att_cur.execute('CREATE INDEX IF NOT EXISTS idx_topics_material ON topics(material_id)')
        att_cur.execute('CREATE INDEX IF NOT EXISTS idx_lecture_attendance_session ON lecture_attendance(session_id)')
        print("✅ Attendance database indexes created")
    except Exception as e:
        print(f"⚠ Some attendance indexes may already exist: {e}")
    
    att_conn.commit()
    att_conn.close()

def verify_database_schema():
    """Verify that all tables and columns exist"""
    print("\n🔍 Verifying database schemas...")
    
    expected_auth_tables = [
        'users', 'teaching_sessions', 'session_materials', 
        'session_lectures', 'session_attendance'
    ]
    
    expected_attendance_tables = [
        'students', 'attendance', 'sessions', 'materials', 'topics',
        'lecture_sessions', 'lecture_attendance', 'student_lecture_scores',
        'doubts', 'scheduled_lectures', 'lecture_content', 'mcq_tests',
        'mcq_responses', 'study_plans'
    ]
    
    # Check auth.db
    auth_conn = sqlite3.connect(AUTH_DB_PATH)
    auth_cur = auth_conn.cursor()
    auth_cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    auth_tables = [row[0] for row in auth_cur.fetchall()]
    auth_conn.close()
    
    print("📊 Auth database tables:")
    for table in expected_auth_tables:
        if table in auth_tables:
            print(f"  ✅ {table}")
        else:
            print(f"  ❌ {table} - MISSING!")
    
    # Check attendance.db
    att_conn = sqlite3.connect(ATTENDANCE_DB_PATH)
    att_cur = att_conn.cursor()
    att_cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    att_tables = [row[0] for row in att_cur.fetchall()]
    att_conn.close()
    
    print("📊 Attendance database tables:")
    for table in expected_attendance_tables:
        if table in att_tables:
            print(f"  ✅ {table}")
        else:
            print(f"  ❌ {table} - MISSING!")

def main():
    """Run complete database migration"""
    print("🚀 Starting comprehensive database migration...")
    print(f"📁 Working directory: {SCRIPT_DIR}")
    print(f"📊 Auth DB: {AUTH_DB_PATH}")
    print(f"📊 Attendance DB: {ATTENDANCE_DB_PATH}")
    
    # Run migrations
    migrate_auth_database()
    migrate_attendance_database()
    create_database_indexes()
    verify_database_schema()
    
    print("\n✅ Database migration completed successfully!")
    print("📝 All user data, session data, and analytics tables are now ready.")
    print("🔧 You can now run the application with all features enabled.")

if __name__ == "__main__":
    main()