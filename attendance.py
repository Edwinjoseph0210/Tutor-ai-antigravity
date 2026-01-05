import sqlite3
import csv
from datetime import datetime
import os
import traceback


DB_NAME = os.path.join(os.path.dirname(__file__), 'attendance.db')


def init_db(db_path=DB_NAME):
    """Create database and required tables if they don't exist."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        cur.execute('''
            CREATE TABLE IF NOT EXISTS students(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                roll_number TEXT UNIQUE,
                name TEXT
            )
        ''')

        cur.execute('''
            CREATE TABLE IF NOT EXISTS attendance(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                date TEXT,
                time TEXT,
                status TEXT,
                session_id INTEGER,
                FOREIGN KEY(student_id) REFERENCES students(id)
            )
        ''')

        # sessions table to record each run/session
        cur.execute('''
            CREATE TABLE IF NOT EXISTS sessions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT,
                start_time TEXT
            )
        ''')

        conn.commit()
        # Ensure schema migrations: add session_id column if missing
        try:
            cur.execute("PRAGMA table_info(attendance)")
            cols = [r[1] for r in cur.fetchall()]
            if 'session_id' not in cols:
                cur.execute('ALTER TABLE attendance ADD COLUMN session_id INTEGER')
                conn.commit()
        except Exception:
            # ignore migration errors here
            pass

        return conn
    except Exception as e:
        print(f"init_db: Failed to initialize database at {db_path}: {e}")
        traceback.print_exc()
        raise


def add_student(roll_number: str = None, name: str = None, db_path=DB_NAME):
    """Add a student to the students table. If roll_number or name is None, prompt CLI input."""
    try:
        if roll_number is None:
            roll_number = input("Enter student roll number: or press Enter to skip").strip()
        if not roll_number:
            print("add_student: Roll number is required. Aborting.")
            return
        if name is None:
            name = input("Enter student name: ").strip()

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('INSERT INTO students (roll_number, name) VALUES (?, ?)', (roll_number, name))
        conn.commit()
        print(f"Added student: {roll_number} - {name}")
        conn.close()
    except sqlite3.IntegrityError:
        print(f"add_student: Roll number '{roll_number}' already exists. Use a unique roll number.")
    except Exception as e:
        print(f"add_student: Failed to add student {roll_number} - {name}: {e}")
        traceback.print_exc()


def _get_student_by_name(name: str, db_path=DB_NAME):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT id, roll_number, name FROM students WHERE name = ?', (name,))
    row = cur.fetchone()
    conn.close()
    return row  # None or (id, roll_number, name)


def list_students(db_path=DB_NAME):
    """Return and print all students in the database."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('SELECT id, roll_number, name FROM students ORDER BY id')
        rows = cur.fetchall()
        conn.close()

        if not rows:
            print('list_students: No students found.')
            return []

        print('\nStudents:')
        print('{:<5} {:<15} {:<25}'.format('ID', 'Roll', 'Name'))
        for r in rows:
            print('{:<5} {:<15} {:<25}'.format(r[0], r[1], r[2]))

        return rows
    except Exception as e:
        print(f"list_students: Error listing students: {e}")
        traceback.print_exc()
        return []


def _get_student_by_roll(roll_number: str, db_path=DB_NAME):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT id, roll_number, name FROM students WHERE roll_number = ?', (roll_number,))
    row = cur.fetchone()
    conn.close()
    return row


def column_exists(table: str, column: str, db_path=DB_NAME) -> bool:
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute(f"PRAGMA table_info({table})")
        cols = [r[1] for r in cur.fetchall()]
        conn.close()
        return column in cols
    except Exception:
        return False


