# Real-Time Teacher-Student Classroom System Architecture

## 🏗️ System Architecture

### Overview
A real-time synchronized classroom system where teacher actions instantly reflect on all student devices using WebSocket (Socket.IO) communication.

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Teacher Device │────────▶│  Flask Backend   │◀────────│ Student Device 1│
│  (React)        │  HTTP   │  + Socket.IO     │  HTTP   │  (React)        │
└─────────────────┘         │  (Single Source │         └─────────────────┘
                              │   of Truth)     │         ┌─────────────────┐
                              └─────────────────┘         │ Student Device 2│
                                       │                   │  (React)        │
                                       │ WebSocket         └─────────────────┘
                                       │ (Real-time)       ┌─────────────────┐
                                       │                   │ Student Device N│
                                       └──────────────────▶│  (React)        │
                                                           └─────────────────┘
```

## 🔄 Real-Time Data Flow

### 1. Lecture Start Flow
```
Teacher clicks "Start Lecture"
    ↓
POST /api/lecture/start (HTTP)
    ↓
Backend creates lecture_session (status='live')
    ↓
socketio.emit('lecture_started', data) → All connected clients
    ↓
Students receive real-time notification
    ↓
Student dashboards update automatically (no refresh)
```

### 2. Lecture Schedule Flow
```
Teacher schedules lecture for future time
    ↓
POST /api/lecture/schedule (HTTP)
    ↓
Backend saves to scheduled_lectures table
    ↓
Background scheduler checks every minute
    ↓
When scheduled time arrives:
    ↓
socketio.emit('lecture_started', data) → All connected clients
    ↓
Students receive notification
```

### 3. Lecture End Flow
```
Teacher clicks "End Lecture"
    ↓
POST /api/lecture/end (HTTP)
    ↓
Backend updates lecture_session (status='ended')
    ↓
socketio.emit('lecture_ended', data) → All connected clients
    ↓
Students see lecture ended notification
```

## 📊 Database Schema

### lecture_sessions (Enhanced)
```sql
CREATE TABLE IF NOT EXISTS lecture_sessions(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER,
    section_id INTEGER,
    topic_id INTEGER,
    subject TEXT,
    title TEXT,
    start_time TEXT,
    end_time TEXT,
    scheduled_start_time TEXT,  -- For scheduled lectures
    status TEXT DEFAULT 'live',  -- 'live', 'scheduled', 'ended', 'cancelled'
    duration_minutes INTEGER,
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### scheduled_lectures (New)
```sql
CREATE TABLE IF NOT EXISTS scheduled_lectures(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER,
    section_id INTEGER,
    topic_id INTEGER,
    subject TEXT,
    title TEXT,
    scheduled_time TEXT NOT NULL,  -- ISO format datetime
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'pending',  -- 'pending', 'started', 'cancelled'
    created_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

## 🔌 Socket.IO Events

### Server → Client Events (Broadcast)
- `lecture_started` - When lecture starts
- `lecture_scheduled` - When lecture is scheduled
- `lecture_ended` - When lecture ends
- `lecture_cancelled` - When scheduled lecture is cancelled
- `lecture_duration_update` - When duration changes
- `lecture_progress_update` - When lecture progress updates

### Client → Server Events
- `join_classroom` - Student joins their class room
- `leave_classroom` - Student leaves class room
- `teacher_connect` - Teacher connects
- `student_connect` - Student connects

## 🎯 Room-Based Architecture

### Room Structure
- `classroom:{class_id}:{section_id}` - All students in a class/section
- `teacher:{user_id}` - Teacher's private room
- `lecture:{session_id}` - Specific lecture session

### Benefits
- Efficient message routing
- Scalable to multiple classes
- Students only receive relevant updates

## 🚀 Technology Stack

### Backend
- Flask-SocketIO 5.3.0+ (WebSocket server)
- Eventlet (async I/O)
- SQLite (database)
- Python threading (scheduler)

### Frontend
- Socket.IO Client 4.7.2+ (WebSocket client)
- React Hooks (state management)
- Real-time state updates

## 📡 Real-Time Event Handlers

### Teacher Actions → Real-Time Events
1. **Start Lecture Immediately**
   - Emit: `lecture_started` to classroom room
   - Data: { session_id, title, subject, start_time }

2. **Schedule Lecture**
   - Emit: `lecture_scheduled` to classroom room
   - Data: { schedule_id, title, subject, scheduled_time }

3. **End Lecture**
   - Emit: `lecture_ended` to classroom room
   - Data: { session_id, end_time, summary }

4. **Cancel Scheduled Lecture**
   - Emit: `lecture_cancelled` to classroom room
   - Data: { schedule_id }

## 🔐 Authentication & Authorization

### Socket.IO Authentication
- Use session-based auth
- Verify user role on connection
- Join appropriate rooms based on role/class

### Security
- Validate all events server-side
- Rate limiting on events
- Room membership verification

## ⚡ Performance Considerations

### Scalability
- Room-based broadcasting (not global)
- Efficient message routing
- Connection pooling
- Background task processing

### Reliability
- Automatic reconnection on client
- Event queuing for offline clients
- State synchronization on reconnect

## 🎨 Frontend Integration

### Student Dashboard
- Listen for `lecture_started` events
- Show dynamic notification
- Update live lectures list
- No page refresh needed

### Teacher Dashboard
- Broadcast events on actions
- Real-time student count
- Live status updates

