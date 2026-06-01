# Nexus LeanSync – Domain Model

> **Source of truth** for domain entities, cardinality rules, and bounded context boundaries.

---

## Core Architectural Rule

The system is divided into **two independent but connected structures**:

```
PHYSICAL STRUCTURE              PROCESS STRUCTURE
─────────────────               ─────────────────
Plant                           ProductModel
 └── Department                  └── ProcessFlow (versioned)
      └── ResourceGroup               └── ProcessStep
           └── Resource                     └── StepResourceAssignment
                                                  ├── ResourceGroup
                                                  └── Resource
```

**Physical structure is shared** across all product models. **Process structure is model-specific**. They connect only through `StepResourceAssignment`.

---

## Bounded Contexts

| App | Bounded Context | Key Entities |
|---|---|---|
| `manufacturing` | Physical factory structure | Plant, Department, ResourceGroup, Resource, Operator, OperatorQualification |
| `process` | Product routing | ProductModel, ProductVariant, ProcessFlow, ProcessStep, StepResourceAssignment, StandardWork |
| `execution` | Production events | WorkOrder, Batch, ProductionCycle, CycleStep, DowntimeEvent, QualityEvent, Inventory |
| `improvement` | Lean improvement | GembaWalk, ObservationNote, Kaizen |
| `kpi_engine` | Performance metrics | KPI snapshots, OEE, throughput, lead time |
| `shared` | Cross-domain infrastructure | TimeStampedModel, time windows, Identifier type |

---

## Manufacturing Domain

### Plant
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| code | str | Unique |
| name | str | |
| timezone | str | IANA zone |
| calendar_id | str | Shift calendar reference |
| status | str | active / inactive |

### Department
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| plant_id | FK → Plant | |
| code | str | Unique within plant |
| name | str | |
| capacity_policy | str | |
| status | str | |

### ResourceGroup
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| department_id | FK → Department | |
| code | str | Unique within dept |
| name | str | |
| resource_group_type | str | machine / bench / cell / labor_pool |
| capacity | int | |
| calendar_id | str | |
| status | str | |

### Resource
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| resource_group_id | FK → ResourceGroup | |
| code | str | Unique within group |
| name | str | |
| resource_type | str | machine / workstation / cell / bench / tool / fixture |
| status | str | |
| standard_capacity | decimal | |
| calendar_id | str | |
| mtbf | decimal | Mean time between failures |
| mttr | decimal | Mean time to repair |

### Operator
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| employee_number | str | Unique |
| name | str | |
| status | str | |
| certifications | json | |
| skills | json | |

### OperatorQualification
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| operator_id | FK → Operator | |
| resource_group_id | FK → ResourceGroup | nullable |
| resource_id | FK → Resource | nullable |
| certification_code | str | |
| valid_from | date | |
| valid_to | date | nullable |
| status | str | |

---

## Document / Standard Framework

All document-type modules (Work Instructions, Standard Work, Procedures, Material Flow Standards) share **one dynamic manufacturing structure tree**.

**Architecture split**: StructureDocument owns content, target, inheritance, tree resolution. Document Control owns lifecycle, revision history, audit trail, approval, controlled copy, dates, owner, change reason. No separate Document Control tree. No duplicate framework.

### Tree Hierarchy
```
Company
 └── Plant
      └── Production Line
           └── Department
                └── Resource Group
                     └── Resource
```

### Allowed Backend Target Types
COMPANY, PLANT, PRODUCTION_LINE, DEPARTMENT, RESOURCE_GROUP, RESOURCE

### Domain Service Ownership
- Inheritance resolution
- Status computation (has-instruction / inherited / missing)
- Validation
- Versioning
- Approval workflows
- Override management (local override of inherited instruction)
- Permission rules

### Integration Rules
- GraphQL resolvers: thin pass-through only — no inheritance/status calculation
- Frontend: display resolved selected-node result only
- No duplicated tree logic per module page
- No mock operational data after backend wiring

### Future Expansion
Material Flow Standards target expansion to MaterialBin / Warehouse / Routing / RoutingStep requires separate governance approval.

---

## Process Domain

### ProductModel
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| code | str | Unique |
| name | str | |
| family | str | |
| description | str | |
| status | str | |

### ProductVariant
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| product_model_id | FK → ProductModel | |
| code | str | |
| name | str | |
| description | str | |
| status | str | |

### ProcessFlow
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| product_variant_id | FK → ProductVariant | |
| version | str | e.g. "v1", "v2" |
| is_active | bool | One active per variant |
| description | str | |
| created_at | datetime | from TimeStampedModel |

**Rule:** Only one active ProcessFlow per ProductVariant.

### ProcessStep
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| process_flow_id | FK → ProcessFlow | |
| step_number | int | Ordering within flow |
| name | str | |
| description | str | |
| cycle_time | decimal | seconds |
| setup_time | decimal | seconds |
| changeover_time | decimal | seconds |

