# AI Face Recognition Frontend

A modern React frontend for the AI Face Recognition Attendance Management System.

## Features

- **Modern UI**: Built with React 18 and Bootstrap 5
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Authentication**: Secure login system with session management
- **Dashboard**: Real-time attendance statistics and charts
- **Student Management**: Add, edit, and delete students
- **Attendance Tracking**: View and manage attendance records
- **Reports**: Generate attendance reports with charts and analytics
- **Face Recognition**: Live camera feed for face recognition and attendance marking

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Layout.js          # Main layout component
│   ├── contexts/
│   │   └── AuthContext.js    # Authentication context
│   ├── pages/
│   │   ├── Login.js          # Login page
│   │   ├── Dashboard.js      # Dashboard page
│   │   ├── Students.js       # Student management
│   │   ├── Attendance.js     # Attendance records
│   │   ├── Reports.js        # Reports and analytics
│   │   └── FaceRecognition.js # Face recognition interface
│   ├── services/
│   │   └── api.js            # API service layer
│   ├── App.js                # Main app component
│   ├── index.js              # Entry point
│   └── index.css             # Global styles
└── package.json
```

## API Integration

The frontend communicates with the Flask backend through RESTful APIs:

- **Authentication**: `/api/login`, `/api/logout`
- **Dashboard**: `/api/dashboard`
- **Students**: `/api/students`
- **Attendance**: `/api/attendance`, `/api/mark_attendance`
- **Reports**: `/api/reports`, `/api/export_csv`

## Default Login Credentials

- **Username**: admin
- **Password**: admin123

## Technologies Used

- **React 18**: Modern React with hooks
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **Bootstrap 5**: CSS framework for styling
- **Chart.js**: Charts and data visualization
- **Font Awesome**: Icons

## Development

The app uses Create React App with the following scripts:

- `npm start`: Start development server
- `npm test`: Run tests
- `npm run build`: Build for production
- `npm run eject`: Eject from Create React App (not recommended)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