def list_duplicate_students(db_path=DB_NAME):
    """List duplicate students by roll_number or name."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        dup_rolls = []
        cur.execute('SELECT roll_number, COUNT(*) FROM students GROUP BY roll_number HAVING COUNT(*)>1')
        for r in cur.fetchall():
            dup_rolls.append(r[0])

        dup_names = []
        cur.execute('SELECT name, COUNT(*) FROM students GROUP BY name HAVING COUNT(*)>1')
        for r in cur.fetchall():
            dup_names.append(r[0])

        results = {'by_roll': {}, 'by_name': {}}
        for roll in dup_rolls:
            cur.execute('SELECT id, roll_number, name FROM students WHERE roll_number = ? ORDER BY id', (roll,))
            results['by_roll'][roll] = cur.fetchall()
        for name in dup_names:
            cur.execute('SELECT id, roll_number, name FROM students WHERE name = ? ORDER BY id', (name,))
            results['by_name'][name] = cur.fetchall()

        conn.close()
        return results
    except Exception as e:
        print(f"list_duplicate_students: Error: {e}")
        traceback.print_exc()
        return {'by_roll': {}, 'by_name': {}}


def resequence_students(db_path=DB_NAME):
    """Resequence student IDs to be continuous starting at 1 and remap attendance.student_id accordingly.

    This operation creates a temporary table, copies students ordered by current id, assigns new ids,
    remaps attendance.student_id, and replaces the students table.
    """
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Fetch current students ordered by id
        cur.execute('SELECT id, roll_number, name FROM students ORDER BY id')
        rows = cur.fetchall()
        if not rows:
            print('resequence_students: No students to resequence.')
            conn.close()
            return False

        # Build mapping old_id -> new_id
        mapping = {}
        for new_id, row in enumerate(rows, start=1):
            old_id = row[0]
            mapping[old_id] = new_id

        # Create temp students table
        cur.execute('CREATE TABLE IF NOT EXISTS students_new (id INTEGER PRIMARY KEY AUTOINCREMENT, roll_number TEXT UNIQUE, name TEXT)')

        # Insert rows into students_new in the same order; SQLite will assign new consecutive ids starting at 1
        for r in rows:
            cur.execute('INSERT INTO students_new (roll_number, name) VALUES (?, ?)', (r[1], r[2]))

        conn.commit()

        # Build mapping from old_id to new_id by querying students_new using roll_number
        new_map = {}
        cur.execute('SELECT id, roll_number FROM students_new')
        for nid, roll in cur.fetchall():
            # find old id(s) matching this roll (should be unique)
            for old, new in mapping.items():
                pass
            cur.execute('SELECT id FROM students WHERE roll_number = ?', (roll,))
            old_row = cur.fetchone()
            if old_row:
                old_id = old_row[0]
                new_map[old_id] = nid

        # Update attendance.student_id using the new_map
        for old_id, nid in new_map.items():
            cur.execute('UPDATE attendance SET student_id = ? WHERE student_id = ?', (nid, old_id))

        # Replace students table
        cur.execute('DROP TABLE students')
        cur.execute('ALTER TABLE students_new RENAME TO students')
        conn.commit()
        conn.close()
        print('resequence_students: Resequenced student IDs successfully.')
        return True
    except Exception as e:
        print(f"resequence_students: Error resequencing students: {e}")
        traceback.print_exc()
        return False


def remove_duplicate_students(by: str = 'roll', db_path=DB_NAME):
    """Remove duplicate students keeping the first (lowest id) for each duplicate group.

    by: 'roll' or 'name' to detect duplicates.
    """
    try:
        dup = list_duplicate_students(db_path=db_path)
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        removed = 0
        if by == 'roll':
            groups = dup['by_roll']
        else:
            groups = dup['by_name']

        if not groups:
            print('remove_duplicate_students: No duplicates found.')
            conn.close()
            return 0

        print('Duplicate student groups:')
        for key, rows in groups.items():
            print(f'Group {key}:')
            for r in rows:
                print(f'  ID={r[0]} Roll={r[1]} Name={r[2]}')

        confirm = input('Remove duplicate entries and keep the first ID in each group? [y/N]: ').strip().lower()
        if confirm != 'y':
            print('remove_duplicate_students: Aborted.')
            conn.close()
            return 0

        for key, rows in groups.items():
            keep_id = rows[0][0]
            delete_ids = [r[0] for r in rows[1:]]
            if delete_ids:
                cur.execute(f"DELETE FROM attendance WHERE student_id IN ({','.join(['?']*len(delete_ids))})", delete_ids)
                cur.execute(f"DELETE FROM students WHERE id IN ({','.join(['?']*len(delete_ids))})", delete_ids)
                removed += len(delete_ids)

        conn.commit()
        conn.close()
        print(f'remove_duplicate_students: Removed {removed} duplicate student(s).')
        return removed
    except Exception as e:
        print(f"remove_duplicate_students: Error: {e}")
        traceback.print_exc()
        return 0


def resequence_student_ids(db_path=DB_NAME):
    """Rebuild the students table so IDs are sequential starting at 1 and update attendance.student_id mappings.

    This operation is potentially destructive if interrupted. It is strongly recommended to backup
    the database file before running this.
    """
    try:
        print('Resequencing student IDs. IMPORTANT: please BACKUP attendance.db before proceeding.')
        confirm = input('Proceed with resequencing student IDs? [y/N]: ').strip().lower()
        if confirm != 'y':
            print('resequence_student_ids: Aborted.')
            return False

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        # Disable foreign keys for schema rebuild
        cur.execute('PRAGMA foreign_keys = OFF')

        # Fetch existing students ordered by current id
        cur.execute('SELECT id, roll_number, name FROM students ORDER BY id')
        students = cur.fetchall()
        if not students:
            print('resequence_student_ids: No students to resequence.')
            conn.close()
            return True

        # Build mapping old_id -> new_id
        mapping = {}
        for new_id, (old_id, roll, name) in enumerate(students, start=1):
            mapping[old_id] = new_id

        # Create a new temporary students table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS students_new(
                id INTEGER PRIMARY KEY,
                roll_number TEXT UNIQUE,
                name TEXT
            )
        ''')

        # Insert into students_new with new ids
        for old_id, roll, name in students:
            new_id = mapping[old_id]
            cur.execute('INSERT INTO students_new (id, roll_number, name) VALUES (?, ?, ?)', (new_id, roll, name))

        # Update attendance.student_id using mapping
        for old_id, new_id in mapping.items():
            cur.execute('UPDATE attendance SET student_id = ? WHERE student_id = ?', (new_id, old_id))

        # Drop old students table and rename new
        cur.execute('DROP TABLE students')
        cur.execute('ALTER TABLE students_new RENAME TO students')

        conn.commit()
        # Re-enable foreign keys
        cur.execute('PRAGMA foreign_keys = ON')
        conn.close()

        print('resequence_student_ids: Completed. New ID mapping:')
        for old, new in mapping.items():
            print(f'  {old} -> {new}')
        return True
    except Exception as e:
        print(f"resequence_student_ids: Error during resequencing: {e}")
        traceback.print_exc()
        return False


def update_student(identifier: str = None, db_path=DB_NAME):
    """Update a student's roll number or name identified by roll number or name.

    If identifier is None, prompt for roll number or name. Exact match against roll number first, then name.
    """
    try:
        if identifier is None:
            identifier = input("Enter student roll number or name to update (type 'q' to cancel): ").strip()
            if identifier.lower() == 'q' or not identifier:
                print('update_student: Cancelled by user.')
                return False

        # Try by roll number first
        student = _get_student_by_roll(identifier, db_path=db_path)
        if not student:
            student = _get_student_by_name(identifier, db_path=db_path)
        if not student:
            print(f'update_student: No student found with roll/name "{identifier}"')
            return False

        student_id, current_roll, current_name = student
        print(f'Current: ID={student_id}, Roll={current_roll}, Name={current_name}')
        new_roll = input("Enter new roll number (leave blank to keep, or type 'q' to cancel): ").strip()
        if new_roll.lower() == 'q':
            print('update_student: Cancelled by user.')
            return False
        new_name = input("Enter new name (leave blank to keep, or type 'q' to cancel): ").strip()
        if new_name.lower() == 'q':
            print('update_student: Cancelled by user.')
            return False

        if not new_roll:
            new_roll = current_roll
        if not new_name:
            new_name = current_name

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        try:
            cur.execute('UPDATE students SET roll_number = ?, name = ? WHERE id = ?', (new_roll, new_name, student_id))
            conn.commit()
            print(f'update_student: Updated student ID {student_id}')
            conn.close()
            return True
        except sqlite3.IntegrityError:
            print(f'update_student: Roll number "{new_roll}" already exists. Update aborted.')
            conn.close()
            return False
    except Exception as e:
        print(f"update_student: Error updating student: {e}")
        traceback.print_exc()
        return False


def delete_student(identifier: str = None, db_path=DB_NAME):
    """Delete a student (by roll number or name) and their attendance records; if identifier is blank, delete all students after confirmation."""
    try:
        if identifier is None:
            identifier = input('Enter roll number or name to delete (leave blank to delete ALL students): ').strip()

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        if not identifier:
            confirm = input('Confirm DELETE ALL students and their attendance? This cannot be undone. [y/N]: ').strip().lower()
            if confirm != 'y':
                print('delete_student: Aborted.')
                conn.close()
                return False
            cur.execute('DELETE FROM attendance')
            cur.execute('DELETE FROM students')
            conn.commit()
            conn.close()
            print('delete_student: All students and related attendance records deleted.')
            return True

        # Find student by roll or name
        student = _get_student_by_roll(identifier, db_path=db_path)
        if not student:
            student = _get_student_by_name(identifier, db_path=db_path)
        if not student:
            print(f'delete_student: No student found with roll/name "{identifier}"')
            conn.close()
            return False

        student_id, roll, name = student
        confirm = input(f"Confirm delete student {name} (Roll {roll})? [y/N]: ").strip().lower()
        if confirm != 'y':
            print('delete_student: Aborted.')
            conn.close()
            return False

        # Delete attendance records first
        cur.execute('DELETE FROM attendance WHERE student_id = ?', (student_id,))
        cur.execute('DELETE FROM students WHERE id = ?', (student_id,))
        conn.commit()
        conn.close()
        print(f'delete_student: Deleted student {name} (Roll {roll}) and related attendance records.')
        return True
    except Exception as e:
        print(f"delete_student: Error deleting student: {e}")
        traceback.print_exc()
        return False


def list_attendance(student_id: int = None, db_path=DB_NAME):
    """List attendance records; filter by student_id if provided."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        if student_id:
            cur.execute('''
                SELECT a.id, s.roll_number, s.name, a.time, a.date, a.status, a.session_id
                FROM attendance a
                LEFT JOIN students s ON a.student_id = s.id
                WHERE a.student_id = ?
                ORDER BY a.date, a.time
            ''', (student_id,))
        else:
            cur.execute('''
                SELECT a.id, s.roll_number, s.name, a.time, a.date, a.status, a.session_id
                FROM attendance a
                LEFT JOIN students s ON a.student_id = s.id
                ORDER BY a.date, a.time
            ''')

        rows = cur.fetchall()
        conn.close()

        if not rows:
            print('list_attendance: No attendance records found.')
            return []

        print('\nAttendance Records:')
        print('{:<5} {:<12} {:<20} {:<10} {:<12} {:<10} {:<8}'.format('ID', 'Roll', 'Name', 'Time', 'Date', 'Status', 'Session'))
        for r in rows:
            print('{:<5} {:<12} {:<20} {:<10} {:<12} {:<10} {:<8}'.format(r[0], r[1] or '', r[2] or '', r[3] or '', r[4] or '', r[5] or '', str(r[6]) if r[6] is not None else ''))

        return rows
    except Exception as e:
        print(f"list_attendance: Error listing attendance: {e}")
        traceback.print_exc()
        return []


