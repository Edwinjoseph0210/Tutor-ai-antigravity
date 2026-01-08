import sqlite3
import os

DB_NAME = 'attendance.db'

def migrate_attendance_table():
    print(f"Migrating database: {os.path.abspath(DB_NAME)}")
    
    if not os.path.exists(DB_NAME):
        print(f"Error: Database {DB_NAME} not found!")
        return

    try:
        conn = sqlite3.connect(DB_NAME)
        cur = conn.cursor()
        
        # Get current columns
        cur.execute("PRAGMA table_info(attendance)")
        columns = [info[1] for info in cur.fetchall()]
        print(f"Current columns: {columns}")
        
        # Add class_id if missing
        if 'class_id' not in columns:
            print("Adding class_id column...")
            cur.execute("ALTER TABLE attendance ADD COLUMN class_id INTEGER")
            print("✓ Added class_id column")
        else:
            print("✓ class_id column exists")

        # Add section_id if missing
        if 'section_id' not in columns:
            print("Adding section_id column...")
            cur.execute("ALTER TABLE attendance ADD COLUMN section_id INTEGER")
            print("✓ Added section_id column")
        else:
            print("✓ section_id column exists")

        # Add subject if missing
        if 'subject' not in columns:
            print("Adding subject column...")
            cur.execute("ALTER TABLE attendance ADD COLUMN subject TEXT")
            print("✓ Added subject column")
        else:
            print("✓ subject column exists")

        # Add period if missing
        if 'period' not in columns:
            print("Adding period column...")
            cur.execute("ALTER TABLE attendance ADD COLUMN period TEXT")
            print("✓ Added period column")
        else:
            print("✓ period column exists")

        conn.commit()
        conn.close()
        print("\n✅ Attendance table migration complete!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")

if __name__ == "__main__":
    migrate_attendance_table()
