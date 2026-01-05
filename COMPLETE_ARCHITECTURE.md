# Complete System Architecture & Integration

## 🎯 Current Deployment Status

```
✅ FRONTEND                    ⏳ BACKEND              ✅ DATABASE
┌─────────────────┐       ┌─────────────┐       ┌──────────────┐
│  React App      │       │ Flask API   │       │  SQLite DB   │
│  (Deployed)     │◄─────►│ (To Deploy) │◄─────►│  (Local)     │
│                 │       │             │       │              │
│ Components:     │       │ Routes:     │       │ Tables:      │
│ • Login/Signup  │       │ • Auth      │       │ • users      │
│ • Dashboard     │       │ • Lectures  │       │ • attendance │
│ • AILecture     │       │ • Attendance│       │ • students   │
│ • Attendance    │       │ • Face Reco │       │ • records    │
│ • Reports       │       │ • Reports   │       │              │
│ • Students      │       │             │       │              │
│ • Timetable     │       │ External:   │       │              │
│                 │       │ • Gemini AI │       │              │
│ Tools:          │       │ • OpenAI    │       │              │
│ • Bootstrap UI  │       │ • ChromaDB  │       │              │
│ • Chart.js      │       │ • Senku RAG │       │              │
│ • Axios API     │       │             │       │              │
└────┬────────────┘       └─────┬───────┘       └──────────────┘
     │                          │
     │ https://                 │ https://
     │ ai-tutor-94ff4.          │ [your-backend].
     │ web.app                  │ onrender.com
     │                          │
     └──────────────┬───────────┘
                    │
            Firebase Hosting
            (Static Files)
```

## 📦 System Components

### Frontend (React) - ✅ DEPLOYED

**Location:** `frontend/src/`

```
Components
├── App.js (Main routing, auth check)
├── pages/
│   ├── Login.js (Email/password auth)
│   ├── Auth.js (Signup/authentication)
│   ├── Dashboard.js (Main dashboard with analytics)
│   ├── AILecture.js (AI lecture creation & delivery)
│   ├── Attendance.js (Attendance management)
│   ├── FaceRecognition.js (Face detection UI)
│   ├── Students.js (Student management)
│   ├── Reports.js (Report generation)
│   ├── Timetable.js (Schedule management)
│   └── ClassAttendance.js (Class-wide attendance view)
├── services/
│   └── api.js (Axios instance with interceptors)
├── contexts/
│   └── AuthContext.js (Firebase auth state)
└── firebase.js (Firebase config)

Libraries:
├── react-bootstrap (UI components)
├── chart.js (Analytics charts)
├── axios (HTTP client)
├── react-router-dom (Routing)
└── firebase (Authentication)
```

**Deployed at:** https://ai-tutor-94ff4.web.app

### Backend (Flask) - ⏳ NEEDS DEPLOYMENT

**Location:** `app.py` (1800+ lines)

```
Routes
├── /api/health (health check)
├── /api/auth/
│   ├── register (create account)
│   ├── login (authenticate)
│   └── logout (session end)
├── /api/attendance/
│   ├── mark (mark attendance)
│   ├── get_records (fetch records)
│   └── generate_report (PDF/CSV export)
├── /api/face/
│   ├── detect (real-time detection)
│   ├── recognize (identify students)
│   └── train (update face models)
├── /api/lectures/
│   ├── create (new lecture)
│   ├── upload_pdf (curriculum extraction)
│   └── generate (AI lecture generation)
├── /api/students/
│   ├── add (new student)
│   ├── list (get all students)
│   └── delete (remove student)
└── /api/reports/
    ├── attendance (generate reports)
    └── export (CSV/PDF export)

Database:
├── attendance.db (SQLite - auto-created)
│   ├── users table
│   ├── students table
│   └── attendance table
└── auth.db (SQLite - auto-created)
    └── auth records

External Integrations:
├── Gemini API (AI lecture generation)
├── OpenAI API (text processing)
├── ChromaDB (Vector storage)
├── Senku Bridge (PDF processing)
└── Face Recognition (Detection & identification)
```

**To Deploy:** Use Render.com, Heroku, or Railway

### Database - ✅ READY

```
SQLite Files (auto-created on first run)
├── attendance.db
│   ├── users (id, username, password_hash, email)
│   ├── students (id, name, roll_number, face_encoding)
│   ├── attendance (id, student_id, date, status)
│   └── lectures (id, subject, chapter, content)
└── auth.db
    └── sessions (token, user_id, created_at)
```

### External Services - ✅ CONFIGURED

```
Gemini AI (Google)
├── API Key: Set in environment variables
├── Uses: AI lecture generation
└── Cost: Free tier available

Face Recognition
├── Library: face_recognition (Python)
├── Uses: Student detection & identification
├── Models: Stored in faces/ directory
└── Performance: CPU intensive

ChromaDB (Vector Store)
├── Location: senku_unpacked/data/chroma_db/
├── Uses: RAG embedding storage
└── Purpose: Semantic search in lectures

Senku (RAG System)
├── Location: senku_unpacked/senku/
├── Uses: PDF processing & curriculum extraction
└── Components:
    ├── Document Loader
    ├── Curriculum Extractor
    ├── RAG Engine
    └── Vector Store Interface
```

## 🔄 Complete Data Flow

### 1. User Registration & Login

```
User fills login form
    ↓
React frontend (App.js)
    ↓
Sends POST to /api/auth/register
    ↓
Flask backend validates & creates account
    ↓
SQLite user record created
    ↓
JWT token returned to frontend
    ↓
Token stored in localStorage
    ↓
User redirected to Dashboard
```