def mark_attendance_manual(roll_number: str = None, db_path=DB_NAME):
    """Mark attendance manually by roll number (useful when name not available)."""
    try:
        if roll_number is None:
            try:
                    roll_number = input("Enter roll number to mark present (type 'q' to cancel): ").strip()
                    if roll_number.lower() == 'q' or not roll_number:
                        print('mark_attendance_manual: Cancelled by user.')
                        return False
            except KeyboardInterrupt:
                print('\nmark_attendance_manual: Cancelled by user (KeyboardInterrupt).')
                return False

        # allow user to cancel
        if not roll_number or roll_number.lower() == 'back':
            print('mark_attendance_manual: Cancelled by user.')
            return False

        student = _get_student_by_roll(roll_number, db_path=db_path)
        if not student:
            print(f"mark_attendance_manual: No student with roll '{roll_number}' found.")
            return False

        student_id = student[0]
        now = datetime.now()
        date_str = now.strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M:%S')

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('SELECT id FROM attendance WHERE student_id = ? AND date = ? AND session_id IS NULL', (student_id, date_str))
        if cur.fetchone():
            print(f"mark_attendance_manual: Attendance already recorded for {student[2]} on {date_str}. Skipping.")
            conn.close()
            return True

        cur.execute('INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
                    (student_id, date_str, time_str, 'Present'))
        conn.commit()
        conn.close()
        print(f"mark_attendance_manual: Marked Present for {student[2]} (Roll {student[1]}) at {date_str} {time_str}")
        return True
    except Exception as e:
        print(f"mark_attendance_manual: Error marking attendance: {e}")
        traceback.print_exc()
        return False


