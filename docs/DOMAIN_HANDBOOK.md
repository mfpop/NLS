# DOMAIN HANDBOOK
## Nexus LeanSync — Conceptual Domain Guide

**Purpose:** Explain the Nexus LeanSync domain in human language.  
**Audience:** Developers, product owners, manufacturing engineers, AI agents, and anyone who needs to understand how the factory model works before reading code.  
**Companion files:**
- `README.md` → project entry point
- `DOMAIN_CONSTITUTION.md` → non-negotiable laws
- `DOMAIN_SPEC.md` → code-level implementation reference
- `Modelfile-architect.md` → LLM enforcement layer

---

# 1. WHAT NEXUS LEANSYNC REPRESENTS

Nexus LeanSync represents a real manufacturing environment.

It is not only a dashboard. It models:

- where work happens,
- how products flow,
- which resources are used,
- what actually happened during execution,
- where material waits,
- where defects and downtime occur,
- how improvements change the standard way of working.

The system connects four operational realities:

| Area | Meaning |
|---|---|
| Execution | What happened on the shop floor |
| Flow | How material and information move |
| Decision | What the system highlights for action |
| Gemba | What people observe and improve |

The system must always stay grounded in physical flow truth.

---

# 2. HOW THE FACTORY ACTUALLY WORKS

A factory has two different structures that must not be confused:

## Physical Structure

This is the real factory organization.

Example:

```text
Plant
└── Department
    └── ResourceGroup
        └── Resource
```

This answers:

- Where is the work done?
- What departments exist?
- What machines, workstations, cells, or labor groups exist?
- Which resources are physically shared?

## Process Structure

This is how a specific product model is made.

Example:

```text
ProductModel
└── ProcessFlow
    └── ProcessStep
        └── StepResourceAssignment
```

This answers:

- How does this product flow?
- What operations are required?
- In what order?
- Which resource groups or resources can perform each step?

The physical structure is shared.  
The process structure is product-specific.

---

# 3. PLANT

A **Plant** is the highest-level manufacturing site.

It represents one factory location with its own:

- timezone,
- calendar,
- departments,
- resources,
- production execution context.

The Plant is important because time must be interpreted consistently. All execution timestamps are understood through the Plant timezone.

Example:

```text
Plant: Tijuana Factory
Timezone: America/Tijuana
Calendar: Monday–Friday, 3 shifts
```

A Plant contains Departments.

---

# 4. DEPARTMENT

A **Department** is a major functional area inside a Plant.

Examples:

- Welding Department
- Assembly Department
- Paint Department
- Test Department
- Packaging Department

A Department groups related ResourceGroups.

Example:

```text
Plant: Tijuana Factory
└── Department: Welding
    ├── ResourceGroup: Robotic Welding Cells
    └── ResourceGroup: Manual Welding Benches
```

A Department is part of the physical factory structure. It does not own product-specific routing.

---

# 5. RESOURCEGROUP

A **ResourceGroup** is a group of resources that perform similar work or belong to the same production capability.

Examples:

- Robotic Welding Cells
- Manual Welding Benches
- Assembly Line 1
- CNC Machines
- Test Benches
- Shared Labor Pool

A ResourceGroup can be used by multiple product models.

Example:

```text
ResourceGroup: Assembly Line
Resources:
- Assembly Station 01
- Assembly Station 02
```

The ResourceGroup is shared physical capacity. Product routing references it, but does not duplicate it.

---

# 6. RESOURCE

A **Resource** is a specific production asset.

Examples:

- a machine,
- a workstation,
- a robot,
- a test bench,
- a fixture,
- a tool,
- a labor pool,
- a production cell.

Example:

```text
ResourceGroup: Test Bench Group
└── Resource: Test Bench 01
```

Resources are where real execution happens.

A ProductionCycle must reference the actual Resource used, because KPI traceability depends on knowing where work really occurred.

---

# 7. PRODUCTMODEL

A **ProductModel** is the product family or model being manufactured.

Examples:

- Product Model A
- Product Model B
- Bracket Assembly
- Seat Frame
- Motor Housing

A ProductModel does not own physical resources. It owns its own process logic through ProcessFlows.

