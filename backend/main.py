from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import json
import os
import httpx
from datetime import datetime, timedelta
import asyncio
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pathlib
load_dotenv()

app = FastAPI(title="AI Ticketing System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "tickets.db"

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        skill_tags TEXT DEFAULT '[]',
        avg_resolution_hours REAL DEFAULT 4.0,
        current_load INTEGER DEFAULT 0,
        availability TEXT DEFAULT 'Available',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        submitted_by TEXT NOT NULL,
        submitted_email TEXT NOT NULL,
        status TEXT DEFAULT 'New',
        category TEXT,
        severity TEXT,
        sentiment TEXT,
        ai_summary TEXT,
        resolution_path TEXT,
        confidence_score REAL,
        estimated_hours REAL,
        assigned_department TEXT,
        assigned_employee_id INTEGER,
        auto_response TEXT,
        feedback INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (assigned_employee_id) REFERENCES employees(id)
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS ticket_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        description TEXT NOT NULL,
        actor TEXT DEFAULT 'System',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    )""")
    c.execute("SELECT COUNT(*) FROM employees")
    if c.fetchone()[0] == 0:
        seed_employees = [
            ("Arjun Sharma",   "arjun@company.com",   "Engineering", "Senior Backend Engineer", '["Database","Python","API","Bug"]',         3.5,  2, "Available"),
            ("Priya Nair",     "priya@company.com",   "Engineering", "DevOps Engineer",          '["Server","Networking","AWS","Kubernetes"]', 2.0,  4, "Available"),
            ("Rohan Mehta",    "rohan@company.com",   "Engineering", "Frontend Engineer",        '["React","Bug","Feature","UI"]',             5.0,  1, "Busy"),
            ("Sneha Iyer",     "sneha@company.com",   "Finance",     "Payroll Specialist",       '["Payroll","Billing","Reimbursement"]',      6.0,  0, "Available"),
            ("Vikram Patel",   "vikram@company.com",  "Finance",     "Finance Analyst",          '["Billing","Invoicing","Finance"]',          8.0,  3, "Available"),
            ("Ananya Rao",     "ananya@company.com",  "HR",          "HR Manager",               '["Leave","Onboarding","HR","Policy"]',       4.0,  1, "Available"),
            ("Karthik Das",    "karthik@company.com", "HR",          "HR Executive",             '["Leave","HR","Compliance","Policy"]',       3.0,  2, "On Leave"),
            ("Meera Pillai",   "meera@company.com",   "IT",          "IT Support Lead",          '["Access","Networking","Account","IT"]',     1.5,  5, "Busy"),
            ("Suresh Babu",    "suresh@company.com",  "IT",          "Systems Admin",            '["Access","Server","IT","Networking"]',      2.5,  2, "Available"),
            ("Divya Krishnan", "divya@company.com",   "Product",     "Product Manager",          '["Feature","Product","Bug","UX"]',          10.0,  3, "Available"),
            ("Arun Kumar",     "arun@company.com",    "Marketing",   "Marketing Manager",        '["Marketing","Content","Branding"]',        12.0,  0, "Available"),
            ("Lakshmi Venkat", "lakshmi@company.com", "Legal",       "Legal Counsel",            '["Legal","Compliance","Contract"]',         24.0,  1, "Available"),
        ]
        c.executemany(
            "INSERT INTO employees (name,email,department,role,skill_tags,avg_resolution_hours,current_load,availability) VALUES (?,?,?,?,?,?,?,?)",
            seed_employees
        )
    conn.commit()
    conn.close()

init_db()

class TicketCreate(BaseModel):
    title: str
    description: str
    submitted_by: str
    submitted_email: str

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    note: Optional[str] = None
    actor: Optional[str] = "Agent"

class EmployeeCreate(BaseModel):
    name: str
    email: str
    department: str
    role: str
    skill_tags: List[str] = []
    availability: str = "Available"

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    skill_tags: Optional[List[str]] = None
    availability: Optional[str] = None
    is_active: Optional[int] = None

class FeedbackModel(BaseModel):
    helpful: bool

ANALYSIS_PROMPT = """You are an AI ticket analyst for an internal enterprise helpdesk system.
Analyze the ticket below and return ONLY valid JSON with exactly these fields:

