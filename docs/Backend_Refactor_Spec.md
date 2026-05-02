# Backend Refactor Specification

> **Status:** Original refactor spec. For the implemented architecture and layering rules, see [`backend/docs/Backend_Refactor_Spec.md`](backend/docs/Backend_Refactor_Spec.md). For structural changes made during implementation, see [`backend/docs/MIGRATION_NOTES.md`](backend/docs/MIGRATION_NOTES.md).

## OBJECTIVE

Refactor the backend domain model to support a real manufacturing structure where:

* Physical structure is shared across products
* Each product has its own process flow
* Resources are shared between multiple product models

⚠️ Frontend MUST remain unchanged (UI, layout, routes, components).

---

## 1. CORE ARCHITECTURE PRINCIPLE

### Separate TWO independent layers:

### A) PHYSICAL STRUCTURE (STATIC)

```
Plant → Department → ResourceGroup → Resource
```

### B) PRODUCT PROCESS STRUCTURE (DYNAMIC)

```
ProductModel → ProductVariant → ProcessFlow → ProcessStep
```

### LINK BETWEEN THEM

```
ProcessStep → StepResourceAssignment → ResourceGroup / Resource
```

---

## 2. MANUFACTURING DOMAIN

### Models

* Plant
* Department
* ResourceGroup
* Resource
* Operator
* OperatorQualification

### Rules

* Strict hierarchy: Plant → Department → ResourceGroup → Resource
* Resources are NEVER duplicated per product
* Unique constraints must be enforced

---

## 3. PROCESS DOMAIN

### Models

* ProductModel
* ProductVariant
* ProcessFlow (versioned)
* ProcessStep (ordered)
* StepResourceAssignment (N:N mapping)
* StandardWork (versioned)

### Critical Rules

* ProcessFlow must NOT use ManyToMany with ProcessStep
* ProcessStep belongs to exactly one ProcessFlow
* One ProductVariant can have multiple versions of ProcessFlow
* Only ONE active ProcessFlow per ProductVariant

---

## 4. RESOURCE ASSIGNMENT MODEL

### StepResourceAssignment

Supports:

* Multiple resources per step
* Multiple resource groups per step
* Fallback and alternative routing

### Constraints

* At least one of resource_group or resource must exist
* If both provided, they must match

---

## 5. EXECUTION DOMAIN

### Models

* WorkOrder
* Batch
* ProductionCycle
* CycleStep
* DowntimeEvent
* QualityEvent
* Inventory

### Rules

* Execution must capture REAL production events
* Each CycleStep must include:
  * ProcessStep
    n - Resource used
  * Time
  * Quantity
* Remove abstract ManyToMany execution logic

---

## 6. INVENTORY MODEL

Inventory must support:

* RM (Raw Material)
* WIP (Work in Progress)
* FG (Finished Goods)
* BUFFER

Must be linkable to:

* ProcessStep
* ResourceGroup
* Resource

---

## 7. STANDARD WORK

StandardWork must be:

* Versioned
* Time-based (cycle, changeover, takt)
* Linked to ProcessStep

Only ONE active version per step

---

## 8. VSM REQUIREMENTS

System must support VSM generation per ProductVariant.

### Required data:

* Ordered ProcessSteps
* Cycle time
* Waiting time
* Uptime
* Resource assignment
* Inventory positions

### Calculations:

* Process Time
* Waiting Time
* Lead Time
* Bottleneck detection

---

## 9. IMPROVEMENT DOMAIN

### Models

* GembaWalk
* ObservationNote
* Kaizen

### Rules

Must support linking to:

* Physical structure (plant/resource)
* Process structure (product/step)

---

## 10. VALIDATION RULES

### StepResourceAssignment

* resource_group OR resource required
* If both exist → must match

### ProcessFlow

* Only one active flow per ProductVariant

### StandardWork

* Only one active version per step

### CycleStep

* Resource must be valid for ProcessStep

---

## 11. MIGRATION STRATEGY

* Do NOT delete existing data blindly
* Map old entities carefully:

| Old            | New                          |
| -------------- | ---------------------------- |
| ProductionArea | Department                   |
| ProductionLine | ProcessFlow or ResourceGroup |
| WorkStation    | Resource OR ProcessStep      |

---

## 12. API / GRAPHQL

Must support:

* Physical structure queries
* Product structure queries
* Process flows
* VSM generation

Maintain backward compatibility.

---

## 13. ADMIN CONFIGURATION

* Register all models
* Add filters, search, list display
* Use inline editing for hierarchy

---

## 14. FINAL ACCEPTANCE CRITERIA

System is valid ONLY if:

1. Resources are shared across products
2. Each product has independent process flow
3. Execution records real resource usage
4. VSM can be generated per product
5. Bottleneck is dynamically calculated
6. Standard work is versioned
7. No duplication of physical structure

---

## 15. DO NOT DO

* Do NOT duplicate departments/resources per product
* Do NOT mix process logic into physical structure
* Do NOT hardcode VSM
* Do NOT store KPIs statically
* Do NOT break frontend

---

## 16. COMMANDS

```
python manage.py makemigrations
python manage.py migrate
python manage.py check
python manage.py test
```

---

## FINAL NOTE

This architecture ensures:

* True multi-product manufacturing support
* Accurate VSM generation
* Scalable MES + Lean system
* Alignment with real Gemba operations
