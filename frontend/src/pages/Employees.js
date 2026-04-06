import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import './Employees.css';

const DEPTS = ['Engineering', 'Finance', 'HR', 'IT', 'Product', 'Marketing', 'Legal', 'DevOps'];
const AVAIL_COLOR = { Available: 'badge-auto', Busy: 'badge-high', 'On Leave': 'badge-closed' };

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setEmployees(await api.listEmployees(filterDept)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterDept]);

  return (
    <div className="employees-page animate-fade">
      <div className="page-header">
        <div>
          <h1>Employee Directory</h1>
          <p className="page-sub">{employees.length} staff members</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Employee</button>
      </div>

      <div className="dept-filters">
        <button className={`dept-btn ${filterDept === '' ? 'active' : ''}`} onClick={() => setFilterDept('')}>All</button>
        {DEPTS.map(d => (
          <button key={d} className={`dept-btn ${filterDept === d ? 'active' : ''}`} onClick={() => setFilterDept(d)}>{d}</button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div><p>Loading...</p></div>
      ) : (
        <div className="emp-grid">
          {employees.map(emp => (
            editingId === emp.id
              ? <EditCard key={emp.id} emp={emp} onSave={async (data) => { await api.updateEmployee(emp.id, data); setEditingId(null); load(); }} onCancel={() => setEditingId(null)} />
              : <EmployeeCard key={emp.id} emp={emp} onEdit={() => setEditingId(emp.id)} onToggle={async () => { await api.updateEmployee(emp.id, { is_active: emp.is_active ? 0 : 1 }); load(); }} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddModal onClose={() => setShowAdd(false)} onSave={async (data) => {
          await api.createEmployee(data);
          setShowAdd(false);
          load();
        }} />
      )}
    </div>
  );
}

function EmployeeCard({ emp, onEdit, onToggle }) {
  return (
    <div className={`emp-card card ${!emp.is_active ? 'inactive' : ''}`}>
      <div className="emp-top">
        <div className="emp-avatar">{emp.name[0]}</div>
        <div className="emp-info">
          <div className="emp-name">{emp.name}</div>
          <div className="emp-role">{emp.role}</div>
          <div className="emp-dept">{emp.department}</div>
        </div>
        <span className={`badge ${AVAIL_COLOR[emp.availability] || 'badge-new'}`}>{emp.availability}</span>
      </div>

      <div className="emp-email">{emp.email}</div>

      <div className="emp-skills">
        {(emp.skill_tags || []).map(s => (
          <span key={s} className="skill-tag">{s}</span>
        ))}
      </div>

      <div className="emp-stats">
        <div className="emp-stat">
          <span className="stat-num">{emp.current_load}</span>
          <span className="stat-lbl">Open Tickets</span>
        </div>
        <div className="emp-stat">
          <span className="stat-num">{emp.avg_resolution_hours}h</span>
          <span className="stat-lbl">Avg Resolution</span>
        </div>
      </div>

      {!emp.is_active && <div className="inactive-badge">Deactivated</div>}

      <div className="emp-actions">
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>Edit</button>
        <button className={`btn btn-sm ${emp.is_active ? 'btn-danger' : 'btn-secondary'}`} onClick={onToggle}>
          {emp.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}

function EditCard({ emp, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: emp.name, role: emp.role,
    skill_tags: emp.skill_tags || [],
    availability: emp.availability
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="emp-card card edit-card">
      <h4>Edit {emp.name}</h4>
      <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Name" />
      <input className="input" value={form.role} onChange={e => set('role', e.target.value)} placeholder="Role" />
      <input className="input" value={form.skill_tags.join(', ')}
        onChange={e => set('skill_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
        placeholder="Skills (comma separated)" />
      <select className="input" value={form.availability} onChange={e => set('availability', e.target.value)}>
        <option>Available</option><option>Busy</option><option>On Leave</option>
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onSave(form)}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function AddModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', department: 'Engineering', role: '', skill_tags: [], availability: 'Available' });
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.email || !form.role) { setError('Name, email and role are required'); return; }
    try {
      await onSave({ ...form, skill_tags: skillInput.split(',').map(s => s.trim()).filter(Boolean) });
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal card">
        <div className="modal-header">
          <h3>Add New Employee</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="label">Name</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" /></div>
            <div className="form-group"><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="work@company.com" /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label">Department</label>
              <select className="input" value={form.department} onChange={e => set('department', e.target.value)}>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="label">Role / Designation</label><input className="input" value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Senior Engineer" /></div>
          </div>
          <div className="form-group">
            <label className="label">Skill Tags (comma separated)</label>
            <input className="input" value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Database, Python, API" />
          </div>
          <div className="form-group">
            <label className="label">Availability</label>
            <select className="input" value={form.availability} onChange={e => set('availability', e.target.value)}>
              <option>Available</option><option>Busy</option><option>On Leave</option>
            </select>
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Add Employee</button>
        </div>
      </div>
    </div>
  );
}