{{
  "category": "<one of: Billing|Bug|Access|HR|Server|DB|Feature|Other>",
  "ai_summary": "<2-3 sentence clear summary of the issue>",
  "severity": "<one of: Critical|High|Medium|Low>",
  "sentiment": "<one of: Frustrated|Neutral|Polite>",
  "resolution_path": "<one of: Auto-resolve|Assign>",
  "assigned_department": "<one of: Engineering|Finance|HR|IT|Product|Marketing|Legal|DevOps or null>",
  "confidence_score": <number 0-100>,
  "estimated_hours": <number: realistic hours to resolve>,
  "auto_response": "<if resolution_path is Auto-resolve, write a professional helpful response. Otherwise null>",
  "reasoning": "<1 sentence explaining your routing decision>"
}}

Rules:
- Auto-resolve ONLY for: password resets, leave policy FAQs, general HR FAQs, simple billing clarifications, tool usage questions
- Assign for everything else (bugs, access issues, server problems, payroll disputes, etc.)
- DB/data corruption → Engineering, severity bump to Critical
- Server down → Engineering/DevOps, severity bump to Critical
- Access/account lock → IT, severity High
- Legal queries → Legal, severity High
- Be accurate and consistent. Think before classifying.

TICKET:
Title: {title}
Description: {description}
Submitted by: {name}
"""

async def analyze_ticket_with_ai(title: str, description: str, name: str) -> dict:
    prompt = ANALYSIS_PROMPT.format(title=title, description=description, name=name)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1000,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            data = resp.json()
            if "error" in data:
                print(f"API Error: {data['error']}")
                return fallback_analysis(title, description)
            text = data["content"][0]["text"].strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
    except Exception as e:
        print(f"AI analysis failed: {e}")
        return fallback_analysis(title, description)


def fallback_analysis(title: str, description: str) -> dict:
    title_lower = (title + " " + description).lower()
    if any(w in title_lower for w in ["password", "reset", "forgot"]):
        return {"category": "Access", "severity": "Low", "sentiment": "Neutral", "resolution_path": "Auto-resolve", "assigned_department": None, "confidence_score": 88, "estimated_hours": 0.5, "reasoning": "Simple password reset FAQ.", "ai_summary": "User needs help resetting their password to regain access.", "auto_response": "To reset your password, visit the company portal and click Forgot Password. Enter your work email and follow the steps. You will receive a reset link within 5 minutes. If the issue persists, contact IT support directly."}
    elif any(w in title_lower for w in ["server", "down", "outage"]):
        return {"category": "Server", "severity": "Critical", "sentiment": "Frustrated", "resolution_path": "Assign", "assigned_department": "Engineering", "confidence_score": 95, "estimated_hours": 4, "reasoning": "Server issues require immediate DevOps attention.", "ai_summary": "A server or infrastructure outage has been reported affecting users.", "auto_response": None}
    elif any(w in title_lower for w in ["database", "db", "data corruption", "sql"]):
        return {"category": "DB", "severity": "Critical", "sentiment": "Frustrated", "resolution_path": "Assign", "assigned_department": "Engineering", "confidence_score": 92, "estimated_hours": 6, "reasoning": "DB issues require senior engineering investigation.", "ai_summary": "A database or data corruption issue has been reported.", "auto_response": None}
    elif any(w in title_lower for w in ["leave", "hr", "policy", "onboarding"]):
        return {"category": "HR", "severity": "Low", "sentiment": "Polite", "resolution_path": "Auto-resolve", "assigned_department": None, "confidence_score": 85, "estimated_hours": 1, "reasoning": "General HR FAQ can be auto-resolved.", "ai_summary": "Employee is asking about leave policy or HR-related procedures.", "auto_response": "For leave requests, log in to the HR portal and go to Leave Management. You can apply for leave, check balances, and view the company leave policy there. For onboarding questions, your HR buddy will be in touch within 24 hours."}
    elif any(w in title_lower for w in ["billing", "invoice", "payment"]):
        return {"category": "Billing", "severity": "Medium", "sentiment": "Neutral", "resolution_path": "Assign", "assigned_department": "Finance", "confidence_score": 87, "estimated_hours": 3, "reasoning": "Billing disputes need Finance team review.", "ai_summary": "User has a billing or payment related query requiring Finance review.", "auto_response": None}
    elif any(w in title_lower for w in ["access", "permission", "locked", "account"]):
        return {"category": "Access", "severity": "High", "sentiment": "Frustrated", "resolution_path": "Assign", "assigned_department": "IT", "confidence_score": 91, "estimated_hours": 2, "reasoning": "Access issues need IT intervention.", "ai_summary": "User is experiencing account access or permission issues.", "auto_response": None}
    elif any(w in title_lower for w in ["bug", "error", "crash", "broken", "not working"]):
        return {"category": "Bug", "severity": "High", "sentiment": "Frustrated", "resolution_path": "Assign", "assigned_department": "Engineering", "confidence_score": 89, "estimated_hours": 8, "reasoning": "Bugs require engineering investigation.", "ai_summary": "A software bug or functional error has been reported by the user.", "auto_response": None}
    else:
        return {"category": "Other", "severity": "Medium", "sentiment": "Neutral", "resolution_path": "Assign", "assigned_department": "IT", "confidence_score": 70, "estimated_hours": 4, "reasoning": "Unclear category, routing to IT for triage.", "ai_summary": "A general support request has been submitted and requires review.", "auto_response": None}


def suggest_assignee(department: str, category: str) -> Optional[dict]:
    conn = get_db()
    c = conn.cursor()
    c.execute("""SELECT * FROM employees WHERE department=? AND is_active=1 AND availability != 'On Leave' ORDER BY current_load ASC, avg_resolution_hours ASC""", (department,))
    rows = c.fetchall()
    conn.close()
    if not rows:
        return None
    best = None
    best_score = -1
    for emp in rows:
        skills = json.loads(emp["skill_tags"])
        score = sum(1 for s in skills if s.lower() in category.lower() or category.lower() in s.lower())
        load_penalty = emp["current_load"] * 0.5
        total = score - load_penalty
        if total > best_score:
            best_score = total
            best = emp
    if not best:
        best = rows[0]
    return dict(best)

@app.post("/api/tickets")
async def create_ticket(ticket: TicketCreate, background_tasks: BackgroundTasks):
    ai = await analyze_ticket_with_ai(ticket.title, ticket.description, ticket.submitted_by)
    conn = get_db()
    c = conn.cursor()
    assignee_id = None
    dept = ai.get("assigned_department")
    if ai["resolution_path"] == "Assign" and dept:
        emp = suggest_assignee(dept, ai["category"])
        if emp:
            assignee_id = emp["id"]
            c.execute("UPDATE employees SET current_load=current_load+1 WHERE id=?", (emp["id"],))
    status = "Auto-Resolved" if ai["resolution_path"] == "Auto-resolve" else "Assigned" if assignee_id else "New"
    c.execute("""INSERT INTO tickets (title, description, submitted_by, submitted_email, status, category, severity, sentiment, ai_summary, resolution_path, confidence_score, estimated_hours, assigned_department, assigned_employee_id, auto_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (ticket.title, ticket.description, ticket.submitted_by, ticket.submitted_email, status, ai["category"], ai["severity"], ai["sentiment"], ai["ai_summary"], ai["resolution_path"], ai["confidence_score"], ai["estimated_hours"], dept, assignee_id, ai.get("auto_response")))
    ticket_id = c.lastrowid
    c.execute("INSERT INTO ticket_events (ticket_id, event_type, description, actor) VALUES (?,?,?,?)", (ticket_id, "Created", f"Ticket created. AI classified as {ai['category']} / {ai['severity']}", "System"))
    if status == "Auto-Resolved":
        c.execute("INSERT INTO ticket_events (ticket_id, event_type, description, actor) VALUES (?,?,?,?)", (ticket_id, "Auto-Resolved", "AI auto-resolved this ticket with a response", "AI"))
    elif assignee_id:
        c.execute("SELECT name FROM employees WHERE id=?", (assignee_id,))
        row = c.fetchone()
        emp_name = row["name"] if row else "Unknown"
        c.execute("INSERT INTO ticket_events (ticket_id, event_type, description, actor) VALUES (?,?,?,?)", (ticket_id, "Assigned", f"Assigned to {emp_name} in {dept}", "AI"))
    conn.commit()
    c.execute("SELECT * FROM tickets WHERE id=?", (ticket_id,))
    t = dict(c.fetchone())
    conn.close()
    if t["assigned_employee_id"]:
        conn2 = get_db()
        emp_row = conn2.execute("SELECT * FROM employees WHERE id=?", (t["assigned_employee_id"],)).fetchone()
        conn2.close()
        t["assignee"] = dict(emp_row) if emp_row else None
    else:
        t["assignee"] = None
    return t