def mark_attendance(name: str, db_path=DB_NAME):
    """Mark attendance for a recognized student name. If student not found, log a warning."""
    try:
        student = _get_student_by_name(name, db_path=db_path)
        if not student:
            print(f"mark_attendance: Warning - student '{name}' not found in students table. Skipping.")
            return False

        student_id = student[0]
        now = datetime.now()
        date_str = now.strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M:%S')

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        # Check if attendance already marked for this student for today's date (without session)
        cur.execute('SELECT id FROM attendance WHERE student_id = ? AND date = ? AND session_id IS NULL', (student_id, date_str))
        if cur.fetchone():
            print(f"mark_attendance: Attendance already recorded for {name} on {date_str}. Skipping duplicate.")
            conn.close()
            return True

        cur.execute('INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
                    (student_id, date_str, time_str, 'Present'))
        conn.commit()
        conn.close()
        print(f"mark_attendance: Marked Present for {name} at {date_str} {time_str}")
        return True
    except Exception as e:
        print(f"mark_attendance: Failed to mark attendance for {name}: {e}")
        traceback.print_exc()
        return False


def calculate_attendance_percentage(db_path=DB_NAME):
    """Calculate attendance percentage per student and return a list of dicts with status.

    Rules:
      - attendance percentage > 80% => 'Present'
      - between 50% and 80% => 'Partial'
      - < 50% => 'Absent'
    """
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Prefer session-based denominator (number of sessions)
        cur.execute('SELECT COUNT(*) FROM sessions')
        row = cur.fetchone()
        total_sessions = row[0] if row and row[0] is not None else 0

        # Fallback: if no sessions table entries, use distinct dates in attendance
        if total_sessions == 0:
            cur.execute('SELECT COUNT(DISTINCT date) FROM attendance')
            row = cur.fetchone()
            total_sessions = row[0] if row and row[0] is not None else 0
        cur.execute('SELECT id, roll_number, name FROM students')
        students = cur.fetchall()

        results = []
        for student_id, roll_number, name in students:
            if total_sessions == 0:
                percent = 0.0
            else:
                # Count how many sessions the student was present in.
                # Prefer session_id-based counting when sessions exist.
                cur.execute('SELECT COUNT(DISTINCT session_id) FROM attendance WHERE student_id = ? AND status = "Present" AND session_id IS NOT NULL', (student_id,))
                present_sessions = cur.fetchone()[0]
                if present_sessions is None:
                    present_sessions = 0
                # If sessions table is empty and we fell back to dates, count distinct dates where status is Present
                if present_sessions == 0 and total_sessions > 0:
                    # It's possible present_sessions is 0 legitimately; leave as is.
                    pass
                percent = (present_sessions / total_sessions) * 100.0

            if percent > 80.0:
                status = 'Present'
            elif 50.0 <= percent <= 80.0:
                status = 'Partial'
            else:
                status = 'Absent'

            results.append({
                'id': student_id,
                'roll_number': roll_number,
                'name': name,
                'percent': round(percent, 2),
                'status': status
            })

        conn.close()
        return results
    except Exception as e:
        print(f"calculate_attendance_percentage: Error calculating percentages: {e}")
        traceback.print_exc()
        return []


