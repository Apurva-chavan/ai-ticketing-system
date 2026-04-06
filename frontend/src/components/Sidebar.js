import React from 'react';
import './Sidebar.css';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'new-ticket', label: 'New Ticket', icon: '+' },
  { id: 'tickets', label: 'All Tickets', icon: '≡' },
  { id: 'employees', label: 'Directory', icon: '◎' },
  { id: 'analytics', label: 'Analytics', icon: '∿' },
];

export default function Sidebar({ current, navigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div>
          <div className="logo-title">TicketAI</div>
          <div className="logo-sub">Smart Support System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`nav-item ${current === item.id || (current === 'ticket-detail' && item.id === 'tickets') ? 'active' : ''}`}
            onClick={() => navigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="ai-badge">
          <span className="ai-dot"></span>
          AI Engine Active
        </div>
        <div className="version">v1.0.0 · Claude Powered</div>
      </div>
    </aside>
  );
}