@app.get("/api/tickets")
def list_tickets(status: str = None, department: str = None, severity: str = None, search: str = None):
    conn = get_db()
    query = """SELECT t.*, e.name as assignee_name, e.department as assignee_dept FROM tickets t LEFT JOIN employees e ON t.assigned_employee_id=e.id WHERE 1=1"""
    params = []
    if status:
        query += " AND t.status=?"; params.append(status)
    if department:
        query += " AND t.assigned_department=?"; params.append(department)
    if severity:
        query += " AND t.severity=?"; params.append(severity)
    if search:
        query += " AND (t.title LIKE ? OR t.description LIKE ? OR t.submitted_by LIKE ?)"; params += [f"%{search}%"] * 3
    query += " ORDER BY t.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: int):
    conn = get_db()
    t = conn.execute("SELECT * FROM tickets WHERE id=?", (ticket_id,)).fetchone()
    if not t:
        raise HTTPException(404, "Ticket not found")
    t = dict(t)
    events = conn.execute("SELECT * FROM ticket_events WHERE ticket_id=? ORDER BY created_at ASC", (ticket_id,)).fetchall()
    t["events"] = [dict(e) for e in events]
    if t["assigned_employee_id"]:
        emp = conn.execute("SELECT * FROM employees WHERE id=?", (t["assigned_employee_id"],)).fetchone()
        t["assignee"] = dict(emp) if emp else None
    else:
        t["assignee"] = None
    conn.close()
    return t