One ProductModel may have multiple versions of its process flow over time.

---

# 8. PROCESSFLOW

A **ProcessFlow** is the versioned routing for a ProductModel.

It defines how the product is made.

Example:

```text
Product Model A
└── ProcessFlow v1
    ├── Step 10: Cut
    ├── Step 20: Weld
    ├── Step 30: Assemble
    └── Step 40: Test
```

The ProcessFlow is product-specific.

Two different product models can use the same physical resources while having different flows.

Example:

```text
Product Model A:
Cut → Weld → Assemble → Test

Product Model B:
Weld → Rework → Assemble → Test
```

Both may use the same Assembly ResourceGroup, but their process logic remains separate.

---

# 9. PROCESSSTEP

A **ProcessStep** is one operation inside a ProcessFlow.

Examples:

- Cut
- Weld
- Assemble
- Inspect
- Test
- Pack
- Rework

A ProcessStep defines:

- operation sequence,
- standard cycle time,
- setup time,
- changeover time,
- labor requirement,
- expected yield,
- quality gate behavior,
- valid resources or resource groups.

Example:

```text
Step 20: Weld
Standard cycle time: 45 seconds
Assigned ResourceGroup: Robotic Welding Cells
```

A ProcessStep does not physically contain a machine. It references ResourceGroups or Resources through assignments.

---

# 10. STEPRESOURCEASSIGNMENT

A **StepResourceAssignment** connects a ProcessStep to valid ResourceGroups or Resources.

It answers:

- Where can this step be performed?
- Which resource is preferred?
- Is a specific machine required?
- Does cycle time change depending on the resource?

Example:

```text
ProcessStep: Weld
Primary ResourceGroup: Robotic Welding Cells
Backup ResourceGroup: Manual Welding Benches
```

This allows shared resources without duplicating physical structure.

---

# 11. STANDARDWORK

**StandardWork** defines the approved method for performing a ProcessStep.

It represents the current best-known way to do the work.

StandardWork may include:

- work instructions,
- expected cycle time,
- setup method,
- changeover method,
- labor quantity,
- quality checks,
- safety notes,
- approved version,
- effective dates.

Example:

```text
StandardWork v3
ProcessStep: Assembly
Cycle time: 62 seconds
Quality checks: torque check, visual check
Effective from: 2026-05-01
```

StandardWork must be versioned because methods improve over time.

When a Kaizen changes the method, a new StandardWork version should be created.

---

# 12. WORKORDER

A **WorkOrder** represents planned production demand.

It says:

- what product model to produce,
- which process flow version to use,
- how many units are planned,
- when production is due.

Example:

```text
WorkOrder: WO-10045
ProductModel: Model A
ProcessFlow: v2
Planned quantity: 500
Due date: 2026-05-10
```

A WorkOrder creates execution demand, but the actual truth comes from Batches and execution events.

---

# 13. BATCH

A **Batch** is the atomic execution unit.

It is the smallest unit of traceable production execution.

A Batch belongs to a WorkOrder and records what actually happened through events and ProductionCycles.

Example:

```text
WorkOrder: WO-10045
└── Batch: B-001
    Planned quantity: 100
    Good quantity: 96
    Scrap quantity: 4
```

A Batch must remain traceable. It should not be silently split, merged, or rewritten.

---

# 14. PRODUCTIONCYCLE

A **ProductionCycle** records actual production activity at a specific step and resource.

It answers:

- Which batch was worked on?
- Which product model was being produced?
- Which process step was executed?
- Which resource was used?
- Which operator performed the work?
- When did it start and end?
- How many units were produced?
- How many were good or scrap?

Example:

```text
ProductionCycle
Batch: B-001
ProcessStep: Weld
Resource: Robot Weld 01
Operator: OP-128
Start: 08:00
End: 08:45
Produced: 60
Good: 58
Scrap: 2
```

This is the connection between routing, real execution, resources, operators, quality, and KPI traceability.

---

# 15. DOWNTIMEEVENT

A **DowntimeEvent** records when a Resource is not available for production.

It answers:

- Which resource stopped?
- When did downtime start?
- When did it end?
- Why did it happen?
- Was it planned or unplanned?
- Which process step or production cycle was affected?

