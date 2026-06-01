# DOMAIN CONSTITUTION
## Nexus LeanSync — Lean Manufacturing Control Tower

**Version: FINAL — Architect-Enforced**

---

# PURPOSE

System grounded in **physical flow truth** integrating:
Execution · Flow · Decision · Gemba

---

# ABSOLUTE LAWS

1. Domain Independence → no framework dependency  
2. One Aggregate = One Transaction  
3. Truth = Immutable Events  
4. No Historical Mutation  
5. Correctness First  

---

# DOMAIN AUTHORITY

Domain owns:
- Aggregates
- Invariants
- Events
- KPI formulas
- Flow rules

---

# INVARIANTS

## Execution
- ProducedQty ≤ PlannedQty
- Routing immutable
- Batch atomic

## Time
- Single Plant timezone

## Flow
- RM → Process → WIP → Process → FG

## Information
- No material flow without information flow
- ProductionControl mandatory

## Document / Standard Framework
- Work Instructions, Standard Work, Procedures, Material Flow Standards: **one shared dynamic manufacturing structure tree**
- Tree: Company → Plant → Production Line → Department → Resource Group → Resource
- Allowed backend target types: COMPANY, PLANT, PRODUCTION_LINE, DEPARTMENT, RESOURCE_GROUP, RESOURCE

### StructureDocument (shared framework)
Owns:
- Document content (title, code, content, revision)
- Target attachment (target_type + target_id)
- Inheritance resolution (Local / Inherited / Missing)
- Structure-tree resolution (document per selected node)

### Document Control (lifecycle governance)
Owns:
- Lifecycle metadata (review date, change reason, controlled copy)
- Revision history (append-only snapshots)
- Audit trail (append-only action log)
- Approval/archive transitions (DRAFT → APPROVED → ARCHIVED)
- Controlled copy state
- Effective/review dates
- Owner and change reason

### Architecture rules
- **No separate Document Control tree**
- **No duplicate document framework**
- **No separate model per document type** — single `StructureDocument` model
- Domain services own: inheritance, status, lifecycle, validation, versioning, approval, override, permission rules
- GraphQL resolvers: thin — no inheritance/status/lifecycle logic
- Frontend: display resolved result only — must not calculate inheritance, status, or lifecycle
- No duplicated tree logic per page
- No frontend lifecycle/permission rules
- Material Flow Standards target expansion to MaterialBin/Warehouse/Routing/RoutingStep requires separate governance approval

---

# AGGREGATES

Plant → ProductionLine → JobOrder → Batch

---

# EVENTS

- BatchStarted
- BatchCompleted
- DowntimeStarted
- DowntimeEnded
- QualityRecorded

Rules:
- Immutable
- Auditable
- Persist before publish

---

# KPIs

Derived only from events:
Availability, Performance, Quality, OEE

Never stored. Never computed outside Domain.

---

# VSM

Must include:
- ProcessNodes
- InventoryNodes
- FlowLinks
- InformationFlow
- ProductionControl

Rule:
LeadTime = Process + Waiting

---

# FAILURE CONDITIONS

System invalid if:
- KPI outside Domain
- Event mutation
- Missing information flow
- Broken VSM
- Domain depends on framework

---

# FINAL LAW

If any change weakens invariants or moves logic outside Domain:

→ REJECT IT
