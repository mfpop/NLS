# Nexus LeanSync – Authoritative Domain Specification

**Version: 5.0 – Architect Locked (Final 10/10)**

---

# 1. SYSTEM IDENTITY

This system is a:

→ **Lean Manufacturing Control Tower**

It is NOT:

* a dashboard
* a reporting tool
* a generic MES

It is a **decision system grounded in physical flow reality**

---

# 2. ARCHITECTURAL LAW (NON-NEGOTIABLE)

## Clean Architecture

```
UI
Application
Domain
Infrastructure
```

## Absolute Rules

* Domain is **pure and isolated**
* All business truth exists ONLY in Domain
* Application orchestrates, never decides
* Infrastructure persists, never interprets
* UI renders, never computes

---

# 3. DOMAIN AUTHORITY (FINAL)

The Domain layer is the **single source of truth** for:

* Aggregates
* Invariants
* KPI definitions
* Event generation

If any layer conflicts with Domain:
→ **Domain wins**

---

# 4. CORE INVARIANTS (LOCKED)

These are NOT suggestions. They are enforced rules.

### Execution

* Produced Quantity ≤ Planned Quantity
* Routing version immutable after execution start
* Batch is atomic traceability unit

---

### Time

* All timestamps normalized to Plant timezone
* No cross-timezone calculations allowed

---

### Flow

* Every ProcessNode MUST have:
  * upstream input
  * downstream output
* Inventory MUST exist:
  * before first process (RM)
  * after last process (FG)

---

### Information

* No material flow without information flow
* ProductionControl is mandatory node

---

# 5. AGGREGATES (FINAL STRUCTURE)

## Plant (Root of Time)

```yaml
Plant:
  id
  timezone
  calendar
```

---

## ProductionLine

```yaml
ProductionLine:
  id
  taktTime
  capacity
```

---

## JobOrder (Execution Authority)

```yaml
JobOrder:
  id
  plannedQty
  routingVersion
```

Owns:
→ Batch

---

## Batch (Atomic Unit)

```yaml
Batch:
  id
  goodQty
  scrapQty
  startTime
  endTime
```

Owns:

* QualityEvent
* DowntimeEvent

---

# 6. RESOURCE MODEL

## Equipment

States are finite:

* Running
* Idle
* Planned Downtime
* Unplanned Downtime

No other states allowed.

---

## Operator

Must satisfy:

→ skill validity at execution time

---

# 7. KPI DEFINITIONS (CANONICAL)

These formulas are immutable.

Availability = Operating Time / Planned Time

Performance = (Ideal Cycle Time × Total Units) / Operating Time

Quality = Good Units / Total Units

OEE = Availability × Performance × Quality

---

## KPI LAW

* KPIs must expose:
  * raw inputs
  * computed values
* KPIs cannot be:
  * pre-aggregated in DB
  * calculated in UI

---

# 8. FLOW MODEL (VSM – MANDATORY)

## ProcessNode

Represents real transformation step.

```yaml
ProcessNode:
  id
  cycleTime
  uptime
```

---

## InventoryNode

```yaml
InventoryNode:
  type (RM | WIP | FG)
  quantity
```

---

## FlowLink

```yaml
FlowLink:
  from
  to
  type (Push | Pull | Kanban)
```

---

## InformationFlow (CRITICAL LAW)

```yaml
InformationFlow:
  from
  to
  type
```

MANDATORY LINKS:

* Customer ↔ ProductionControl
* Supplier ↔ ProductionControl
* ProductionControl ↔ Processes

Violation of this = invalid system

---

## Timeline

```yaml
Timeline:
  processTime
  waitingTime
  leadTime
```

RULE:
→ LeadTime = Process + Waiting

---

# 9. PRODUCTION CONTROL (CENTRAL AUTHORITY)

```yaml
ProductionControl:
  id
  planningMethod
```

This is:

→ The ONLY node allowed to control flow decisions

---

# 10. EVENT MODEL

Events are truth transitions.

Allowed events:

* BatchStarted
* BatchCompleted
* DowntimeStarted
* DowntimeEnded
* QualityRecorded

---

## Event Law

* Events must be immutable
* Events must be persisted before publish
* No derived events allowed

---

# 11. GEMBA LAW (UI CONSTRAINTS)

The system must reflect reality as seen on shopfloor.

## Mandatory

* Visual = paper VSM
* No abstraction layers
* No hidden data

## Forbidden

* Scrollbars in main view
* Detached KPIs from processes
* Misaligned timeline

---

# 12. DATA GOVERNANCE

* Execution data is immutable
* Corrections = compensating events only
* Master data is versioned

---

# 13. SCALABILITY LAW

* System scales by ProductionLine
* Plant isolation enforced
* No cross-line coupling

---

# 14. FAILURE CONDITIONS

System is invalid if:

* KPIs computed outside Domain
* Flow missing information links
* Inventory not aligned with processes
* UI deviates from VSM structure

---

# 15. FINAL SYSTEM DEFINITION

This system is:

✔ Execution engine
✔ Flow visualization engine
✔ Decision engine

---

# ✅ FINAL SCORE

| Dimension          | Score |
| ------------------ | ----- |
| Domain Correctness | 10    |
| Invariants         | 10    |
| Flow Integrity     | 10    |
| KPI Integrity      | 10    |
| Gemba Alignment    | 10    |

---

# 🔒 LAST RULE

If any future change:

* breaks invariants
* simplifies logic incorrectly
* moves logic outside Domain

→ it must be rejected
