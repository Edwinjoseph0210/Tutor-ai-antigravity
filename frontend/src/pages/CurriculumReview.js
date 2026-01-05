import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { lectureAPI } from '../services/api';

const CurriculumReview = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Expect curriculum to be passed via location.state.curriculum
  const initial = (location.state && location.state.curriculum) || [];
  const pdfHash = (location.state && location.state.pdf_hash) || null;

  const [items, setItems] = useState(initial.map((c, i) => ({ id: i+1, ...c })));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(initial.map((c, i) => ({ id: i+1, ...c })));
  }, [initial]);

  const updateItem = (id, key, value) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [key]: value } : it));
  };

  const addItem = () => {
    const next = items.length + 1;
    setItems(prev => [...prev, { id: next, title: `New Unit ${next}`, type: 'section', order: next }]);
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(it => it.id !== id).map((it, idx) => ({ ...it, order: idx+1 })));
  };

  const moveItem = (id, dir) => {
    const idx = items.findIndex(it => it.id === id);
    if (idx === -1) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= items.length) return;
    const copy = [...items];
    const tmp = copy[newIdx];
    copy[newIdx] = copy[idx];
    copy[idx] = tmp;
    // reassign orders
    setItems(copy.map((it, i) => ({ ...it, order: i+1 })));
  };

  const saveToLecture = async () => {
    // For now, we simply navigate back with the edited curriculum in state
    setSaving(true);
    try {
      // Optionally call an API to store the curriculum server-side
      // e.g. lectureAPI.saveCurriculum({ pdf_hash: pdfHash, curriculum: items })
      // But keep it local for instant UX
      navigate('/ai-lecture', { state: { reviewedCurriculum: items } });
    } catch (err) {
      console.error(err);
      alert('Failed to save curriculum');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Review & Edit Curriculum</h3>
        <div>
          <button className="btn btn-secondary me-2" onClick={() => navigate(-1)}>Back</button>
          <button className="btn btn-primary" onClick={saveToLecture} disabled={saving}>{saving ? 'Saving…' : 'Save & Use'}</button>
        </div>
      </div>

      <div className="list-group">
        {items.map(it => (
          <div key={it.id} className="list-group-item mb-2">
            <div className="d-flex justify-content-between align-items-start">
              <div style={{flex:1}}>
                <input type="text" className="form-control mb-2" value={it.title} onChange={(e)=>updateItem(it.id, 'title', e.target.value)} />
                <div className="row">
                  <div className="col-md-4">
                    <select className="form-select" value={it.type} onChange={(e)=>updateItem(it.id, 'type', e.target.value)}>
                      <option value="chapter">chapter</option>
                      <option value="section">section</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <input type="number" className="form-control" value={it.order} onChange={(e)=>updateItem(it.id, 'order', Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="ms-3 d-flex flex-column">
                <button className="btn btn-sm btn-outline-secondary mb-1" onClick={()=>moveItem(it.id,'up')}>↑</button>
                <button className="btn btn-sm btn-outline-secondary mb-1" onClick={()=>moveItem(it.id,'down')}>↓</button>
                <button className="btn btn-sm btn-danger" onClick={()=>removeItem(it.id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <button className="btn btn-outline-primary me-2" onClick={addItem}>Add Unit</button>
        <button className="btn btn-outline-secondary" onClick={() => setItems(initial.map((c, i) => ({ id: i+1, ...c })))}>Reset</button>
      </div>
    </div>
  );
};

export default CurriculumReview;