def export_to_csv(output_dir: str = None, db_path=DB_NAME):
    """Export attendance records to CSV named attendance_report_<date>.csv

    Columns: id | roll_number | name | timestamp | date | status
    """
    try:
        if output_dir is None:
            output_dir = os.path.dirname(db_path)
        os.makedirs(output_dir, exist_ok=True)

        date_suffix = datetime.now().strftime('%Y-%m-%d')
        out_path = os.path.join(output_dir, f'attendance_report_{date_suffix}.csv')

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('''
            SELECT a.id, s.roll_number, s.name, a.time, a.date, a.status
            FROM attendance a
            LEFT JOIN students s ON a.student_id = s.id
            ORDER BY a.date, a.time
        ''')

        rows = cur.fetchall()
        conn.close()

        with open(out_path, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'roll_number', 'name', 'timestamp', 'date', 'status'])
            for r in rows:
                writer.writerow(r)

        print(f"export_to_csv: Exported attendance to {out_path}")
        return out_path
    except Exception as e:
        print(f"export_to_csv: Failed to export attendance: {e}")
        traceback.print_exc()
        return None


def record_attendance_status(name: str, status: str, timestamp: str = None, date: str = None, db_path=DB_NAME):
    """Record final attendance status for a student by name. Replaces any record for the same date.

    timestamp: '%H:%M:%S' or None (uses current time)
    date: '%Y-%m-%d' or None (uses today's date)
    """
    try:
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        if timestamp is None:
            timestamp = datetime.now().strftime('%H:%M:%S')

        student = _get_student_by_name(name, db_path=db_path)
        if not student:
            print(f"record_attendance_status: Warning - student '{name}' not found in students table. Skipping.")
            return False

        student_id = student[0]
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        # Remove any existing 'final' record for this student on this date without session_id (to avoid duplicates)
        cur.execute('DELETE FROM attendance WHERE student_id = ? AND date = ? AND session_id IS NULL', (student_id, date))
        cur.execute('INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
                    (student_id, date, timestamp, status))
        conn.commit()
        conn.close()
        print(f"record_attendance_status: Recorded {status} for {name} ({date} {timestamp})")
        return True
    except Exception as e:
        print(f"record_attendance_status: Error recording status for {name}: {e}")
        traceback.print_exc()
        return False


