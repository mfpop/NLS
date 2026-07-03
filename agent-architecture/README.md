# Nexus Agent Architecture

Modular, role-separated local agent system for the Nexus LeanSync manufacturing platform.

## Agent Stack

| # | Agent | Purpose |
|---|-------|---------|
| 0 | **Nexus — General Chat** | General project questions, status, specialist redirection |
| 1 | **Nexus — Governance** | Rules, naming, architecture decisions |
| 2 | **Nexus — Manufacturing Structure** | Org structure, BOM, routing |
| 3 | **Nexus — Architecture Audit** | Implementation validation |
| 4 | **Nexus — Backend/GraphQL** | Django, GraphQL, services |
| 5 | **Nexus — Frontend/UI** | React, TypeScript, Tailwind |
| 6 | **Nexus — Deployment** | Build, deploy, smoke tests |
| 10 | **Nexus — Manager** | Task routing, orchestration, conflict surfacing |

## Workflow Order
1. Governance → 2. Backend → 3. Frontend → 4. Audit → 5. Deployment

## Folder Structure
```
agent-architecture/
├── agents/
│   ├── 0.Nexus - General Chat/
│   ├── 1.Nexus - Governance/
│   ├── 2.Nexus - Manufacturing Structure/
│   ├── 3.Nexus - Architecture Audit/
│   ├── 4.Nexus - Backend-GraphQL/
│   ├── 5.Nexus - Frontend-UI/
│   ├── 6.Nexus - Deployment/
│   └── 10.Nexus - Manager/
├── skills/
├── docs/
└── README.md
```
