import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { dashboardAPI, reportsAPI } from '../services/api';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.getDashboardData();
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const response = await reportsAPI.exportCSV();
      if (response.data.success) {
        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = response.data.file;
        link.download = 'attendance_report.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert('CSV exported successfully!', 'success');
      } else {
        showAlert('Failed to export CSV: ' + response.data.message, 'danger');
      }
    } catch (error) {
      showAlert('Error exporting CSV: ' + error.message, 'danger');
    }
  };

  const showAlert = (message, type) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show glass-card border-0 text-white`;
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('main').insertBefore(alertDiv, document.querySelector('main').firstChild);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger glass-card" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>{error}
      </div>
    );
  }

  const { today_attendance = [], total_students = 0 } = dashboardData || {};

  const presentCount = today_attendance.filter(student => student.status === 'Present').length;
  const partialCount = today_attendance.filter(student => student.status === 'Partial').length;
  const absentCount = today_attendance.filter(student => student.status === 'Absent').length;

  const chartData = {
    labels: ['Present', 'Partial', 'Absent'],
    datasets: [{
      data: [presentCount, partialCount, absentCount],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
          padding: 20
        }
      }
    },
    cutout: '75%',
    animation: {
      animateRotate: true,
      animateScale: true
    }
  };

  const StatCard = ({ title, value, icon, color, label }) => (
    <div className="col-md-3">
      <div className="glass-card p-4 h-100 position-relative overflow-hidden">
        <div className={`position-absolute top-0 end-0 p-3 opacity-10 text-${color}`}>
          <i className={`fas ${icon} fa-4x`}></i>
        </div>
        <div className="position-relative z-1">
          <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>{label}</h6>
          <h2 className="mb-0 fw-bold">{value}</h2>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="mb-1">Dashboard</h1>
          <p className="text-muted mb-0">Welcome back, Admin</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" onClick={exportCSV}>
            <i className="fas fa-download me-2"></i>Export Report
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row g-4 mb-5">
        <StatCard
          title="Total Students"
          value={total_students}
          icon="fa-users"
          color="primary"
          label="Total Students"
        />
        <StatCard
          title="Present"
          value={presentCount}
          icon="fa-check-circle"
          color="success"
          label="Present Today"
        />
        <StatCard
          title="Partial"
          value={partialCount}
          icon="fa-clock"
          color="warning"
          label="Partial Today"
        />
        <StatCard
          title="Absent"
          value={absentCount}
          icon="fa-times-circle"
          color="danger"
          label="Absent Today"
        />
      </div>

      <div className="row g-4">
        {/* Today's Attendance */}
        <div className="col-lg-8">
          <div className="glass-card h-100">
            <div className="card-header d-flex justify-content-between align-items-center border-0 pb-0 pt-4 px-4">
              <h5 className="card-title mb-0">Today's Attendance</h5>
              <Link to="/attendance" className="btn btn-sm btn-outline-secondary">View All</Link>
            </div>
            <div className="card-body px-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="bg-transparent">
                    <tr>
                      <th className="px-4 border-0">Roll Number</th>
                      <th className="border-0">Name</th>
                      <th className="px-4 border-0 text-end">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {today_attendance.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-5 text-muted">
                          No attendance records for today
                        </td>
                      </tr>
                    ) : (
                      today_attendance.map((student) => (
                        <tr key={student.id}>
                          <td className="px-4 border-0 text-muted">#{student.roll_number}</td>
                          <td className="border-0 fw-medium">{student.name}</td>
                          <td className="px-4 border-0 text-end">
                            <span className={`badge bg-${student.status === 'Present' ? 'success' :
                                student.status === 'Partial' ? 'warning' : 'danger'
                              }`}>
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Chart */}
        <div className="col-lg-4">
          <div className="glass-card mb-4">
            <div className="card-header border-0 pt-4 px-4">
              <h5 className="card-title mb-0">Overview</h5>
            </div>
            <div className="card-body p-4">
              <div className="chart-container" style={{ height: '220px' }}>
                <Doughnut
                  key={`chart-${presentCount}-${partialCount}-${absentCount}`}
                  data={chartData}
                  options={chartOptions}
                />
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-header border-0 pt-4 px-4">
              <h5 className="card-title mb-0">Quick Actions</h5>
            </div>
            <div className="card-body p-4">
              <div className="d-grid gap-3">
                <Link to="/class-attendance" className="btn btn-outline-secondary text-start p-3 d-flex align-items-center">
                  <div className="bg-primary bg-opacity-10 p-2 rounded me-3 text-primary">
                    <i className="fas fa-chalkboard-teacher"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-white">Class Attendance</div>
                    <div className="small text-muted">Start a new class session</div>
                  </div>
                </Link>

                <Link to="/face-recognition" className="btn btn-outline-secondary text-start p-3 d-flex align-items-center">
                  <div className="bg-success bg-opacity-10 p-2 rounded me-3 text-success">
                    <i className="fas fa-camera"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-white">Face Recognition</div>
                    <div className="small text-muted">Identify students via camera</div>
                  </div>
                </Link>

                <Link to="/students" className="btn btn-outline-secondary text-start p-3 d-flex align-items-center">
                  <div className="bg-warning bg-opacity-10 p-2 rounded me-3 text-warning">
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <div>
                    <div className="fw-bold text-white">Manage Students</div>
                    <div className="small text-muted">Add or edit student records</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