@app.patch("/api/tickets/{ticket_id}")
def update_ticket(ticket_id: int, update: TicketUpdate):
    conn = get_db()
    t = conn.execute("SELECT * FROM tickets WHERE id=?", (ticket_id,)).fetchone()
    if not t:
        raise HTTPException(404, "Not found")
    fields = []
    vals = []
    if update.status:
        fields.append("status=?"); vals.append(update.status)
        if update.status == "Resolved":
            old_id = t["assigned_employee_id"]
            if old_id:
                conn.execute("UPDATE employees SET current_load=MAX(0,current_load-1) WHERE id=?", (old_id,))
    if fields:
        fields.append("updated_at=datetime('now')")
        conn.execute(f"UPDATE tickets SET {','.join(fields)} WHERE id=?", vals + [ticket_id])
    if update.note:
        conn.execute("INSERT INTO ticket_events (ticket_id, event_type, description, actor) VALUES (?,?,?,?)", (ticket_id, "Note", update.note, update.actor))
    if update.status:
        conn.execute("INSERT INTO ticket_events (ticket_id, event_type, description, actor) VALUES (?,?,?,?)", (ticket_id, "Status Change", f"Status changed to {update.status}", update.actor))
    conn.commit()
    conn.close()
    return get_ticket(ticket_id)

@app.post("/api/tickets/{ticket_id}/feedback")
def submit_feedback(ticket_id: int, fb: FeedbackModel):
    conn = get_db()
    conn.execute("UPDATE tickets SET feedback=? WHERE id=?", (1 if fb.helpful else 0, ticket_id))
    conn.execute("INSERT INTO ticket_events (ticket_id, event_type, description, actor) VALUES (?,?,?,?)", (ticket_id, "Feedback", f"User marked auto-response as {'helpful' if fb.helpful else 'not helpful'}", "User"))
    conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/api/employees")
def list_employees(department: str = None):
    conn = get_db()
    q = "SELECT * FROM employees WHERE 1=1"
    p = []
    if department:
        q += " AND department=?"; p.append(department)
    rows = conn.execute(q, p).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["skill_tags"] = json.loads(d["skill_tags"])
        result.append(d)
    return result

