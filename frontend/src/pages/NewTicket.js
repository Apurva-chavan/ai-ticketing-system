import React, { useState } from 'react';
import { api } from '../utils/api';
import './NewTicket.css';

export default function NewTicket({ navigate }) {
  const [form, setForm] = useState({ title: '', description: '', submitted_by: '', submitted_email: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.submitted_by || !form.submitted_email) {
      setError('All fields are required.'); return;
    }
    setError(''); setLoading(true);
    try {
      const ticket = await api.createTicket(form);
      setResult(ticket);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const SEV_COLOR = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#22c55e' };

  if (result) {
    return (
      <div className="new-ticket animate-fade">
        <div className="result-card card">
          <div className="result-header">
            <div className="result-icon">{result.resolution_path === 'Auto-resolve' ? '🤖' : '📨'}</div>
            <div>
              <h2>{result.resolution_path === 'Auto-resolve' ? 'Ticket Auto-Resolved!' : 'Ticket Created & Routed'}</h2>
              <p className="result-id">Ticket #{result.id}</p>
            </div>
          </div>

          <div className="ai-analysis">
            <h3>🧠 AI Analysis</h3>
            <div className="analysis-grid">
              <div className="analysis-item">
                <span className="analysis-label">Category</span>
                <span className="analysis-value">{result.category}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Severity</span>
                <span className="analysis-value" style={{ color: SEV_COLOR[result.severity] }}>{result.severity}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Sentiment</span>
                <span className="analysis-value">{result.sentiment}</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Confidence</span>
                <span className="analysis-value">{result.confidence_score}%</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Est. Resolution</span>
                <span className="analysis-value">{result.estimated_hours}h</span>
              </div>
              <div className="analysis-item">
                <span className="analysis-label">Status</span>
                <span className="analysis-value">{result.status}</span>
              </div>
            </div>

            {result.ai_summary && (
              <div className="ai-summary">
                <span className="analysis-label">AI Summary</span>
                <p>{result.ai_summary}</p>
              </div>
            )}
          </div>

          {result.auto_response && (
            <div className="auto-response">
              <h3>💬 Auto-Response Sent</h3>
              <div className="response-body">{result.auto_response}</div>
              <div className="feedback-section">
                <p>Was this helpful?</p>
                <div className="feedback-btns">
                  <button className="btn btn-secondary btn-sm" onClick={async () => {
                    await api.submitFeedback(result.id, true);
                    alert('Thanks for your feedback! ✅');
                  }}>👍 Yes</button>
                  <button className="btn btn-secondary btn-sm" onClick={async () => {
                    await api.submitFeedback(result.id, false);
                    alert('Got it. We\'ll route this to a human agent. 🔄');
                  }}>👎 No</button>
                </div>
              </div>
            </div>
          )}

          {result.assignee && (
            <div className="assignee-box">
              <h3>👤 Assigned To</h3>
              <div className="assignee-info">
                <div className="assignee-avatar">{result.assignee.name[0]}</div>
                <div>
                  <div className="assignee-name">{result.assignee.name}</div>
                  <div className="assignee-role">{result.assignee.role} · {result.assignee.department}</div>
                  <div className="assignee-email">{result.assignee.email}</div>
                </div>
              </div>
            </div>
          )}

          {!result.assignee && result.resolution_path === 'Assign' && (
            <div className="assignee-box">
              <h3>🏢 Department</h3>
              <p>{result.assigned_department || 'Under review'}</p>
            </div>
          )}

          <div className="result-actions">
            <button className="btn btn-primary" onClick={() => navigate('ticket-detail', { ticketId: result.id })}>
              View Ticket Details
            </button>
            <button className="btn btn-secondary" onClick={() => { setResult(null); setForm({ title: '', description: '', submitted_by: '', submitted_email: '' }); }}>
              Submit Another
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('tickets')}>
              View All Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="new-ticket animate-fade">
      <div className="page-header">
        <div>
          <h1>Submit New Ticket</h1>
          <p className="page-sub">AI will analyze and route your ticket automatically</p>
        </div>
      </div>

      <div className="ticket-form card">
        <div className="form-row">
          <div className="form-group">
            <label className="label">Your Name</label>
            <input className="input" placeholder="John Doe" value={form.submitted_by}
              onChange={e => set('submitted_by', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Your Email</label>
            <input className="input" type="email" placeholder="you@company.com" value={form.submitted_email}
              onChange={e => set('submitted_email', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Issue Title</label>
          <input className="input" placeholder="Brief description of the issue" value={form.title}
            onChange={e => set('title', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="label">Detailed Description</label>
          <textarea className="input" rows={6}
            placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, or relevant context..."
            value={form.description}
            onChange={e => set('description', e.target.value)} />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-footer">
          <div className="ai-note">🤖 Our AI will analyze your ticket and either auto-resolve it or route it to the right team.</div>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><div className="spinner" style={{width:16,height:16}}></div> Analyzing with AI...</>
            ) : (
              'Submit Ticket'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
