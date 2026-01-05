# AI Face Recognition Attendance System - Full Stack

A complete full-stack application for AI-powered face recognition attendance management with a modern React frontend and Flask backend.

## 🚀 Features

### Backend (Flask API)
- **RESTful API**: Complete REST API with authentication
- **Face Recognition**: OpenCV and face_recognition library integration
- **Database**: SQLite database for students and attendance
- **Authentication**: Secure login system with password hashing
- **CORS Support**: Cross-origin resource sharing for frontend integration

### Frontend (React)
- **Modern UI**: Beautiful, responsive interface with Bootstrap 5
- **Real-time Dashboard**: Live attendance statistics and charts
- **Student Management**: Add, edit, and delete students
- **Attendance Tracking**: View and manage attendance records
- **Reports & Analytics**: Generate reports with interactive charts
- **Face Recognition Interface**: Live camera feed for attendance marking

## 📋 Prerequisites

- Python 3.7+
- Node.js 14+
- npm or yarn
- Webcam (for face recognition)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Ai_FACE_RECOGNITION-main
```

### 2. Backend Setup (Flask API)

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Flask backend:**
   ```bash
   python app.py
   ```
   The API will be available at `http://localhost:5000`

### 3. Frontend Setup (React)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the React development server:**
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3000`

## 🎯 Usage

### 1. Access the Application
- Open your browser and go to `http://localhost:3000`
- Login with default credentials:
  - **Username**: admin
  - **Password**: admin123

### 2. Dashboard
- View real-time attendance statistics
- See today's attendance overview
- Access quick actions and charts

### 3. Student Management
- Add new students with roll numbers and names
- Edit existing student information
- Delete students (with confirmation)

### 4. Face Recognition
- Start the camera for live face recognition
- Position faces in front of the camera
- Mark attendance for recognized faces
- Stop camera when done

### 5. Reports & Analytics
- View attendance reports with interactive charts
- Export data to CSV format
- Analyze attendance patterns

## 🔧 Configuration

### Backend Configuration
- **Database**: SQLite database (`attendance.db`)
- **Authentication**: Session-based authentication
- **CORS**: Enabled for frontend communication

### Frontend Configuration
- **API Base URL**: `http://localhost:5000/api`
- **Proxy**: Configured for development
- **Authentication**: Token-based authentication

## 📁 Project Structure

```
Ai_FACE_RECOGNITION-main/
├── app.py                    # Flask backend API
├── attendance.py             # Attendance management module
├── main.py                   # Original face recognition script
├── requirements.txt          # Python dependencies
├── attendance.db            # SQLite database
├── faces/                   # Face images directory
├── frontend/                # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── contexts/       # React contexts
│   └── package.json
└── README_FULLSTACK.md      # This file
```

## 🔐 Security Features

- **Password Hashing**: Secure password storage with Werkzeug
- **Session Management**: Secure session handling
- **CORS Protection**: Configured for specific origins
- **Input Validation**: Server-side validation for all inputs

## 📊 Database Schema

### Students Table
- `id`: Primary key
- `roll_number`: Unique student roll number
- `name`: Student name

### Attendance Table
- `id`: Primary key
- `student_id`: Foreign key to students
- `date`: Attendance date
- `time`: Attendance time
- `status`: Present/Partial/Absent
- `session_id`: Session identifier

### Users Table (Authentication)
- `id`: Primary key
- `username`: Login username
- `password_hash`: Hashed password
- `role`: User role (admin)

## 🚀 Deployment

### Backend Deployment
1. Install production dependencies
2. Configure environment variables
3. Use a production WSGI server (Gunicorn)
4. Set up reverse proxy (Nginx)

### Frontend Deployment
1. Build the React app: `npm run build`
2. Serve static files with a web server
3. Configure API endpoints for production

## 🐛 Troubleshooting

### Common Issues

1. **Camera not working**: Ensure webcam permissions are granted
2. **API connection failed**: Check if Flask backend is running
3. **Database errors**: Ensure SQLite database is accessible
4. **CORS errors**: Verify Flask-CORS is installed and configured

### Debug Mode
- Backend: Set `debug=True` in `app.py`
- Frontend: Use React Developer Tools

## 📝 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Dashboard
- `GET /api/dashboard` - Get dashboard data

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Add new student
- `PUT /api/students/{id}` - Update student
- `DELETE /api/students/{id}` - Delete student

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/mark_attendance` - Mark attendance

### Reports
- `GET /api/reports` - Get reports data
- `GET /api/export_csv` - Export CSV

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Create an issue in the repository
