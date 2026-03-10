import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImmersiveLayout } from '../components/immersive';

const API_BASE = process.env.REACT_APP_API_URL || '';

const AddStudents = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [rollNo, setRollNo] = useState('');
    const [studentClass, setStudentClass] = useState('');
    const [photos, setPhotos] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const fileInputRef = useRef(null);

    const fetchStudents = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/teacher/students`, { credentials: 'include' });
            const data = await response.json();
            if (data.success) setStudents(data.data || []);
        } catch (error) { console.error('Error fetching students:', error); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const resizeImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX = 400;
                    let w = img.width, h = img.height;
                    if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                    else { w = Math.round(w * MAX / h); h = MAX; }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const addFiles = async (files) => {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        for (const file of imageFiles) {
            const b64 = await resizeImage(file);
            setPhotos(prev => [...prev, b64]);
            setPhotoPreviews(prev => [...prev, b64]);
        }
    };

    const handleFileUpload = (e) => { addFiles(e.target.files); };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); addFiles(e.dataTransfer.files); };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const removePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        setName(''); setEmail(''); setRollNo(''); setStudentClass('');
        setPhotos([]); setPhotoPreviews([]); setEditingId(null); setShowForm(false);
    };

    const handleSubmit = async () => {
        if (!name) { alert('Student name is required'); return; }
        if (photos.length < 4 && !editingId) { alert('Please upload at least 4 photos for face recognition'); return; }

        setSubmitting(true);
        try {
            if (editingId) {
                const response = await fetch(`${API_BASE}/api/teacher/students/${editingId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                    body: JSON.stringify({ name, email, roll_no: rollNo, student_class: studentClass })
                });
                const data = await response.json();
                if (data.success) setSuccessMsg('Student updated successfully!');
                else alert('Error: ' + data.message);
            } else {
                const response = await fetch(`${API_BASE}/api/teacher/add-student`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                    body: JSON.stringify({ name, email, roll_no: rollNo, student_class: studentClass, photos })
                });
                const data = await response.json();
                if (data.success) setSuccessMsg(`Student added! Username: ${data.data.username}, Password: ${data.data.default_password}`);
                else alert('Error: ' + data.message);
            }
            resetForm(); fetchStudents();
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (error) {
            console.error('Error saving student:', error);
            alert('Error saving student: ' + error.message);
        } finally { setSubmitting(false); }
    };

    const handleDelete = async (id, studentName) => {
        if (!window.confirm(`Delete student "${studentName}"?`)) return;
        try {
            const response = await fetch(`${API_BASE}/api/teacher/students/${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await response.json();
            if (data.success) fetchStudents();
        } catch (error) { console.error('Error deleting student:', error); }
    };

    const handleEdit = (student) => {
        setEditingId(student.id);
        setName(student.name || student.username);
        setEmail(student.email || '');
        setRollNo(student.roll_no || '');
        setStudentClass(student.student_class || '');
        setPhotos([]); setPhotoPreviews([]); setShowForm(true);
    };

    return (
        <ImmersiveLayout>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 2rem' }}>

                {/* Top Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={() => navigate('/dashboard')} style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'white',
                        }}>
                            <i className="fas fa-arrow-left" />
                        </button>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>Manage Students</h2>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>
                                {students.length} student{students.length !== 1 ? 's' : ''} registered
                            </div>
                        </div>
                    </div>
                    {!showForm && (
                        <button onClick={() => { resetForm(); setShowForm(true); }} style={{
                            background: 'linear-gradient(135deg, #ec4899, #f472b6)', color: 'white', border: 'none',
                            borderRadius: '12px', padding: '0.55rem 1.25rem', fontWeight: '700', cursor: 'pointer',
                            fontSize: '0.85rem', boxShadow: '0 4px 15px rgba(236,72,153,0.35)',
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}>
                            <i className="fas fa-plus" /> Add Student
                        </button>
                    )}
                </div>

                {/* Success Message */}
                {successMsg && (
                    <div style={{
                        background: 'rgba(52,211,153,0.1)', color: '#6ee7b7', padding: '0.8rem 1.25rem',
                        borderRadius: '14px', marginBottom: '1.25rem', fontWeight: '600', fontSize: '0.85rem',
                        border: '1px solid rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}>
                        <i className="fas fa-check-circle" /> {successMsg}
                    </div>
                )}

                {/* Add/Edit Student Form */}
                {showForm && (
                    <div style={{
                        background: 'rgba(255,255,255,0.04)', borderRadius: '20px', padding: '1.75rem',
                        marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                                {editingId ? 'Edit Student' : 'New Student'}
                            </h3>
                            <button onClick={resetForm} style={{
                                background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                                cursor: 'pointer', fontSize: '1rem',
                            }}>
                                <i className="fas fa-times" />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyleDark}>Name *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Student full name" style={inputStyleDark} />
                            </div>
                            <div>
                                <label style={labelStyleDark}>Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="student@email.com" style={inputStyleDark} />
                            </div>
                            <div>
                                <label style={labelStyleDark}>Roll No</label>
                                <input type="text" value={rollNo} onChange={e => setRollNo(e.target.value)}
                                    placeholder="e.g. 101" style={inputStyleDark} />
                            </div>
                            <div>
                                <label style={labelStyleDark}>Class</label>
                                <input type="text" value={studentClass} onChange={e => setStudentClass(e.target.value)}
                                    placeholder="e.g. 10A" style={inputStyleDark} />
                            </div>
                        </div>

                        {/* Photo Upload */}
                        {!editingId && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={labelStyleDark}>Upload Photos (min 4) *</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    style={{
                                        border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '14px',
                                        padding: '1.75rem', textAlign: 'center', cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.02)', transition: 'border-color 0.2s',
                                    }}
                                >
                                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.2)', marginBottom: '0.5rem', display: 'block' }} />
                                    <p style={{ color: 'rgba(255,255,255,0.35)', margin: 0, fontSize: '0.82rem' }}>
                                        Drag & drop photos or click to browse
                                    </p>
                                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
                                </div>

                                {photoPreviews.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                        {photoPreviews.map((photo, idx) => (
                                            <div key={idx} style={{ position: 'relative' }}>
                                                <img src={photo} alt={`Photo ${idx + 1}`} style={{
                                                    width: '64px', height: '64px', objectFit: 'cover',
                                                    borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                                                }} />
                                                <button onClick={() => removePhoto(idx)} style={{
                                                    position: 'absolute', top: '-5px', right: '-5px',
                                                    background: '#f87171', color: 'white', border: 'none',
                                                    borderRadius: '50%', width: '18px', height: '18px',
                                                    fontSize: '0.55rem', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <i className="fas fa-times" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', margin: '0.4rem 0 0' }}>
                                    {photos.length}/4 photos uploaded {photos.length >= 4 ? '✓' : ''}
                                </p>
                            </div>
                        )}

                        {/* Info note */}
                        {!editingId && (
                            <div style={{
                                background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
                                borderRadius: '12px', padding: '0.7rem 1rem', marginBottom: '1.25rem',
                                color: '#93c5fd', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            }}>
                                <i className="fas fa-info-circle" />
                                Default password: <strong>student123</strong> — students can change it after first login.
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={handleSubmit} disabled={submitting} style={{
                                background: 'linear-gradient(135deg, #ec4899, #f472b6)', color: 'white', border: 'none',
                                borderRadius: '12px', padding: '0.6rem 1.5rem', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer',
                                opacity: submitting ? 0.7 : 1, fontSize: '0.85rem',
                                boxShadow: '0 4px 15px rgba(236,72,153,0.3)',
                            }}>
                                {submitting ? 'Saving...' : (editingId ? 'Update Student' : 'Add Student')}
                            </button>
                            <button onClick={resetForm} style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px', padding: '0.6rem 1.5rem', cursor: 'pointer',
                                color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem',
                            }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Students Table */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: '18px',
                    border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                            Students ({students.length})
                        </h3>
                    </div>

                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                            <i className="fas fa-spinner fa-spin" style={{ display: 'block', fontSize: '1.2rem', marginBottom: '0.5rem', color: '#a78bfa' }} />
                            Loading students...
                        </div>
                    ) : students.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.25)' }}>
                            <i className="fas fa-user-graduate" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block', color: 'rgba(255,255,255,0.15)' }} />
                            <div style={{ fontSize: '0.85rem' }}>No students added yet.</div>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={thStyleDark}>#</th>
                                        <th style={thStyleDark}>Name</th>
                                        <th style={thStyleDark}>Username</th>
                                        <th style={thStyleDark}>Roll No</th>
                                        <th style={thStyleDark}>Class</th>
                                        <th style={thStyleDark}>Email</th>
                                        <th style={{ ...thStyleDark, textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, idx) => (
                                        <tr key={student.id}
                                            onMouseEnter={() => setHoveredRow(student.id)}
                                            onMouseLeave={() => setHoveredRow(null)}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                background: hoveredRow === student.id ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                transition: 'background 0.2s',
                                            }}>
                                            <td style={tdStyleDark}>{idx + 1}</td>
                                            <td style={{ ...tdStyleDark, fontWeight: '600', color: 'white' }}>{student.name}</td>
                                            <td style={tdStyleDark}>{student.username}</td>
                                            <td style={tdStyleDark}>{student.roll_no || '—'}</td>
                                            <td style={tdStyleDark}>{student.student_class || '—'}</td>
                                            <td style={tdStyleDark}>{student.email || '—'}</td>
                                            <td style={{ ...tdStyleDark, textAlign: 'center' }}>
                                                <button onClick={() => handleEdit(student)} title="Edit" style={{
                                                    background: 'none', border: 'none', color: '#a78bfa',
                                                    cursor: 'pointer', fontSize: '0.8rem', padding: '0.25rem 0.5rem',
                                                }}>
                                                    <i className="fas fa-pen" />
                                                </button>
                                                <button onClick={() => handleDelete(student.id, student.name)} title="Delete" style={{
                                                    background: 'none', border: 'none', color: '#f87171',
                                                    cursor: 'pointer', fontSize: '0.8rem', padding: '0.25rem 0.5rem',
                                                }}>
                                                    <i className="fas fa-trash" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </ImmersiveLayout>
    );
};

const labelStyleDark = {
    display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem',
    marginBottom: '0.35rem', fontWeight: '600',
};

const inputStyleDark = {
    width: '100%', padding: '0.65rem 1rem', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem',
    color: 'white', outline: 'none', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
};

const thStyleDark = {
    padding: '0.75rem 1rem', textAlign: 'left',
    fontSize: '0.7rem', fontWeight: '600', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const tdStyleDark = {
    padding: '0.7rem 1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)',
};

export default AddStudents;
