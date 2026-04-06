import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import NewTicket from './pages/NewTicket';
import Employees from './pages/Employees';
import Analytics from './pages/Analytics';
import './App.css';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const navigate = (p, extra) => {
    setPage(p);
    if (extra?.ticketId) setSelectedTicketId(extra.ticketId);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard navigate={navigate} />;
      case 'tickets': return <TicketList navigate={navigate} />;
      case 'ticket-detail': return <TicketDetail id={selectedTicketId} navigate={navigate} />;
      case 'new-ticket': return <NewTicket navigate={navigate} />;
      case 'employees': return <Employees />;
      case 'analytics': return <Analytics />;
      default: return <Dashboard navigate={navigate} />;
    }
  };

  return (
    <div className="app">
      <Sidebar current={page} navigate={navigate} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