### StepResourceAssignment
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| process_step_id | FK → ProcessStep | |
| resource_group_id | FK → ResourceGroup | nullable |
| resource_id | FK → Resource | nullable |
| is_primary | bool | |
| notes | str | |

**Rule:** At least one of `resource_group_id` or `resource_id` must be set. If both are set, they must match hierarchically.

### StandardWork
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| process_step_id | FK → ProcessStep | |
| version | str | |
| is_active | bool | One active per step |
| takt_time | decimal | |
| cycle_time | decimal | |
| changeover_time | decimal | |

---

## Execution Domain

### WorkOrder
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| product_model_id | FK → ProductModel | |
| process_flow_id | FK → ProcessFlow | |
| quantity | int | |
| status | str | pending / in_progress / complete |
| due_date | date | |

### Batch
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| work_order_id | FK → WorkOrder | |
| batch_number | str | |
| quantity | int | |
| status | str | |

### ProductionCycle
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| batch_id | FK → Batch | |
| resource_id | FK → Resource | |
| process_step_id | FK → ProcessStep | |
| operator_id | FK → Operator | nullable |
| started_at | datetime | |
| ended_at | datetime | nullable |
| quantity_produced | int | |
| quantity_scrapped | int | |

### CycleStep
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| production_cycle_id | FK → ProductionCycle | |
| process_step_id | FK → ProcessStep | |
| resource_id | FK → Resource | |
| started_at | datetime | |
| ended_at | datetime | nullable |
| quantity | int | |

### DowntimeEvent
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| resource_id | FK → Resource | |
| started_at | datetime | |
| ended_at | datetime | nullable |
| reason_code | str | |
| description | str | |

### QualityEvent
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| production_cycle_id | FK → ProductionCycle | |
| defect_code | str | |
| quantity | int | |
| description | str | |

### Inventory
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| material_code | str | |
| inventory_type | str | RM / WIP / FG / BUFFER |
| quantity | decimal | |
| resource_group_id | FK → ResourceGroup | nullable |
| process_step_id | FK → ProcessStep | nullable |

---

## Improvement Domain

### GembaWalk
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| date | date | |
| plant_id | FK → Plant | |
| conducted_by | str | |
| status | str | |

### ObservationNote
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| gemba_walk_id | FK → GembaWalk | |
| resource_id | FK → Resource | nullable |
| process_step_id | FK → ProcessStep | nullable |
| observation | text | |
| category | str | waste / safety / quality / flow |
| priority | str | |

### Kaizen
| Field | Type | Notes |
|---|---|---|
| id | int | PK |
| title | str | |
| description | text | |
| plant_id | FK → Plant | nullable |
| resource_id | FK → Resource | nullable |
| process_step_id | FK → ProcessStep | nullable |
| gemba_walk_id | FK → GembaWalk | nullable |
| status | str | open / in_progress / closed |
| opened_at | datetime | |
| closed_at | datetime | nullable |

---

## KPI Engine Domain

KPI calculations are derived — not stored as primary records. The engine computes:

| KPI | Calculation basis |
|---|---|
| OEE | Availability × Performance × Quality |
| Throughput | ProductionCycles / time window |
| Lead time | WorkOrder.created → last CycleStep.ended |
| Downtime rate | DowntimeEvent duration / available time |
| Scrap rate | quantity_scrapped / quantity_produced |

---

## Cardinality Reference

| Relationship | Cardinality |
|---|---|
| Plant → Department | 1:N |
| Department → ResourceGroup | 1:N |
| ResourceGroup → Resource | 1:N |
| ProductModel → ProductVariant | 1:N |
| ProductVariant → ProcessFlow | 1:N |
| ProcessFlow → ProcessStep | 1:N |
| ProcessStep → StepResourceAssignment | 1:N |
| StepResourceAssignment → ResourceGroup | N:1 (nullable) |
| StepResourceAssignment → Resource | N:1 (nullable) |
| ProductModel → WorkOrder | 1:N |
| WorkOrder → Batch | 1:N |
| Batch → ProductionCycle | 1:N |
| ProductionCycle → CycleStep | 1:N |
| Operator → ProductionCycle | 1:N |
| GembaWalk → ObservationNote | 1:N |
| GembaWalk → Kaizen | 1:N |

---

## Validation Rules

| Rule | Scope |
|---|---|
| Only one active ProcessFlow per ProductVariant | process |
| Only one active StandardWork version per ProcessStep | process |
| StepResourceAssignment: resource_group OR resource required | process |
| Resource must not be duplicated per product model | manufacturing |
| Unique codes within parent scope (plant/dept/rg) | manufacturing |
| CycleStep resource must match StepResourceAssignment | execution |
