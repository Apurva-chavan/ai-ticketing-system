import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import './TicketList.css';

const SEV_COLOR = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
const STATUS_COLOR = {
  'New': 'badge-new', 'Assigned': 'badge-assigned', 'Auto-Resolved': 'badge-auto',
  'In Progress': 'badge-inprogress', 'Resolved': 'badge-resolved', 'Closed': 'badge-closed',
  'Pending Info': 'badge-medium'
};

export default function TicketList({ navigate }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', severity: '', department: '', search: '' });

  const load = async () => {
    setLoading(true);
    try {
      const t = await api.listTickets(filters);
      setTickets(t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div className="ticket-list-page animate-fade">
      <div className="page-header">
        <div>
          <h1>All Tickets</h1>
          <p className="page-sub">{tickets.length} tickets found</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('new-ticket')}>+ New Ticket</button>
      </div>

      <div className="filters card">
        <input className="input" placeholder="Search tickets..." value={filters.search}
          onChange={e => setFilter('search', e.target.value)} style={{ flex: 2 }} />
        <select className="input" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {['New','Assigned','In Progress','Pending Info','Auto-Resolved','Resolved','Closed'].map(s =>
            <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={filters.severity} onChange={e => setFilter('severity', e.target.value)}>
          <option value="">All Severities</option>
          {['Critical','High','Medium','Low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={filters.department} onChange={e => setFilter('department', e.target.value)}>
          <option value="">All Departments</option>
          {['Engineering','Finance','HR','IT','Product','Marketing','Legal','DevOps'].map(d =>
            <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn btn-primary" onClick={load}>Search</button>
        <button className="btn btn-secondary" onClick={() => {
          setFilters({ status: '', severity: '', department: '', search: '' });
          setTimeout(load, 50);
        }}>Clear</button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner"></div><p>Loading...</p></div>
      ) : (
        <div className="tickets-table card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Submitted By</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Department</th>
                <th>Assignee</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No tickets found</td></tr>
              )}
              {tickets.map(t => (
                <tr key={t.id} onClick={() => navigate('ticket-detail', { ticketId: t.id })} className="clickable-row">
                  <td className="id-cell">#{t.id}</td>
                  <td className="title-cell">{t.title}</td>
                  <td>{t.submitted_by}</td>
                  <td><span className="badge badge-new">{t.category}</span></td>
                  <td><span className={`badge ${SEV_COLOR[t.severity] || ''}`}>{t.severity}</span></td>
                  <td><span className={`badge ${STATUS_COLOR[t.status] || ''}`}>{t.status}</span></td>
                  <td>{t.assigned_department || '—'}</td>
                  <td>{t.assignee_name || '—'}</td>
                  <td className="date-cell">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