Example:

```text
DowntimeEvent
Resource: Robot Weld 01
Start: 10:12
End: 10:42
Reason: weld gun fault
Category: unplanned downtime
```

DowntimeEvents are used to calculate Availability and to identify bottlenecks or reliability issues.

---

# 16. QUALITYEVENT

A **QualityEvent** records defects, scrap, rework, or quality outcomes.

It answers:

- What defect happened?
- How many units were affected?
- Which process step created or detected it?
- Which resource was involved?
- What was the disposition?

Example:

```text
QualityEvent
ProcessStep: Weld
Resource: Robot Weld 01
Defect: porosity
Quantity: 3
Disposition: rework
```

QualityEvents support Quality KPI calculation and root cause analysis.

---

# 17. INVENTORYNODE

An **InventoryNode** represents material waiting in the flow.

Types:

- RM = Raw Material
- WIP = Work in Process
- FG = Finished Goods
- Buffer
- Quarantine

Example:

```text
InventoryNode
Type: WIP
Location: before Assembly
Quantity: 180 units
Days of inventory: 1.4
```

InventoryNodes are essential because lead time is often dominated by waiting, not processing.

---

# 18. VSM PROCESSNODE

A **VSM ProcessNode** is the VSM representation of a ProcessStep.

It is not just a database entity. It is a flow object used to visualize how the product moves.

A ProcessNode usually includes:

- process step,
- assigned resource group/resource,
- cycle time,
- uptime,
- operator quantity,
- WIP before,
- WIP after,
- quality or bottleneck indicators.

Example:

```text
ProcessNode: Weld
Cycle time: 45 sec
Uptime: 92%
Operators: 1
WIP before: 120
WIP after: 80
```

A ProcessNode must be tied to the product model’s ProcessFlow, not generated only from the physical hierarchy.

---

# 19. FLOWLINK

A **FlowLink** connects flow elements in the VSM.

It represents how material moves.

Types:

- Push
- Pull
- Kanban
- FIFO
- Supermarket

Example:

```text
Cut → Weld: Push
Weld → Assembly: Kanban
Assembly → Test: FIFO
```

FlowLinks must reflect actual material movement, not just a decorative arrow.

---

# 20. INFORMATIONFLOW

An **InformationFlow** represents how production instructions, demand signals, schedules, or kanban signals move.

Typical links:

```text
Customer ↔ ProductionControl
Supplier ↔ ProductionControl
ProductionControl ↔ ProcessSteps
```

Information flow is required because material flow does not happen by itself. It is controlled by demand, scheduling, planning, replenishment, and production instructions.

---

# 21. PRODUCTIONCONTROL

**ProductionControl** is the planning and flow-control authority.

It coordinates:

- customer demand,
- supplier communication,
- scheduling,
- production instructions,
- replenishment signals,
- kanban or pull rules.

In VSM, ProductionControl is the central information-flow element.

Without ProductionControl, the VSM is missing the system that controls how work is triggered.

---

# 22. HOW PRODUCT MODELS FLOW

A ProductModel flows through its active ProcessFlow.

Example:

```text
ProductModel A
└── Active ProcessFlow v2
    ├── Step 10: Cut
    ├── Step 20: Weld
    ├── Step 30: Assembly
    └── Step 40: Test
```

For execution:

```text
WorkOrder → Batch → ProductionCycle
```

For VSM:

```text
ProductModel → ProcessFlow → ProcessStep → VSM ProcessNode
```

For KPIs:

```text
ProductionCycle + Events → KPI Engine
```

---

# 23. HOW SHARED RESOURCES WORK

Resources belong to the physical structure only once.

Example:

```text
Assembly Station 01
```

This same resource can be used by multiple product models through different ProcessSteps.

Example:

```text
Product Model A → Assembly Step → Assembly Station 01
Product Model B → Assembly Step → Assembly Station 01
```

The system must not duplicate Assembly Station 01 per model.

Instead, ProductModels reference shared Resources through StepResourceAssignments.

This allows analysis by:

- product model,
- process step,
- resource,
- resource group,
- department,
- plant.

---

