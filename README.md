# Nexus LeanSync

Lean Manufacturing Control Tower — a GraphQL-first system for managing factory execution, flow, and decision-making.

---

## What the system is

Nexus LeanSync integrates:

- Execution (MES)
- Flow (VSM)
- Decision (Control Tower)
- Interaction (Gemba)

It operates as:
- Execution Truth Engine
- Flow Truth Engine
- Decision Engine

---

## High-Level Architecture

UI → Application → Domain → Infrastructure

- UI: React (rendering only)
- Application: orchestration layer
- Domain: business logic + truth
- Infrastructure: database + integrations

---

## High-Level Domain Model

- Plant
- ProductionLine
- JobOrder
- Batch

Flow:
Plant → ProductionLine → JobOrder → Batch

---

## High-Level VSM Model

- ProcessNode
- InventoryNode (RM, WIP, FG)
- FlowLink (Push / Pull / Kanban)
- InformationFlow
- ProductionControl
- Timeline

---

## High-Level Event Model

- BatchStarted
- BatchCompleted
- DowntimeStarted
- DowntimeEnded
- QualityRecorded

All system behavior derives from these events.

---

## GraphQL Endpoint

```
/graphql/
```

---

## Setup

### Backend

Uses MySQL. Set your credentials in `backend/.env` before starting the backend.

```bash
python -m venv backend/.venv
backend/.venv/Scripts/activate
pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py runserver
```

Backend environment:

```env
DB_NAME=lmd
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_HOST=localhost
DB_PORT=3306
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Development Commands

```bash
python backend/manage.py test
python backend/manage.py check
cd frontend && npm run build
cd frontend && npm run lint
```
