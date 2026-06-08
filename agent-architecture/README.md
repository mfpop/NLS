# Nexus Agent Architecture

Modular, role-separated local agent system for the Nexus LeanSync manufacturing platform.

## Agent Stack

| # | Agent | Purpose |
|---|-------|---------|
| 0 | **Nexus — Global Manager** | Top-level orchestration & routing |
| 1 | **Nexus — General Chat** | Project planning & coordination |
| 2 | **Nexus — Governance** | Rules, naming, architecture decisions |
| 3 | **Nexus — Manufacturing Structure** | Org structure, BOM, routing |
| 4 | **Nexus — Architecture Audit** | Implementation validation |
| 5 | **Nexus — Backend/GraphQL** | Django, GraphQL, services |
| 6 | **Nexus — Frontend/UI** | React, TypeScript, Tailwind |
| 7 | **Nexus — Deployment** | Build, deploy, smoke tests |

## Workflow Order
1. Governance → 2. Backend → 3. Frontend → 4. Audit → 5. Deployment

## Folder Structure
```
agent-architecture/
├── agents/
│   ├── 0.Nexus - Global Manager/
│   ├── 1.Nexus - General Chat/
│   ├── 2.Nexus - Governance/
│   ├── 3.Nexus - Manufacturing Structure/
│   ├── 4.Nexus - Architecture Audit/
│   ├── 5.Nexus - Backend-GraphQL/
│   ├── 6.Nexus - Frontend-UI/
│   └── 7.Nexus - Deployment/
├── skills/
├── docs/
└── README.md
```
