"""
Auth Service — Login, Register, Logout, Session Validation
Extracted from monolithic app.py for modularity.
"""

from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import sqlite3
import os

auth_bp = Blueprint('auth', __name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'auth.db')


# ── Decorators ──────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'success': False, 'message': 'Authentication required'}), 401
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function


def teacher_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        if session.get('role', 'student') != 'teacher':
            return jsonify({'success': False, 'message': 'Teacher privileges required'}), 403
        return f(*args, **kwargs)
    return decorated_function


# ── Database ────────────────────────────────────────────────────────────────

def init_auth_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'admin',
            student_class TEXT,
            email TEXT DEFAULT '',
            roll_no TEXT DEFAULT '',
            full_name TEXT DEFAULT ''
        )
    ''')
    for col, col_type in [('email', 'TEXT DEFAULT ""'), ('roll_no', 'TEXT DEFAULT ""'), ('full_name', 'TEXT DEFAULT ""')]:
        try:
            cur.execute(f'ALTER TABLE users ADD COLUMN {col} {col_type}')
        except sqlite3.OperationalError:
            pass

    cur.execute('SELECT COUNT(*) FROM users')
    if cur.fetchone()[0] == 0:
        cur.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                    ('admin', generate_password_hash('admin123'), 'admin'))
        cur.execute('INSERT INTO users (username, password_hash, role, student_class) VALUES (?, ?, ?, ?)',
                    ('student1', generate_password_hash('student123'), 'student', '10'))

    # Index for fast lookups
    try:
        cur.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)')
    except Exception:
        pass

    conn.commit()
    conn.close()


# ── Routes ──────────────────────────────────────────────────────────────────

@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email', '')
    password = data.get('password')
    confirm_password = data.get('confirm_password', password)
    role = data.get('role', 'teacher')
    student_class = data.get('student_class')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'}), 400
    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
    if role not in ['teacher', 'student']:
        return jsonify({'success': False, 'message': 'Invalid role'}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cur.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'Username already exists'}), 400

        password_hash = generate_password_hash(password)
        cur.execute('INSERT INTO users (username, password_hash, role, student_class, email) VALUES (?, ?, ?, ?, ?)',
                    (username, password_hash, role, student_class, email))
        conn.commit()
        user_id = cur.lastrowid
        conn.close()

        session['user_id'] = user_id
        session['username'] = username
        session['student_class'] = student_class
        session['role'] = role
        session.permanent = True

        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {'id': user_id, 'username': username, 'email': email, 'student_class': student_class, 'role': role}
        })
    except Exception as e:
        return jsonify({'success': False, 'message': 'Registration failed'}), 500


@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('SELECT id, password_hash, student_class, role FROM users WHERE username = ?', (username,))
    user = cur.fetchone()
    conn.close()

    if user and check_password_hash(user[1], password):
        user_role = user[3] if user[3] else 'teacher'
        if user_role == 'admin':
            user_role = 'teacher'
        session['user_id'] = user[0]
        session['username'] = username
        session['student_class'] = user[2]
        session['role'] = user_role
        session.permanent = True
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {'id': user[0], 'username': username, 'student_class': user[2], 'role': user_role}
        })
    else:
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401


@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@auth_bp.route('/api/user/profile', methods=['GET'])
@login_required
def get_user_profile():
    return jsonify({
        'success': True,
        'user': {
            'id': session.get('user_id'),
            'username': session.get('username'),
            'role': session.get('role', 'student'),
            'student_class': session.get('student_class')
        }
    })
