# Real-Time System Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

**Backend:**
```bash
pip install flask-socketio python-socketio eventlet
```

**Frontend:**
```bash
cd frontend
npm install socket.io-client
```

### 2. Start the Servers

**Backend (with Socket.IO):**
```bash
python app.py
```

The server will now run with Socket.IO support on port 5001.

**Frontend:**
```bash
cd frontend
npm start
```

## 📡 How It Works

### Real-Time Events

1. **Teacher starts a lecture** → All students in the class receive `lecture_started` event instantly
2. **Teacher schedules a lecture** → All students receive `lecture_scheduled` event
3. **Teacher ends a lecture** → All students receive `lecture_ended` event
4. **Teacher cancels scheduled lecture** → All students receive `lecture_cancelled` event

### Room-Based Broadcasting

- Students automatically join their class room: `classroom:{class_id}:{section_id}`
- Teachers join the room when they start a lecture
- Events are broadcast only to the relevant classroom room

### Automatic Scheduled Lecture Start

- Background thread checks every minute for scheduled lectures
- When scheduled time arrives, lecture automatically starts
- All students receive real-time notification

## 🎯 Features

✅ **Real-time notifications** - No page refresh needed
✅ **Automatic room joining** - Students join their class on connection
✅ **Scheduled lectures** - Auto-start at scheduled time
✅ **State synchronization** - All devices stay in sync
✅ **Scalable** - Room-based architecture supports multiple classes

## 🔧 Configuration

### Backend URL
Set `REACT_APP_API_URL` in frontend `.env`:
```
REACT_APP_API_URL=http://localhost:5001
```

For production:
```
REACT_APP_API_URL=https://your-backend-url.com
```

## 📝 API Endpoints

### Schedule Lecture
```POST /api/lecture/schedule```
```json
{
  "class_id": 1,
  "section_id": 1,
  "subject": "Math",
  "title": "Algebra Basics",
  "scheduled_time": "2025-01-15T10:00:00",
  "duration_minutes": 30
}
```

### Get Scheduled Lectures
```GET /api/lecture/scheduled?class_id=1```

### Cancel Scheduled Lecture
```POST /api/lecture/scheduled/{schedule_id}/cancel```

## 🐛 Troubleshooting

### Socket.IO not connecting
1. Check backend is running with `socketio.run()`
2. Verify CORS settings allow your frontend origin
3. Check browser console for connection errors

### Events not received
1. Verify user is in correct class room
2. Check backend logs for broadcast messages
3. Ensure Socket.IO client is connected (check `connected` state)

### Scheduled lectures not starting
1. Check background scheduler is running (see startup logs)
2. Verify scheduled time is in correct format (ISO)
3. Check database for scheduled_lectures table

