const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Error');
  }
  return res.json();
}

export const api = {
  // Tickets
  createTicket: (data) => req('POST', '/api/tickets', data),
  listTickets: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v)));
    return req('GET', `/api/tickets?${q}`);
  },
  getTicket: (id) => req('GET', `/api/tickets/${id}`),
  updateTicket: (id, data) => req('PATCH', `/api/tickets/${id}`, data),
  submitFeedback: (id, helpful) => req('POST', `/api/tickets/${id}/feedback`, { helpful }),
  
  // Employees
  listEmployees: (dept) => req('GET', `/api/employees${dept ? `?department=${dept}` : ''}`),
  createEmployee: (data) => req('POST', '/api/employees', data),
  updateEmployee: (id, data) => req('PATCH', `/api/employees/${id}`, data),
  
  // Analytics
  getAnalytics: () => req('GET', '/api/analytics'),
};
