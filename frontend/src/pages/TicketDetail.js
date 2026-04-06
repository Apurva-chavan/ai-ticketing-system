import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import './TicketDetail.css';

const SEV_COLOR = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
const STATUS_COLOR = {
  'New': 'badge-new', 'Assigned': 'badge-assigned', 'Auto-Resolved': 'badge-auto',
  'In Progress': 'badge-inprogress', 'Resolved': 'badge-resolved', 'Closed': 'badge-closed',
  'Pending Info': 'badge-medium'
};
const EVENT_ICON = {
  'Created': '🎫', 'Auto-Resolved': '🤖', 'Assigned': '👤', 'Status Change': '🔄',
  'Note': '📝', 'Feedback': '⭐', 'Escalated': '🚨'
};

export default function TicketDetail({ id, navigate }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const t = await api.getTicket(id);
      setTicket(t);
      setNewStatus(t.status);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await api.updateTicket(id, {
        status: newStatus !== ticket.status ? newStatus : undefined,
        note: note || undefined,
        actor: 'Agent'
      });
      setNote('');
      load();
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Loading ticket...</p></div>;
  if (!ticket) return <div>Ticket not found</div>;

  return (
    <div className="ticket-detail animate-fade">
      <div className="td-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('tickets')}>← Back</button>
        <div className="td-title-area">
          <h1>#{ticket.id} — {ticket.title}</h1>
          <div className="td-badges">
            <span className={`badge ${SEV_COLOR[ticket.severity] || ''}`}>{ticket.severity}</span>
            <span className={`badge ${STATUS_COLOR[ticket.status] || ''}`}>{ticket.status}</span>
            {ticket.category && <span className="badge badge-new">{ticket.category}</span>}
          </div>
        </div>
      </div>

      <div className="td-grid">
        <div className="td-main">
          {/* Description */}
          <div className="card">
            <h3>📋 Issue Description</h3>
            <p className="ticket-description">{ticket.description}</p>
            <div className="submitter-info">
              Submitted by <strong>{ticket.submitted_by}</strong> ({ticket.submitted_email}) · {new Date(ticket.created_at).toLocaleString()}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card ai-card">
            <h3>🧠 AI Analysis</h3>
            <div className="analysis-grid">
              <InfoItem label="Category" value={ticket.category} />
              <InfoItem label="Severity" value={ticket.severity} />
              <InfoItem label="Sentiment" value={ticket.sentiment} />
              <InfoItem label="Confidence" value={`${ticket.confidence_score}%`} />
              <InfoItem label="Est. Time" value={`${ticket.estimated_hours}h`} />
              <InfoItem label="Resolution" value={ticket.resolution_path} />
            </div>
            {ticket.ai_summary && (
              <div className="ai-sum">
                <span className="analysis-label">Summary</span>
                <p>{ticket.ai_summary}</p>
              </div>
            )}
          </div>

          {/* Auto Response */}
          {ticket.auto_response && (
            <div className="card auto-card">
              <h3>🤖 Auto-Response</h3>
              <div className="auto-resp-body">{ticket.auto_response}</div>
              {ticket.feedback !== null && ticket.feedback !== undefined && (
                <div className="feedback-tag">
                  User feedback: {ticket.feedback ? '👍 Helpful' : '👎 Not Helpful'}
                </div>
              )}
              {ticket.feedback === null || ticket.feedback === undefined ? (
                <div className="feedback-inline">
                  <span>Was this helpful?</span>
                  <button className="btn btn-secondary btn-sm" onClick={async () => { await api.submitFeedback(id, true); load(); }}>👍 Yes</button>
                  <button className="btn btn-secondary btn-sm" onClick={async () => { await api.submitFeedback(id, false); load(); }}>👎 No</button>
                </div>
              ) : null}
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <h3>📅 Timeline</h3>
            <div className="timeline">
              {ticket.events?.map(ev => (
                <div key={ev.id} className="timeline-item">
                  <div className="timeline-dot">{EVENT_ICON[ev.event_type] || '●'}</div>
                  <div className="timeline-content">
                    <div className="timeline-top">
                      <span className="timeline-type">{ev.event_type}</span>
                      <span className="timeline-actor">{ev.actor}</span>
                      <span className="timeline-time">{new Date(ev.created_at).toLocaleString()}</span>
                    </div>
                    <div className="timeline-desc">{ev.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="td-sidebar">
          {/* Assignee */}
          {ticket.assignee && (
            <div className="card">
              <h3>👤 Assigned Agent</h3>
              <div className="assignee-block">
                <div className="assignee-avatar">{ticket.assignee.name[0]}</div>
                <div>
                  <div className="assignee-name">{ticket.assignee.name}</div>
                  <div className="assignee-role">{ticket.assignee.role}</div>
                  <div className="assignee-email">{ticket.assignee.email}</div>
                  <div className="assignee-load">Load: {ticket.assignee.current_load} tickets</div>
                </div>
              </div>
            </div>
          )}

          {ticket.assigned_department && (
            <div className="card">
              <h3>🏢 Department</h3>
              <p style={{ color: 'var(--text)', fontWeight: 600 }}>{ticket.assigned_department}</p>
            </div>
          )}

          {/* Update Panel */}
          <div className="card">
            <h3>⚡ Update Ticket</h3>
            <div className="update-form">
              <div>
                <label className="label">Change Status</label>
                <select className="input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {['New','Assigned','In Progress','Pending Info','Resolved','Closed'].map(s =>
                    <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Add Note</label>
                <textarea className="input" rows={3} placeholder="Add an internal note..." value={note}
                  onChange={e => setNote(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={updating}>
                {updating ? 'Saving...' : 'Update Ticket'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <span className="analysis-label">{label}</span>
      <span className="info-value">{value || '—'}</span>
    </div>
  );
}