# 24. HOW ROUTING VERSIONING WORKS

A ProcessFlow is versioned because product routing changes over time.

Example:

```text
Model A - ProcessFlow v1
Cut → Weld → Assembly → Test

Model A - ProcessFlow v2
Cut → Weld → Inspection → Assembly → Test
```

When execution starts, the WorkOrder references the ProcessFlow version used.

Historical execution must remain tied to the routing version that was active at that time.

This allows correct historical KPI calculation.

A future routing change must not rewrite the past.

---

# 25. HOW STANDARDWORK VERSIONING WORKS

StandardWork is versioned because the approved method changes over time.

Example:

```text
StandardWork v1: Assembly with manual torque check
StandardWork v2: Assembly with digital torque validation
```

ProductionCycles must reference the StandardWork version active during execution.

When a Kaizen changes the method, the result should be a new StandardWork version.

This creates the improvement loop:

```text
Kaizen → StandardWork version → Execution → KPI comparison
```

---

# 26. HOW KPI TRACEABILITY WORKS

KPIs must be traceable to execution truth.

A KPI result should answer:

- Which plant?
- Which line?
- Which product model?
- Which process flow version?
- Which process step?
- Which resource?
- Which operator?
- Which batch?
- Which time range?
- Which StandardWork version?
- Which events?

Example:

```text
OEE for Model A / Weld / Robot Weld 01 / Shift 1
```

Should trace back to:

```text
BatchStarted
BatchCompleted
DowntimeStarted
DowntimeEnded
QualityRecorded
ProductionCycles
```

This means KPIs are not isolated numbers. They are explanations of what happened.

---

# 27. GEMBAWALK

A **GembaWalk** is a structured shop-floor observation.

It captures what people see at the place where work happens.

A GembaWalk may reference:

- plant,
- department,
- resource group,
- resource,
- product model,
- process step,
- observer,
- date,
- purpose,
- observations,
- actions.

Example:

```text
GembaWalk
Area: Assembly Line
Focus: WIP accumulation before Test
Observer: Team Lead
```

The purpose of Gemba is to connect system data with real-world observation.

---

# 28. KAIZEN

A **Kaizen** is an improvement action.

It usually starts from:

- a Gemba observation,
- a KPI issue,
- a quality problem,
- a downtime pattern,
- a bottleneck,
- a safety concern.

Kaizen status flow:

```text
Idea → Plan → Do → Check → Standardize → Closed
```

A Kaizen should be connected to the affected process step, resource, or product model.

When Kaizen changes the way work is done, it should update StandardWork.

---

# 29. CONTINUOUS IMPROVEMENT LOOP

The improvement loop is:

```text
Execution Events
→ KPI Engine
→ Insight
→ Gemba Observation
→ Kaizen
→ StandardWork Version
→ New Baseline
→ Updated VSM / KPI Comparison
```

This is how the system connects data, people, and improvement.

---

# 30. COMPLETE CONCEPTUAL FLOW

```text
Plant
└── Department
    └── ResourceGroup
        └── Resource

ProductModel
└── ProcessFlow version
    └── ProcessStep
        └── StepResourceAssignment
            └── ResourceGroup / Resource

WorkOrder
└── Batch
    └── ProductionCycle
        ├── DowntimeEvent
        └── QualityEvent

ProcessFlow + Execution Events
└── VSM
    ├── ProcessNodes
    ├── InventoryNodes
    ├── FlowLinks
    ├── InformationFlows
    ├── ProductionControl
    └── Timeline

Events
└── KPI Engine
    └── Control Tower / Gemba / Kaizen
```

---

# 31. FINAL HUMAN UNDERSTANDING

Nexus LeanSync works because it separates:

- physical factory structure,
- product-specific process flow,
- real execution events,
- VSM flow visualization,
- KPI traceability,
- Gemba observation,
- Kaizen improvement,
- StandardWork versioning.

The factory structure tells where work can happen.  
The product process flow tells how a product should move.  
Execution events tell what actually happened.  
The VSM shows how material and information flow.  
KPIs explain performance from traceable truth.  
Gemba validates reality.  
Kaizen changes the standard.  
StandardWork creates the new baseline.