def export_today_csv(output_dir: str = None, date: str = None, session_time: str = None, db_path=DB_NAME):
    """Export attendance records for a specific date (default today) to CSV named attendance_report_<date>.csv.

    Ensures every student appears in the CSV. If a student has no attendance record for the date,
    their timestamp will be filled with `session_time` (if provided) and status will be 'Absent'.
    The first column is the student's id (s.id).
    """
    try:
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        if output_dir is None:
            output_dir = os.path.dirname(db_path)
        os.makedirs(output_dir, exist_ok=True)

        out_path = os.path.join(output_dir, f'attendance_report_{date}.csv')

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Use correlated subqueries to fetch the latest attendance row (if any) for each student for the date.
        # This ensures exactly one CSV row per student even if multiple attendance rows exist.
        cur.execute('''
            SELECT s.id, s.roll_number, s.name,
                (SELECT time FROM attendance a WHERE a.student_id = s.id AND a.date = ? ORDER BY a.id DESC LIMIT 1) AS atime,
                (SELECT date FROM attendance a WHERE a.student_id = s.id AND a.date = ? ORDER BY a.id DESC LIMIT 1) AS adate,
                (SELECT status FROM attendance a WHERE a.student_id = s.id AND a.date = ? ORDER BY a.id DESC LIMIT 1) AS astatus
            FROM students s
            ORDER BY s.id
        ''', (date, date, date))

        rows = cur.fetchall()
        conn.close()

        with open(out_path, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'roll_number', 'name', 'timestamp', 'date', 'status'])
            for r in rows:
                sid, roll, name, atime, adate, status = r
                # Fill missing values
                if atime is None:
                    atime = session_time if session_time is not None else ''
                if adate is None:
                    adate = date
                if status is None:
                    status = 'Absent'
                writer.writerow([sid, roll, name, atime, adate, status])

        print(f"export_today_csv: Exported attendance for {date} to {out_path}")
        return out_path
    except Exception as e:
        print(f"export_today_csv: Failed to export attendance for {date}: {e}")
        traceback.print_exc()
        return None


def export_today_html(output_dir: str = None, date: str = None, session_time: str = None, db_path=DB_NAME):
    """Export attendance for the specified date to an HTML file with a styled table.

    File name: attendance_report_<date>.html
    Columns: ID | Roll | Name | Time | Date | Status
    """
    try:
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        if output_dir is None:
            output_dir = os.path.dirname(db_path)
        os.makedirs(output_dir, exist_ok=True)

        out_path = os.path.join(output_dir, f'attendance_report_{date}.html')

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('''
            SELECT s.id, s.roll_number, s.name,
                (SELECT time FROM attendance a WHERE a.student_id = s.id AND a.date = ? ORDER BY a.id DESC LIMIT 1) AS atime,
                (SELECT date FROM attendance a WHERE a.student_id = s.id AND a.date = ? ORDER BY a.id DESC LIMIT 1) AS adate,
                (SELECT status FROM attendance a WHERE a.student_id = s.id AND a.date = ? ORDER BY a.id DESC LIMIT 1) AS astatus
            FROM students s
            ORDER BY s.id
        ''', (date, date, date))
        rows = cur.fetchall()
        conn.close()

        # Build HTML
        style = (
            """
            <style>
            :root { --bg:#0b1324; --card:#111a31; --text:#e6edf3; --muted:#9fb0c3; --ok:#2ea043; --warn:#d29922; --bad:#f85149; }
            body{background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Noto Sans',sans-serif;margin:24px}
            .card{background:var(--card);border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.25);padding:18px}
            h1{font-size:20px;margin:0 0 12px}
            .meta{color:var(--muted);font-size:12px;margin-bottom:12px}
            table{width:100%;border-collapse:collapse;overflow:hidden;border-radius:8px}
            thead th{background:#172243;color:var(--muted);font-weight:600;text-align:left;font-size:12px;letter-spacing:.02em;padding:10px 12px;border-bottom:1px solid #213056}
            tbody td{padding:10px 12px;border-bottom:1px solid #1b274a}
            tbody tr:hover{background:#151f3b}
            .status{font-weight:700;padding:2px 8px;border-radius:999px;font-size:11px;display:inline-block}
            .Present{background:rgba(46,160,67,.15);color:var(--ok);border:1px solid rgba(46,160,67,.35)}
            .Partial{background:rgba(210,153,34,.15);color:var(--warn);border:1px solid rgba(210,153,34,.35)}
            .Absent{background:rgba(248,81,73,.15);color:var(--bad);border:1px solid rgba(248,81,73,.35)}
            .badge{padding:2px 8px;border:1px solid #2a3a66;border-radius:999px;color:var(--muted);font-size:11px}
            </style>
            """
        )

        header = f"<h1>Attendance Report</h1><div class=meta>Date: <span class=badge>{date}</span></div>"

        def status_badge(s):
            s = s or 'Absent'
            cls = 'Present' if s == 'Present' else ('Partial' if s == 'Partial' else 'Absent')
            return f"<span class='status {cls}'>{s}</span>"

        # Count summary
        present = sum(1 for _, _, _, _, _, st in rows if (st or 'Absent') == 'Present')
        partial = sum(1 for _, _, _, _, _, st in rows if (st or 'Absent') == 'Partial')
        absent = sum(1 for _, _, _, _, _, st in rows if (st or 'Absent') == 'Absent')
        summary = f"<div class=meta>Present: <span class=badge>{present}</span> · Partial: <span class=badge>{partial}</span> · Absent: <span class=badge>{absent}</span></div>"

        rows_html = []
        for sid, roll, name, atime, adate, status in rows:
            atime = atime or (session_time if session_time is not None else '')
            adate = adate or date
            status_html = status_badge(status)
            rows_html.append(
                f"<tr><td>{sid}</td><td>{roll or ''}</td><td>{name or ''}</td><td>{atime}</td><td>{adate}</td><td>{status_html}</td></tr>"
            )

        table = (
            "<table><thead><tr>"
            "<th>ID</th><th>Roll</th><th>Name</th><th>Time</th><th>Date</th><th>Status</th>"
            "</tr></thead><tbody>" + "".join(rows_html) + "</tbody></table>"
        )

        html = f"<!doctype html><html><meta charset=utf-8><title>Attendance {date}</title>{style}<body><div class=card>{header}{summary}{table}</div></body></html>"

        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"export_today_html: Exported attendance for {date} to {out_path}")
        return out_path
    except Exception as e:
        print(f"export_today_html: Failed to export attendance for {date}: {e}")
        traceback.print_exc()
        return None


