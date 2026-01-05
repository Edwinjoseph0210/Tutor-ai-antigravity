import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { reportsAPI } from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await reportsAPI.getReports();
      if (response.data.success) {
        setReportsData(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const response = await reportsAPI.exportCSV();
      if (response.data.success) {
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
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
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
      <div className="alert alert-danger" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>{error}
      </div>
    );
  }

  const { attendance_data = [], recent_records = [] } = reportsData || {};

  // Prepare chart data
  const chartData = {
    labels: attendance_data.map(student => student.name),
    datasets: [{
      label: 'Attendance Percentage',
      data: attendance_data.map(student => student.percent),
      backgroundColor: attendance_data.map(student => {
        if (student.status === 'Present') return '#28a745';
        if (student.status === 'Partial') return '#ffc107';
        return '#dc3545';
      }),
      borderColor: attendance_data.map(student => {
        if (student.status === 'Present') return '#1e7e34';
        if (student.status === 'Partial') return '#e0a800';
        return '#bd2130';
      }),
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };

  return (
    <div>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1>
              <i className="fas fa-chart-bar me-2"></i>Reports & Analytics
            </h1>
            <button className="btn btn-primary" onClick={exportCSV}>
              <i className="fas fa-download me-2"></i>Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-chart-bar me-2"></i>Attendance Summary
              </h5>
            </div>
            <div className="card-body">
              <div className="chart-container" style={{ height: '400px' }}>
                <Bar 
                  key={`reports-chart-${attendance_data.length}`}
                  data={chartData} 
                  options={chartOptions} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Attendance Data Table */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-table me-2"></i>Student Attendance Summary
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
                      <th>Percentage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance_data.map((student) => (
                      <tr key={student.id}>
                        <td>{student.id}</td>
                        <td>{student.roll_number}</td>
                        <td>{student.name}</td>
                        <td>{student.percent}%</td>
                        <td>
                          {student.status === 'Present' && (
                            <span className="badge bg-success">Present</span>
                          )}
                          {student.status === 'Partial' && (
                            <span className="badge bg-warning">Partial</span>
                          )}
                          {student.status === 'Absent' && (
                            <span className="badge bg-danger">Absent</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Records */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-clock me-2"></i>Recent Records
              </h5>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                {recent_records.slice(0, 10).map((record, index) => (
                  <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold">{record[2]}</div>
                      <small className="text-muted">{record[0]} {record[1]}</small>
                    </div>
                    <span className={`badge ${
                      record[3] === 'Present' ? 'bg-success' : 
                      record[3] === 'Partial' ? 'bg-warning' : 'bg-danger'
                    }`}>
                      {record[3]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