### 2. AI Lecture Creation

```
User uploads PDF in AILecture.js
    ↓
Frontend sends file to /api/lectures/upload_pdf
    ↓
Backend receives PDF
    ↓
Senku extracts curriculum from PDF
    ↓
Gemini AI generates lecture content
    ↓
Study plan created with sections
    ↓
Content sent back to frontend
    ↓
User sees interactive lecture interface
```

### 3. Face Recognition Attendance

```
Lecture starts with camera enabled
    ↓
Real-time video frames from user's webcam
    ↓
Frontend sends frames to /api/face/detect
    ↓
Backend detects faces in images
    ↓
Face encodings compared to known students
    ↓
Match found → recognized student
    ↓
POST to /api/attendance/mark
    ↓
SQLite attendance record created
    ↓
Status updated in real-time on frontend
```

### 4. Report Generation

```
User requests attendance report
    ↓
Frontend calls /api/reports/attendance
    ↓
Backend queries SQLite attendance table
    ↓
Aggregates attendance by student
    ↓
Calculates percentages
    ↓
Generates CSV/PDF
    ↓
File returned to frontend
    ↓
Browser downloads report
```

## 📊 Technology Stack

### Frontend Stack
```
React 18.2.0
├── react-bootstrap (UI framework)
├── chart.js + react-chartjs-2 (analytics)
├── axios (HTTP requests)
├── react-router-dom (routing)
└── firebase (authentication)

Build Tools:
├── react-scripts (webpack config)
├── npm (package management)
└── Hosted: Firebase Hosting CDN
```

### Backend Stack
```
Python 3.11
├── Flask (web framework)
├── Flask-CORS (cross-origin requests)
├── opencv-python (image processing)
├── face-recognition (face detection)
├── google-generativeai (Gemini API)
├── chromadb (vector database)
├── sentence-transformers (embeddings)
└── Hosted: Render/Heroku/Railway
```

### Database Stack
```
SQLite 3
├── Lightweight, file-based
├── No setup required
├── Auto-created on first run
└── Perfect for development & small deployments
```

## 🚀 Deployment Checklist

### Frontend ✅
- [x] React app built successfully
- [x] Build folder created (frontend/build)
- [x] Deployed to Firebase Hosting
- [x] CORS headers configured in backend
- [x] API endpoints configured
- [x] Live at https://ai-tutor-94ff4.web.app

### Backend ⏳
- [ ] Add gunicorn to requirements.txt
- [ ] Push code to GitHub
- [ ] Create Render/Heroku account
- [ ] Create web service
- [ ] Add environment variables
- [ ] Deploy backend
- [ ] Get backend URL
- [ ] Update frontend API URL
- [ ] Rebuild & redeploy frontend
- [ ] Test API connectivity

### Database ⏳
- [ ] First time: SQLite will auto-create
- [ ] Verify tables are created
- [ ] (Optional) Migrate to PostgreSQL for production

## 🎯 What Works & What Doesn't

### Working Right Now ✅
- Frontend UI fully functional
- Page routing and navigation
- Responsive design
- All UI components render
- Form validation on frontend

### Needs Backend ❌
- User authentication (login/signup actually save accounts)
- Face recognition detection
- Attendance marking
- Lecture content generation
- Student management database operations
- Report generation
- Any API calls

## 📝 Key Files for Deployment

```
Root Directory:
├── app.py (Flask backend - 1800 lines)
├── requirements.txt (Python dependencies)
├── Procfile (for Render/Heroku deployment)
├── firebase.json (Firebase hosting config)
├── .firebaserc (Firebase project config)
└── BACKEND_DEPLOYMENT.md (deployment guide)

Frontend:
├── frontend/build/ (production build)
├── frontend/src/ (React source code)
├── frontend/package.json (Node dependencies)
└── frontend/public/ (static assets)

Documentation:
├── INTEGRATION_COMPLETE.md (overview)
├── BACKEND_DEPLOYMENT.md (backend deployment)
├── DEPLOYMENT_STATUS.md (current status)
└── DEPLOYMENT.md (Firebase hosting)
```

## 🔐 Environment Variables

### Required
```bash
GEMINI_API_KEY=your_actual_key_from_google
FLASK_ENV=production
```

### Optional
```bash
DEBUG=false
DISABLE_FACE_RECO=0
SECRET_KEY=random_secure_key
DATABASE_URL=postgresql://... (if using PostgreSQL)
```

## 📞 Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| Frontend loads but no data | Backend not deployed yet |
| API 404 errors | Backend URL incorrect in api.js |
| CORS errors | Check CORS config in app.py |
| Face recognition fails | Set DISABLE_FACE_RECO=1 on server |
| Database errors | First run will auto-create |
| Login doesn't work | Need to implement Firebase auth |

## ✨ Next Steps

1. **Immediately**: Test frontend at https://ai-tutor-94ff4.web.app
2. **Short term** (15 min): Deploy backend to Render
3. **Medium term** (1 hour): Update frontend API URL & redeploy
4. **Long term** (2+ hours): Set up PostgreSQL, implement full auth, scale to production

---

**Status Summary:**
- Frontend: ✅ LIVE & FUNCTIONAL
- Backend: ⏳ READY TO DEPLOY
- Database: ✅ AUTO-CREATES ON FIRST RUN
- Integration: 🚀 READY FOR COMPLETION

**Visit:** https://ai-tutor-94ff4.web.app to see your live application!
