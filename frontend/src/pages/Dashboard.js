import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import './Dashboard.css';

const SEV_COLOR = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
const STATUS_COLOR = {
  'New': 'badge-new', 'Assigned': 'badge-assigned', 'Auto-Resolved': 'badge-auto',
  'In Progress': 'badge-inprogress', 'Resolved': 'badge-resolved', 'Closed': 'badge-closed',
  'Pending Info': 'badge-medium'
};

export default function Dashboard({ navigate }) {
  const [tickets, setTickets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listTickets(), api.getAnalytics()])
      .then(([t, a]) => { setTickets(t); setAnalytics(a); })
      .finally(() => setLoading(false));
  }, []);

  const recent = tickets.slice(0, 6);
  const critical = tickets.filter(t => t.severity === 'Critical' && !['Resolved','Closed','Auto-Resolved'].includes(t.status));

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" style={{width:32,height:32}}></div>
      <p>Loading dashboard...</p>
    </div>
  );

  return (
    <div className="dashboard animate-fade">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-sub">AI-powered support overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('new-ticket')}>
          + New Ticket
        </button>
      </div>

      {critical.length > 0 && (
        <div className="alert-banner">
          🔴 {critical.length} critical ticket{critical.length > 1 ? 's' : ''} require immediate attention
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Total Tickets" value={analytics?.total ?? 0} icon="🎫" color="accent" />
        <StatCard label="Open" value={analytics?.open ?? 0} icon="🔓" color="yellow" />
        <StatCard label="Auto-Resolved" value={analytics?.auto_resolved ?? 0} icon="🤖" color="green" />
        <StatCard label="Escalated" value={analytics?.escalated ?? 0} icon="🚨" color="red" />
        <StatCard label="AI Success Rate" value={`${analytics?.auto_resolution_success_rate ?? 0}%`} icon="✨" color="accent2" />
        <StatCard label="Resolved" value={analytics?.resolved ?? 0} icon="✅" color="green" />
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="section-header">
            <h3>Recent Tickets</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('tickets')}>View All</button>
          </div>
          <div className="ticket-list-mini">
            {recent.length === 0 && <p className="empty-msg">No tickets yet. Create your first one!</p>}
            {recent.map(t => (
              <div key={t.id} className="ticket-row" onClick={() => navigate('ticket-detail', { ticketId: t.id })}>
                <div className="ticket-row-left">
                  <span className={`badge ${SEV_COLOR[t.severity] || 'badge-low'}`}>{t.severity}</span>
                  <div>
                    <div className="ticket-title">{t.title}</div>
                    <div className="ticket-meta">{t.submitted_by} · {t.category} · {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <span className={`badge ${STATUS_COLOR[t.status] || 'badge-new'}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h3 className="section-title">Top Categories This Week</h3>
          <div className="category-list">
            {analytics?.top_categories?.length === 0 && <p className="empty-msg">No data yet</p>}
            {analytics?.top_categories?.map((c, i) => (
              <div key={c.category} className="category-row">
                <span className="cat-rank">#{i+1}</span>
                <span className="cat-name">{c.category}</span>
                <div className="cat-bar-wrap">
                  <div className="cat-bar" style={{ width: `${Math.min(100, c.count * 20)}%` }}></div>
                </div>
                <span className="cat-count">{c.count}</span>
              </div>
            ))}
          </div>

          <div className="divider"></div>

          <h3 className="section-title">Department Load</h3>
          <div className="dept-list">
            {analytics?.dept_load?.map(d => (
              <div key={d.department} className="dept-row">
                <span>{d.department}</span>
                <span className="dept-count">{d.count} tickets</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
