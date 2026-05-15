# LEAN_SYNC_MASTER_CONTEXT.md

## Purpose
Nexus LeanSync is a Lean/VSM production plant management application.

Goal:
- manage production structure
- support Lean manufacturing workflows
- visualize VSM, flow, capacity and execution
- keep domain logic consistent across frontend, backend and AI workspaces

---

## Stack
Frontend:
- React
- Tailwind

Backend:
- Django
- GraphQL

Database:
- MySQL

Rule:
All persistent application data must be stored in MySQL.
No mock or hardcoded operational data in production flows.

---

## Core Hierarchy
Company
→ Plant
→ Production Line
→ Department
→ Resource Group
→ Resource

Rules:
- A production line belongs to one plant.
- A department belongs to one plant.
- A production line can use multiple departments.
- A department can be used by multiple production lines inside the same plant.
- A resource group belongs to one department.
- A resource belongs to one resource group.
- Relations must be enforced in backend, database and frontend.

---

## Manufacturing Scope
The system must support:
- product families
- product models
- routings
- process flow
- material flow
- WIP flow
- raw materials
- finished goods
- line-side material bins
- shared departments/resources
- scheduling and capacity planning

Resource groups represent process steps.
Materials do not belong to resource groups permanently.
Materials flow through resource groups and are transformed into WIP or finished goods.

---

## Architecture Laws
- Domain rules override UI convenience.
- Backend owns business logic.
- Frontend must not compute domain-critical KPIs.
- GraphQL resolvers must not contain business logic.
- Use domain services for rules and calculations.
- Do not bypass database constraints.
- Do not duplicate domain rules inconsistently.
- Do not mutate historical execution data.
- Do not use hidden multi-aggregate transactions.
- Audit chats validate; they do not implement.

---

## Backend Rules
- Django + GraphQL must preserve domain integrity.
- Use MySQL as source of truth.
- Enforce relationships with FK/constraints where possible.
- Keep GraphQL schema domain-driven, not page-driven.
- Mutations must validate through services/domain layer.
- Queries must expose stable domain concepts.
- No frontend-specific backend models.
- No KPI calculations in SQL, UI or GraphQL resolvers.

---

## Frontend/UI Rules
- UI must preserve domain meaning.
- No backend or domain redesign from UI chat.
- Use React + Tailwind.
- Use centralized theme/color/icon management.
- Support dark and light themes.
- Avoid unnecessary whitespace.
- Prefer one-screen fit where possible.
- Use Windows Explorer-style toolbar where applicable.
- Side menu is a shared independent component.
- Active production line selector is primary context.
- Header height: h-16.
- Footer height: h-15.
- Footer contains badges/status indicators, not header.

---

## VSM / Lean Rules
- VSM must follow Lean visual conventions.
- Show process flow and material flow clearly.
- Show information flow lines.
- Use inventory triangle symbols where applicable.
- Timeline must look like classic VSM leader/timeline.
- Process boxes must be readable.
- Arrows must have correct direction, labels and meaning.
- Do not confuse UI decoration with Lean semantics.

---

## KPI Rules
- KPIs must be traceable to domain events/data.
- KPI logic belongs in backend/domain services.
- UI can display KPI values but must not calculate critical KPI logic.
- KPI values must not be mocked in production flows.

---

## AI Workspace Rules
Use chats by responsibility:

- Nexus - General: planning, prioritization, cross-domain questions
- Nexus - Governance: laws, standards, forbidden patterns
- Nexus - Manufacturing Structure: hierarchy, routing, materials, flow
- Nexus - Frontend/UI: layout, screenshots, UX, Tailwind, components
- Nexus - Backend/GraphQL: Django, GraphQL, MySQL, services, schema
- Nexus - Architecture Audit: validation, contradictions, risks

Rule:
1 chat = 1 responsibility.

Do not mix UI, backend, governance, manufacturing structure and audits in the same chat.

---

## Split Rules
Create new specialized chats only when:
- context becomes too large
- answer quality degrades
- responsibilities conflict
- repeated explanations increase
- token waste increases

Do not split by:
- page
- component
- single bug
- temporary task

Split by:
- domain ownership
- architecture boundary
- responsibility isolation

---

## Current Priority
Current phase:
controlled scaling.

Do not over-fragment the workspace yet.

Use this active structure:
- Nexus - General
- Nexus - Governance
- Nexus - Manufacturing Structure
- Nexus - Frontend/UI
- Nexus - Backend/GraphQL
- Nexus - Architecture Audit

Future optional splits:
- Flow Routing
- VSM
- Scheduling/Capacity
- KPI Engine
- State Management
- UI Audit
- Data Audit