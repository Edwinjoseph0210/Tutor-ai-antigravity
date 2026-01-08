"""
Database setup script for class structure and student population
Creates classes 1-12 with sections A, B, C
Populates Class 12B with real students and others with dummy data
"""

import sqlite3
import os

DB_NAME = 'attendance.db'

def init_class_structure():
    """Initialize classes and sections tables"""
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    
    # Create classes table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            grade INTEGER NOT NULL,
            name TEXT NOT NULL,
            UNIQUE(grade)
        )
    ''')
    
    # Create sections table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (class_id) REFERENCES classes(id),
            UNIQUE(class_id, name)
        )
    ''')
    
    # Update students table to include class and section
    cur.execute('''
        CREATE TABLE IF NOT EXISTS students_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roll_number TEXT UNIQUE,
            name TEXT NOT NULL,
            class_id INTEGER,
            section_id INTEGER,
            age INTEGER,
            FOREIGN KEY (class_id) REFERENCES classes(id),
            FOREIGN KEY (section_id) REFERENCES sections(id)
        )
    ''')
    
    # Check if old students table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='students'")
    if cur.fetchone():
        # Copy existing students to new table (they'll be assigned to Class 12B)
        cur.execute('''
            INSERT INTO students_new (id, roll_number, name, age)
            SELECT id, roll_number, name, NULL FROM students
        ''')
        # Drop old table
        cur.execute('DROP TABLE students')
    
    # Rename new table to students
    cur.execute('ALTER TABLE students_new RENAME TO students')
    
    conn.commit()
    conn.close()
    print("✓ Database schema initialized")

def populate_classes_and_sections():
    """Populate classes 1-12 with sections A, B, C"""
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    
    # Insert classes 1-12
    for grade in range(1, 13):
        cur.execute('''
            INSERT OR IGNORE INTO classes (grade, name) 
            VALUES (?, ?)
        ''', (grade, f'Class {grade}'))
    
    # Insert sections A, B, C for each class
    cur.execute('SELECT id, grade FROM classes')
    classes = cur.fetchall()
    
    for class_id, grade in classes:
        for section in ['A', 'B', 'C']:
            cur.execute('''
                INSERT OR IGNORE INTO sections (class_id, name)
                VALUES (?, ?)
            ''', (class_id, section))
    
    conn.commit()
    conn.close()
    print("✓ Classes 1-12 with sections A, B, C created")

def get_real_students():
    """Get currently registered real students from faces directory"""
    faces_dir = 'faces'
    real_students = []
    
    if os.path.exists(faces_dir):
        for item in os.listdir(faces_dir):
            item_path = os.path.join(faces_dir, item)
            if os.path.isdir(item_path):
                real_students.append(item)
    
    return sorted(real_students)

def populate_students():
    """Populate students: Class 12B with real students, others with dummy data"""
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    
    # Get Class 12, Section B IDs
    cur.execute('''
        SELECT c.id, s.id 
        FROM classes c 
        JOIN sections s ON c.id = s.class_id 
        WHERE c.grade = 12 AND s.name = 'B'
    ''')
    class_12b = cur.fetchone()
    
    if not class_12b:
        print("⚠ Class 12B not found")
        conn.close()
        return
    
    class_12b_id, section_12b_id = class_12b
    
    # Get real students from faces directory
    real_students = get_real_students()
    
    # Clear existing students (except those with face data)
    cur.execute('DELETE FROM students WHERE class_id IS NULL')
    
    # Populate Class 12B with real students
    print(f"\n✓ Populating Class 12B with {len(real_students)} real students:")
    for idx, student_name in enumerate(real_students, 1):
        roll_number = f'12B{idx:03d}'
        cur.execute('''
            INSERT OR REPLACE INTO students (roll_number, name, class_id, section_id, age)
            VALUES (?, ?, ?, ?, ?)
        ''', (roll_number, student_name, class_12b_id, section_12b_id, 17))
        print(f"  {idx}. {student_name} (Roll: {roll_number})")
    
    # Dummy student names for other classes
    first_names = [
        'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun',
        'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan',
        'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari',
        'Anvi', 'Navya', 'Aaradhya', 'Kiara', 'Myra'
    ]
    
    last_names = [
        'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh',
        'Reddy', 'Nair', 'Iyer', 'Joshi', 'Gupta',
        'Rao', 'Desai', 'Mehta', 'Shah', 'Pillai',
        'Menon', 'Bhat', 'Agarwal', 'Malhotra', 'Kapoor'
    ]
    
    # Get all class-section combinations except Class 12B
    cur.execute('''
        SELECT c.id, c.grade, s.id, s.name 
        FROM classes c 
        JOIN sections s ON c.id = s.class_id 
        WHERE NOT (c.grade = 12 AND s.name = 'B')
        ORDER BY c.grade, s.name
    ''')
    class_sections = cur.fetchall()
    
    print(f"\n✓ Populating {len(class_sections)} class-sections with 20 dummy students each:")
    
    for class_id, grade, section_id, section_name in class_sections:
        print(f"  Class {grade}{section_name}...")
        for i in range(20):
            first_name = first_names[i % len(first_names)]
            last_name = last_names[i % len(last_names)]
            student_name = f"{first_name} {last_name}"
            roll_number = f'{grade}{section_name}{i+1:03d}'
            age = 5 + grade  # Approximate age based on grade
            
            cur.execute('''
                INSERT OR IGNORE INTO students (roll_number, name, class_id, section_id, age)
                VALUES (?, ?, ?, ?, ?)
            ''', (roll_number, student_name, class_id, section_id, age))
    
    conn.commit()
    
    # Print summary
    cur.execute('SELECT COUNT(*) FROM students')
    total_students = cur.fetchone()[0]
    
    conn.close()
    
    print(f"\n✓ Total students in database: {total_students}")
    print(f"  - Real students (Class 12B): {len(real_students)}")
    print(f"  - Dummy students: {total_students - len(real_students)}")

def main():
    print("=" * 60)
    print("Setting up Class Structure and Student Data")
    print("=" * 60)
    
    init_class_structure()
    populate_classes_and_sections()
    populate_students()
    
    print("\n" + "=" * 60)
    print("✓ Setup Complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()