@app.post("/api/employees")
def create_employee(emp: EmployeeCreate):
    conn = get_db()
    try:
        conn.execute("INSERT INTO employees (name,email,department,role,skill_tags,availability) VALUES (?,?,?,?,?,?)", (emp.name, emp.email, emp.department, emp.role, json.dumps(emp.skill_tags), emp.availability))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Email already exists")
    conn.close()
    return {"ok": True}

@app.patch("/api/employees/{emp_id}")
def update_employee(emp_id: int, update: EmployeeUpdate):
    conn = get_db()
    fields, vals = [], []
    if update.name:                  fields.append("name=?");         vals.append(update.name)
    if update.role:                  fields.append("role=?");         vals.append(update.role)
    if update.skill_tags is not None:fields.append("skill_tags=?");   vals.append(json.dumps(update.skill_tags))
    if update.availability:          fields.append("availability=?"); vals.append(update.availability)
    if update.is_active is not None: fields.append("is_active=?");    vals.append(update.is_active)
    if fields:
        conn.execute(f"UPDATE employees SET {','.join(fields)} WHERE id=?", vals + [emp_id])
        conn.commit()
    conn.close()
    return {"ok": True}

@app.get("/api/analytics")
def get_analytics():
    conn = get_db()
    total         = conn.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
    open_count    = conn.execute("SELECT COUNT(*) FROM tickets WHERE status NOT IN ('Resolved','Closed','Auto-Resolved')").fetchone()[0]
    resolved      = conn.execute("SELECT COUNT(*) FROM tickets WHERE status IN ('Resolved','Closed')").fetchone()[0]
    auto_resolved = conn.execute("SELECT COUNT(*) FROM tickets WHERE status='Auto-Resolved'").fetchone()[0]
    escalated     = conn.execute("SELECT COUNT(*) FROM tickets WHERE severity IN ('Critical','High') AND status NOT IN ('Resolved','Closed')").fetchone()[0]
    helpful       = conn.execute("SELECT COUNT(*) FROM tickets WHERE status='Auto-Resolved' AND feedback=1").fetchone()[0]
    success_rate  = round((helpful / auto_resolved * 100) if auto_resolved else 0, 1)
    dept_rows = conn.execute("SELECT assigned_department, COUNT(*) as count FROM tickets WHERE assigned_department IS NOT NULL GROUP BY assigned_department").fetchall()
    week_ago  = (datetime.now() - timedelta(days=7)).isoformat()
    cat_rows  = conn.execute("SELECT category, COUNT(*) as cnt FROM tickets WHERE created_at > ? GROUP BY category ORDER BY cnt DESC LIMIT 5", (week_ago,)).fetchall()
    avg_rows  = conn.execute("SELECT e.department, AVG(e.avg_resolution_hours) as avg_h FROM employees e GROUP BY e.department").fetchall()
    sev_rows  = conn.execute("SELECT severity, COUNT(*) as cnt FROM tickets GROUP BY severity").fetchall()
    conn.close()
    return {
        "total": total, "open": open_count, "resolved": resolved,
        "auto_resolved": auto_resolved, "escalated": escalated,
        "auto_resolution_success_rate": success_rate,
        "dept_load":              [{"department": r[0], "count": r[1]} for r in dept_rows],
        "top_categories":         [{"category": r[0], "count": r[1]} for r in cat_rows],
        "avg_resolution_by_dept": [{"department": r[0], "avg_hours": round(r[1], 1)} for r in avg_rows],
        "severity_breakdown":     [{"severity": r[0], "count": r[1]} for r in sev_rows],
    }

# Serve React frontend
BASE_DIR = pathlib.Path(__file__).resolve().parent
frontend_build = BASE_DIR.parent / "frontend" / "build"

@app.get("/")
def serve_root():
    index = frontend_build / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"status": "API running - frontend build not found"}

@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    # Don't intercept API routes
    if full_path.startswith("api/"):
        raise HTTPException(404, "Not found")
    file_path = frontend_build / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    index = frontend_build / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"status": "frontend not found"}

# Mount static files if build exists
if (frontend_build / "static").exists():
    app.mount("/static", StaticFiles(directory=str(frontend_build / "static")), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
