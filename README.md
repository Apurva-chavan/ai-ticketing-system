# AI Ticketing System

An internal support desk where AI reads every incoming ticket, either resolves it on the spot or figures out who should handle it and routes it there. Built with FastAPI + React + Claude.

---

## What it does

Most ticketing tools just store tickets. This one actually reads them. When someone submits a ticket, Claude analyzes it before anything else happens — figures out what category it falls into, how urgent it is, what the person's tone is like, and whether it even needs a human at all. Simple stuff like password resets or leave policy questions get answered instantly. Anything that needs real work gets routed to the right department and the best available person for the job.

---

## Tech stack

- **Frontend** — React 18, Recharts for charts
- **Backend** — FastAPI (Python), SQLite
- **AI** — Claude API (`claude-sonnet-4`)

---

## Getting it running locally

You'll need Python 3.9+, Node.js 18+, and an Anthropic API key.

**1. Clone the repo**

```bash
git clone https://github.com/Apurva-chavan/ai-ticketing-system.git
cd ai-ticketing-system
```

**2. Set up the backend**

```bash
cd backend
pip install -r requirements.txt
```

Set your API key:

```bash
# Mac/Linux
export ANTHROPIC_API_KEY=your_key_here

# Windows
set ANTHROPIC_API_KEY=your_key_here
```

Start the server:

```bash
python main.py
# Runs at http://localhost:8000
```

**3. Set up the frontend**

```bash
cd ../frontend
npm install
npm start
# Runs at http://localhost:3000
```

---

## Features

**AI Analysis (Module 1)**

Every ticket goes through Claude before any routing happens. The output is a structured JSON contract — category, severity, sentiment, summary, confidence score, estimated resolution time. Routing logic reads only from that output, never from raw ticket text.

**Auto-Resolution (Module 2)**

If Claude decides the issue doesn't need a human — things like password resets, HR policy questions, tool FAQs — it writes a specific response and closes the ticket automatically. Users can mark the response as helpful or not, which feeds into the success rate metric on the analytics page.

**Department Routing (Module 3)**

Tickets that do need humans go to the right department based on what the ticket is actually about. DB and server issues get bumped to Critical. Access problems go to IT at High priority. The routing table covers Engineering, DevOps, Finance, HR, IT, Product, Marketing, and Legal.

**Employee Directory (Module 4)**

Each employee has a profile with their department, role, skill tags, current ticket load, and availability status (Available / Busy / On Leave). When routing a ticket, the system picks the best match — not just by department, but by who has the right skills, isn't overloaded, and is actually around.

Admins can add, edit, or deactivate employees from the admin panel.

**Ticket Lifecycle (Module 5)**

Tickets move through: New → Assigned → In Progress → Pending Info → Resolved → Closed

Agents can update status, leave internal notes, and request more info from the submitter. Every action gets logged in the ticket timeline. You can filter and search across all tickets by status, severity, department, or date.

**Analytics (Module 6)**

Dashboard shows: open/resolved/auto-resolved/escalated counts, department workload breakdown, severity distribution, average resolution time, top recurring categories this week, and the auto-resolution success rate (based on user feedback).

---

## Project structure

```
ai-ticketing-system/
├── backend/
│   ├── main.py              # FastAPI app — all routes and AI logic lives here
│   ├── requirements.txt
│   └── tickets.db           # SQLite, auto-created on first run
├── frontend/
│   └── src/
│       ├── App.js
│       ├── components/
│       │   └── Sidebar.js
│       ├── pages/
│       │   ├── Dashboard.js
│       │   ├── NewTicket.js
│       │   ├── TicketList.js
│       │   ├── TicketDetail.js
│       │   ├── Employees.js
│       │   └── Analytics.js
│       └── utils/
│           └── api.js
└── README.md
```

---

## How the AI prompt is designed

The prompt tells Claude to return a strict JSON object — nothing else. That object is treated as a contract: the routing logic reads `resolution_path`, `assigned_department`, `severity`, and `suggested_employee_id` from it directly, without ever touching the original ticket text. This keeps the routing deterministic and easy to debug.

---

## Known limitations

- No real-time updates — page needs a manual refresh (WebSocket support would fix this)
- Email notifications are simulated — events get logged but no actual emails are sent
- No auth system — all agents share one view, no login
- Auto-escalation for High/Critical tickets (the 2-hour rule) isn't implemented yet
- SQLite is fine for a demo but would need to be swapped out for anything at scale

---

## What I'd add with more time

WebSocket for live updates is the first thing — it's the only bonus requirement I didn't get to. After that: proper JWT auth, real email notifications via SendGrid, a background job for the auto-escalation rule, and PostgreSQL instead of SQLite.

