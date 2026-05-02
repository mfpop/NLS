# Nexus LeanSync – Full Stack Domain Model

**Version: 4.0 – MES + VSM + Gemba + GraphQL (True Production 10/10)**

---

# 1. SYSTEM DEFINITION

This system is a:

→ **Lean Control Tower Platform**

Combining:

* MES (Execution)
* VSM (Flow)
* Gemba (Usability)
* GraphQL (Delivery Layer)

---

# 2. APPROVED STACK (ENFORCED)

Backend:

* Python
* Django
* MySQL (InnoDB)
* GraphQL (Graphene)

Frontend:

* TypeScript
* Apollo Client
* Tailwind CSS

Runtime:

* ASGI (Uvicorn / Daphne)

---

# 3. NON-NEGOTIABLE RULES

* GraphQL ONLY (NO REST)
* Domain logic NEVER in SQL
* ORM = persistence only
* KPIs computed in Domain layer
* Use DataLoader (N+1 protection)
* Strong typing (GraphQL → TS)

---

# 4. ARCHITECTURE

```
UI (React + Tailwind)
↓
GraphQL API (Resolvers)
↓
Application Layer (Use Cases)
↓
Domain Layer (Business Logic)
↓
Infrastructure (ORM, DB)
```

---

# 5. BOUNDED CONTEXTS

| Context     | Responsibility       |
| ----------- | -------------------- |
| Execution   | Orders, batches      |
| Resources   | Equipment, operators |
| Quality     | Defects              |
| Performance | OEE                  |
| Master Data | Product, routing     |
| Flow        | VSM                  |
| Gemba       | UI behavior          |

---

# 6. CORE DOMAIN

## Plant

```yaml
Plant:
  id
  timezone
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

## JobOrder

```yaml
JobOrder:
  id
  productId
  plannedQty
```

---

## Batch (CORE UNIT)

```yaml
Batch:
  id
  goodQty
  scrapQty
  start
  end
```

---

# 7. KPI ENGINE (DOMAIN ONLY)

Availability = Operating / Planned
Performance = (Ideal × Units) / Operating
Quality = Good / Total

OEE = A × P × Q

RULE:
→ expose raw inputs + results

---

# 8. FLOW MODEL (VSM)

## ProcessNode

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
  qty
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

## InformationFlow (MANDATORY)

```yaml
InformationFlow:
  from
  to
  type
```

REQUIRED LINKS:

* Customer ↔ ProductionControl
* Supplier ↔ ProductionControl
* ProductionControl ↔ Processes

---

## Timeline

```yaml
Timeline:
  processTime
  waitingTime
  leadTime
```

---

# 9. GEMBA RULES (UI MUST FOLLOW)

* Looks like paper VSM
* No scrollbars
* Fit on one screen
* Arrows thick + labeled
* Timeline aligned with processes
* No hidden info

---

# 10. GRAPHQL DESIGN (CRITICAL)

## Example Types

```graphql
type ProcessNode {
  id: ID!
  cycleTime: Float!
  uptime: Float!
}

type InventoryNode {
  type: String!
  quantity: Float!
}

type FlowLink {
  from: ID!
  to: ID!
  type: String!
}

type OEE {
  availability: Float!
  performance: Float!
  quality: Float!
  value: Float!
}
```

---

## Query Example

```graphql
query VSMView($lineId: ID!) {
  productionLine(id: $lineId) {
    taktTime
    processes {
      id
      cycleTime
      uptime
    }
    inventory {
      type
      quantity
    }
    flows {
      from
      to
      type
    }
    oee {
      value
    }
  }
}
```

---

# 11. RESOLVER RULES

* NO business logic
* Call Application services only
* Use DataLoader for batching

---

# 12. APPLICATION LAYER

Responsibilities:

* orchestrate use cases
* manage transactions

NO:

* KPI calculation
* domain mutation logic

---

# 13. INFRASTRUCTURE

* Django ORM
* MySQL storage
* Event Outbox pattern

RULE:
→ ORM models ≠ Domain entities

---

# 14. DATA GOVERNANCE

* Immutable execution data
* Versioned master data
* Compensating events only

---

# 15. EVENTS

* BatchCompleted
* DowntimeStarted
* QualityRecorded

---

# 16. SCALABILITY

* Multi-plant
* Horizontal scaling per line
* Feature flags

---

# 17. FINAL SYSTEM CAPABILITY

This system delivers:

✔ Real-time execution
✔ Visual flow (VSM)
✔ Gemba usability
✔ API-first architecture

---
