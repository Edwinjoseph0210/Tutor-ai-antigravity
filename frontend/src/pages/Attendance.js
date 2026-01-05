import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';

const Attendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await attendanceAPI.getAttendance();
      if (response.data.success) {
        setAttendanceRecords(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return <span className="badge bg-success">Present</span>;
      case 'Partial':
        return <span className="badge bg-warning">Partial</span>;
      case 'Absent':
        return <span className="badge bg-danger">Absent</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
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

  return (
    <div>
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">
            <i className="fas fa-calendar-check me-2"></i>Attendance Records
          </h1>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>{error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="fas fa-list me-2"></i>All Attendance Records
          </h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Time</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Session</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record[0]}>
                    <td>{record[0]}</td>
                    <td>{record[1] || '-'}</td>
                    <td>{record[2] || '-'}</td>
                    <td>{record[3] || '-'}</td>
                    <td>{record[4] || '-'}</td>
                    <td>{getStatusBadge(record[5])}</td>
                    <td>{record[6] ? `Session ${record[6]}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {attendanceRecords.length === 0 && (
            <div className="text-center py-4">
              <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
              <p className="text-muted">No attendance records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