def create_session(start_time: str = None, date: str = None, db_path=DB_NAME):
    """Create a new session row and return session_id."""
    try:
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        if start_time is None:
            start_time = datetime.now().strftime('%H:%M:%S')

        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('INSERT INTO sessions (date, start_time) VALUES (?, ?)', (date, start_time))
        conn.commit()
        sid = cur.lastrowid
        conn.close()
        print(f"create_session: Created session {sid} at {date} {start_time}")
        return sid
    except Exception as e:
        print(f"create_session: Failed to create session: {e}")
        traceback.print_exc()
        return None


def finalize_session(detect_counts: dict, total_frames: int, session_id: int = None, db_path=DB_NAME):
    """Finalize session attendance: for each student in DB, compute percent from detect_counts and write a single row per student with session_id."""
    try:
        if total_frames == 0:
            total_frames = 1
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Fetch all students
        cur.execute('SELECT id, roll_number, name FROM students')
        students = cur.fetchall()

        date_str = datetime.now().strftime('%Y-%m-%d')
        time_str = datetime.now().strftime('%H:%M:%S')

        for sid_db, roll, name in students:
            detected = detect_counts.get(name, 0)
            percent = (detected / total_frames) * 100.0
            if percent > 80.0:
                status = 'Present'
            elif 50.0 <= percent <= 80.0:
                status = 'Partial'
            else:
                status = 'Absent'

            # Insert a session-specific attendance row (preserve history)
            cur.execute('INSERT INTO attendance (student_id, date, time, status, session_id) VALUES (?, ?, ?, ?, ?)',
                        (sid_db, date_str, time_str, status, session_id))

        conn.commit()
        conn.close()
        print(f"finalize_session: Finalized session {session_id} with {len(students)} student records.")
        return True
    except Exception as e:
        print(f"finalize_session: Error finalizing session: {e}")
        traceback.print_exc()
        return False


def export_all_sessions_csv(output_path: str = None, db_path=DB_NAME):
    """Export all sessions grouped by session_id, including absent students per session."""
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        if output_path is None:
            ts = datetime.now().strftime('%Y-%m-%d_%H%M%S')
            output_path = os.path.join(os.path.dirname(db_path), f'all_sessions_report_{ts}.csv')

        # Fetch all sessions
        cur.execute('SELECT id, date, start_time FROM sessions ORDER BY id')
        sessions = cur.fetchall()

        with open(output_path, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)

            for session in sessions:
                sid, sdate, sstart = session
                writer.writerow([f'=== Session {sid} ({sdate} {sstart}) ==='])
                writer.writerow(['id', 'roll_number', 'name', 'timestamp', 'date', 'status'])

                # For each student, fetch attendance for this session (if any)
                cur.execute('SELECT id, roll_number, name FROM students ORDER BY id')
                students = cur.fetchall()
                for st in students:
                    st_id, roll, name = st
                    cur.execute('SELECT time, date, status FROM attendance WHERE student_id = ? AND session_id = ? ORDER BY id DESC LIMIT 1', (st_id, sid))
                    row = cur.fetchone()
                    if row:
                        atime, adate, astatus = row
                        writer.writerow([st_id, roll, name, atime or '', adate or sdate, astatus or 'Absent'])
                    else:
                        # Absent: no attendance record for this session
                        writer.writerow([st_id, roll, name, '--', sdate, 'Absent'])

                writer.writerow([])

        conn.close()
        print(f"export_all_sessions_csv: Exported sessions to {output_path}")
        return output_path
    except Exception as e:
        print(f"export_all_sessions_csv: Error exporting sessions: {e}")
        traceback.print_exc()
        return None


