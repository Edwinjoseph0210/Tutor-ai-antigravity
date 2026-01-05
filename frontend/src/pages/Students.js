import React, { useState, useEffect } from 'react';
import { studentsAPI, timetableAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('students'); // 'students' or 'timetable'
  const [selectedClass, setSelectedClass] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({ roll_number: '', name: '' });
  const [photo, setPhoto] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    fetchStudents();
    if (user && user.student_class) setSelectedClass(user.student_class);
  }, [user]);

  const fetchStudents = async () => {
    try {
      const response = await studentsAPI.getStudents();
      if (response.data.success) {
        setStudents(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await studentsAPI.updateStudent(editingStudent.id, formData);
        showAlert('Student updated successfully!', 'success');
      } else {
        const formDataToSend = new FormData();
        formDataToSend.append('roll_number', formData.roll_number);
        formDataToSend.append('name', formData.name);
        if (photo) {
          formDataToSend.append('photo', photo);
        }

        await studentsAPI.addStudent(formDataToSend);
        showAlert('Student added successfully!', 'success');
      }
      setShowModal(false);
      setEditingStudent(null);
      setFormData({ roll_number: '', name: '' });
      setPhoto(null);
      fetchStudents();
    } catch (err) {
      showAlert('Error saving student: ' + err.message, 'danger');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({ roll_number: student[1], name: student[2] });
    setPhoto(null); // Reset photo for edit mode (edit photo not supported yet)
    setShowModal(true);
  };

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentsAPI.deleteStudent(studentId);
        showAlert('Student deleted successfully!', 'success');
        fetchStudents();
      } catch (err) {
        showAlert('Error deleting student: ' + err.message, 'danger');
      }
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
  return (
    <div>
      <div className="row mb-3">
        <div className="col-12 d-flex justify-content-end">
          <div className="btn-group me-3" role="group">
            <button
              className={`btn btn-sm ${view === 'students' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setView('students')}
            >
              Students
            </button>
            <button
              className={`btn btn-sm ${view === 'timetable' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setView('timetable')}
            >
              Timetable
            </button>
          </div>

          {view === 'timetable' && (
            <div className="d-flex">
              <select
                className="form-select form-select-sm me-2"
                style={{ width: '180px' }}
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">Select class</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>{`Class ${g}`}</option>
                ))}
              </select>

              <button
                className="btn btn-sm btn-success"
                onClick={async () => {
                  if (!selectedClass) return alert('Select a class');
                  try {
                    const resp = await timetableAPI.generate(selectedClass);
                    if (resp.data.success) setTimetable(resp.data.timetable);
                    else alert(resp.data.message || 'Failed to fetch timetable');
                  } catch (err) {
                    alert('Error fetching timetable');
                  }
                }}
              >
                Load Timetable
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="mb-1">Students</h1>
              <p className="text-muted">Manage student records and photos</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingStudent(null);
                setFormData({ roll_number: '', name: '' });
                setPhoto(null);
                setShowModal(true);
              }}
            >
              <i className="fas fa-plus me-2"></i>Add Student
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger glass-card" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {view === 'students' && (
        <div className="glass-card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-transparent">
                  <tr>
                    <th className="px-4 border-0">ID</th>
                    <th className="border-0">Roll Number</th>
                    <th className="border-0">Name</th>
                    <th className="px-4 border-0 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student[0]}>
                      <td className="px-4 border-0 text-muted">#{student[0]}</td>
                      <td className="border-0">{student[1]}</td>
                      <td className="border-0 fw-medium">{student[2]}</td>
                      <td className="px-4 border-0 text-end">
                        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(student)}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(student[0])}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === 'timetable' && (
        <div className="glass-card p-3">
          <h5>Weekly Timetable {selectedClass ? `(Class ${selectedClass})` : ''}</h5>
          {!timetable && <div className="text-muted">No timetable loaded. Select class and click "Load Timetable".</div>}
          {timetable && (
            <div className="table-responsive">
              <table className="table table-bordered mt-3">
                <thead>
                  <tr>
                    <th>Day / Period</th>
                    {Array.from({ length: 8 }, (_, i) => <th key={i}>P{i+1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(timetable).map((day) => (
                    <tr key={day}>
                      <td className="fw-semibold">{day}</td>
                      {timetable[day].map((p) => (
                        <td key={p.period}>{p.subject}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-card border-0">
              <div className="modal-header border-0">
                <h5 className="modal-title">{editingStudent ? 'Edit Student' : 'Add Student'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Roll Number</label>
                    <input type="text" className="form-control bg-dark text-white border-secondary" value={formData.roll_number} onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input type="text" className="form-control bg-dark text-white border-secondary" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  {!editingStudent && (
                    <div className="mb-3">
                      <label className="form-label">Photo (Required for Face Recognition)</label>
                      <input type="file" className="form-control bg-dark text-white border-secondary" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
                      <div className="form-text text-muted">Upload a clear photo of the student's face.</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingStudent ? 'Update' : 'Add'} Student</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
