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