def delete_attendance(date: str = None, db_path=DB_NAME, delete_all: bool = False):
    """Delete attendance records for a given date or all records (with confirmation).

    If delete_all is True, all attendance records will be removed (prompt for confirmation).
    If date is provided (YYYY-MM-DD), only that date's records are removed; by default, prompts the user.
    """
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        if delete_all:
            confirm = input('Confirm delete ALL attendance records and sessions? This cannot be undone. [y/N]: ').strip().lower()
            if confirm != 'y':
                print('delete_attendance: Aborted.')
                conn.close()
                return False
            cur.execute('DELETE FROM attendance')
            cur.execute('DELETE FROM sessions')
            conn.commit()
            conn.close()
            print('delete_attendance: All attendance records and sessions deleted.')
            return True

        if date is None:
            date = input("Enter date to delete attendance for (YYYY-MM-DD) or leave blank for today: ").strip()
            if not date:
                date = datetime.now().strftime('%Y-%m-%d')

        # Confirm
        confirm = input(f'Confirm delete attendance for date {date}? [y/N]: ').strip().lower()
        if confirm != 'y':
            print('delete_attendance: Aborted.')
            conn.close()
            return False

        cur.execute('DELETE FROM attendance WHERE date = ?', (date,))
        conn.commit()
        conn.close()
        print(f'delete_attendance: Deleted attendance records for {date}.')
        return True
    except Exception as e:
        print(f"delete_attendance: Error deleting attendance: {e}")
        traceback.print_exc()
        return False


def print_summary(db_path=DB_NAME):
    """Print a summary of attendance status for all students."""
    try:
        results = calculate_attendance_percentage(db_path=db_path)
        if not results:
            print("print_summary: No students or attendance data to summarize.")
            return

        print('\nAttendance Summary:')
        print('{:<5} {:<12} {:<20} {:<8} {:<8}'.format('ID', 'Roll', 'Name', 'Percent', 'Status'))
        for r in results:
            print('{:<5} {:<12} {:<20} {:<8} {:<8}'.format(r['id'], r['roll_number'], r['name'], f"{r['percent']}%", r['status']))
    except Exception as e:
        print(f"print_summary: Error printing summary: {e}")
        traceback.print_exc()


if __name__ == '__main__':
    # Small CLI for manual operations
    conn = init_db()
    menu = '''
Attendance module CLI - choose an option:
1) Add student
2) List students
3) Update student
4) Delete student
5) List attendance records
6) Mark attendance manually (by roll number)
7) Export attendance to CSV
8) Print summary
9) Delete attendance records (by date or ALL)
10) Exit
'''
    

    while True:
        print(menu)
        choice = input('Select an option [1-10] : ').strip()
        if choice == '1':
            add_student()
        elif choice == '2':
            list_students()
        elif choice == '3':
            ident = input('Enter roll number or name to update: or type "q" to cancel: ').strip()
            if ident.lower() == 'q' or not ident:
                print('Update student cancelled.')
                continue
            update_student(ident if ident else None)
        elif choice == '4':
            ident = input('Enter roll number or name to delete (leave blank to delete ALL): or type "q" to cancel: ').strip()
            if ident.lower() == 'q':
                print('Delete student cancelled.')
                continue
            delete_student(ident if ident else None)
        elif choice == '5':
            roll = input('Filter by roll number (leave blank for all): or type "q" to cancel: ').strip()
            if roll.lower() == 'q':
                print('List attendance cancelled.')
                continue
            if roll == '':
                list_attendance()
            else:
                student = _get_student_by_roll(roll)
                if student:
                    list_attendance(student[0])
                else:
                    print('Invalid roll number')
        elif choice == '6':
            mark_attendance_manual()
        elif choice == '7':
            export_to_csv()
        elif choice == '8':
            print_summary()
        elif choice == '9':
            # New option: delete attendance records
            date = input('Enter date to delete attendance for (YYYY-MM-DD) or leave blank for today; or type ALL to delete all: ').strip()
            if date.upper() == 'ALL':
                delete_attendance(delete_all=True)
            else:
                if date == '':
                    date = None
                delete_attendance(date=date)
        elif choice == '10':
            print('Exiting')
            break
        elif choice.lower() == 'r':
            resequence_student_ids()
        else:
            print('Invalid option')

      