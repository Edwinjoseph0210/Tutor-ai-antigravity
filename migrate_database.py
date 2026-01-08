"""
Database migration script to add new columns to materials table
Run this once to update the database schema
"""

import sqlite3
import os

# Get database path
script_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(script_dir, 'attendance.db')

print(f"Migrating database: {db_path}")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check if materials table exists
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='materials'")
if cur.fetchone():
    print("✓ Materials table exists")
    
    # Check current columns
    cur.execute("PRAGMA table_info(materials)")
    columns = [col[1] for col in cur.fetchall()]
    print(f"Current columns: {columns}")
    
    # Add processing_status column if it doesn't exist
    if 'processing_status' not in columns:
        print("Adding processing_status column...")
        cur.execute("ALTER TABLE materials ADD COLUMN processing_status TEXT DEFAULT 'pending'")
        print("✓ Added processing_status column")
    else:
        print("✓ processing_status column already exists")
    
    # Add total_topics column if it doesn't exist
    if 'total_topics' not in columns:
        print("Adding total_topics column...")
        cur.execute("ALTER TABLE materials ADD COLUMN total_topics INTEGER DEFAULT 0")
        print("✓ Added total_topics column")
    else:
        print("✓ total_topics column already exists")
    
    # Remove old topics column if it exists (we now use separate topics table)
    if 'topics' in columns:
        print("Note: 'topics' column still exists (will be ignored, using topics table instead)")
else:
    print("Materials table doesn't exist yet - will be created on first upload")

# Create topics table if it doesn't exist
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
        FOREIGN KEY (material_id) REFERENCES materials(id)
    )
''')
print("✓ Topics table ready")

conn.commit()
conn.close()

print("\n✅ Database migration complete!")
print("You can now upload study materials.")
