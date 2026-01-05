import axios from 'axios';

// Determine API base URL based on environment
const getAPIBaseURL = () => {
  // If environment variable is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // If running on localhost, use localhost backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5001/api`;
  }

  // Production: Use backend deployed on Render/Heroku/etc
  // Update this to your actual backend URL
  if (window.location.hostname === 'aitutor-team.web.app') {
    return 'https://tutor-ai-backend.onrender.com/api'; // Update with your backend URL
  }

  // Fallback: try to use relative /api path
  return `/api`;
};

const API_BASE_URL = getAPIBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/login', credentials),
  register: (userData) => api.post('/register', userData),
  logout: () => api.post('/logout'),
};

export const dashboardAPI = {
  getDashboardData: () => api.get('/dashboard'),
};

export const studentsAPI = {
  getStudents: () => api.get('/students'),
  addStudent: (studentData) => api.post('/students', studentData),
  updateStudent: (id, studentData) => api.put(`/students/${id}`, studentData),
  deleteStudent: (id) => api.delete(`/students/${id}`),
};

export const attendanceAPI = {
  getAttendance: () => api.get('/attendance'),
  getTodayAttendance: () => api.get('/attendance/today'),
  markAttendance: (name) => api.post('/mark_attendance', { name }),
  markMultipleAttendance: (names) => api.post('/mark_multiple_attendance', { names }),
  markAttendanceBatch: (data) => api.post('/mark_attendance_batch', data),
};

export const faceRecognitionAPI = {
  recognizeFaces: (imageData) => api.post('/recognize_faces', { image: imageData }),
  getCameras: () => api.get('/cameras'),
  getStudentsFromFaces: () => api.get('/faces/students'),
};

export const reportsAPI = {
  getReports: () => api.get('/reports'),
  exportCSV: () => api.get('/export_csv'),
};

export const geminiAPI = {
  ask: (query, context = 'educational') => api.post('/gemini/ask', { query, context }),
  getSyllabus: (data) => api.post('/gemini/syllabus', data),
  generateNotes: (data) => api.post('/gemini/notes', data),
  explainConcept: (data) => api.post('/gemini/explain', data),
};

export const lectureAPI = {
  // Session Management
  startLecture: (data) => api.post('/lectures/start', data),
  endLecture: (sessionId) => api.post('/lectures/end', { session_id: sessionId }),
  getCurrentLecture: () => api.get('/lectures/current'),
  updateProgress: (data) => api.post('/lectures/progress', data),
  
  // Content
  generateContent: (data) => api.post('/lectures/content/generate', data),
  getContent: (subject, chapter) => api.get(`/lectures/content/${subject}/${chapter}`),
  
  // Study Plan & Syllabus
  generateSyllabus: (data) => api.post('/lectures/syllabus/generate', data),
  generateStudyPlan: (data) => api.post('/lectures/study-plan/generate', data),
  getStudyPlan: (subject, chapter) => api.get(`/lectures/study-plan/${subject}/${chapter}`),
  
  // Attendance
  recordCheckpoint: (data) => api.post('/lectures/attendance/checkpoint', data),
  backgroundAttendance: (data) => api.post('/lectures/attendance/background', data),
  getAttendance: (sessionId) => api.get(`/lectures/attendance/${sessionId}`),
  overrideAttendance: (data) => api.post('/lectures/attendance/override', data),
  
  // MCQ Tests
  generateMCQ: (data) => api.post('/lectures/mcq/generate', data),
  getMCQ: (testId) => api.get(`/lectures/mcq/${testId}`),
  getMCQBySession: (sessionId) => api.get(`/lectures/mcq/session/${sessionId}`),
  submitMCQ: (data) => api.post('/lectures/mcq/submit', data),
  // PDF upload for Senku integration
  uploadPDF: (formData, config = {}) => api.post('/lectures/upload_pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config
  }),
};

export const timetableAPI = {
  generate: (className, options = {}) => api.post('/timetable/generate', { class: className, ...options }),
};

export default api;
