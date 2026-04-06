import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './Analytics.css';

const COLORS = ['#4f7fff', '#7b5ea7', '#22c55e', '#f59e0b', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width: 32, height: 32 }}></div><p>Loading analytics...</p></div>;
  if (!data) return null;

  const sevData = data.severity_breakdown || [];

  return (
    <div className="analytics-page animate-fade">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-sub">System performance overview</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-row">
        <KPI label="Total Tickets" value={data.total} icon="🎫" />
        <KPI label="Open" value={data.open} icon="🔓" highlight="yellow" />
        <KPI label="Resolved" value={data.resolved} icon="✅" highlight="green" />
        <KPI label="Auto-Resolved" value={data.auto_resolved} icon="🤖" highlight="blue" />
        <KPI label="Escalated" value={data.escalated} icon="🚨" highlight="red" />
        <KPI label="AI Success Rate" value={`${data.auto_resolution_success_rate}%`} icon="✨" highlight="purple" />
      </div>

      <div className="charts-grid">
        {/* Dept Load Bar Chart */}
        <div className="chart-card card">
          <h3>Department Ticket Load</h3>
          {data.dept_load.length === 0
            ? <p className="empty-msg">No data yet</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.dept_load} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="department" tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b8fa8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                    {data.dept_load.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>}
        </div>

        {/* Severity Pie */}
        <div className="chart-card card">
          <h3>Severity Breakdown</h3>
          {sevData.length === 0
            ? <p className="empty-msg">No data yet</p>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sevData} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={80} label={({ severity, percent }) => `${severity} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {sevData.map((entry, i) => {
                      const c = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#22c55e' };
                      return <Cell key={i} fill={c[entry.severity] || COLORS[i]} />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>}
        </div>

        {/* Avg Resolution */}
        <div className="chart-card card">
          <h3>Avg Resolution Time by Department (hours)</h3>
          {data.avg_resolution_by_dept.length === 0
            ? <p className="empty-msg">No data yet</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.avg_resolution_by_dept} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="department" tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#8b8fa8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg_hours" name="Avg Hours" fill="#7b5ea7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>}
        </div>

        {/* Top Categories */}
        <div className="chart-card card">
          <h3>Top 5 Ticket Categories This Week</h3>
          {data.top_categories.length === 0
            ? <p className="empty-msg">No tickets this week</p>
            : <div className="cat-list">
                {data.top_categories.map((c, i) => (
                  <div key={c.category} className="cat-item">
                    <span className="cat-rank">#{i + 1}</span>
                    <span className="cat-name">{c.category}</span>
                    <div className="cat-bar-wrap">
                      <div className="cat-bar" style={{ width: `${Math.min(100, (c.count / (data.top_categories[0]?.count || 1)) * 100)}%`, background: COLORS[i] }}></div>
                    </div>
                    <span className="cat-count">{c.count}</span>
                  </div>
                ))}
              </div>}
        </div>
      </div>

      {/* Auto-resolution success */}
      <div className="card success-card">
        <div className="success-left">
          <h3>🤖 AI Auto-Resolution Performance</h3>
          <p>Percentage of auto-resolved tickets marked helpful by users</p>
        </div>
        <div className="success-meter">
          <div className="meter-ring">
            <svg viewBox="0 0 100 100" width="100" height="100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1d24" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="10"
                strokeDasharray={`${(data.auto_resolution_success_rate / 100) * 251.2} 251.2`}
                strokeLinecap="round" transform="rotate(-90 50 50)" />
            </svg>
            <div className="meter-value">{data.auto_resolution_success_rate}%</div>
          </div>
          <div className="meter-label">Success Rate</div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon, highlight }) {
  const colors = { yellow: '#f59e0b', green: '#22c55e', blue: '#4f7fff', red: '#ef4444', purple: '#7b5ea7' };
  return (
    <div className="kpi-card card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-value" style={highlight ? { color: colors[highlight] } : {}}>{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
