# DOMAIN_SPEC
## Nexus LeanSync — Code-Level Domain Specification

**Purpose:** Define domain structures for implementation.  
**Scope:** Entities, aggregates, relationships, events, and services.  
**Excludes:** Laws, invariants, UI rules (see DOMAIN_CONSTITUTION.md).

---

# 1. AGGREGATES

## Plant (Root)
- id: UUID
- timezone: string
- calendarId: UUID

## ProductionLine
- id: UUID
- plantId: UUID
- taktTime: float
- capacity: float

## JobOrder
- id: UUID
- productModelId: UUID
- processFlowId: UUID
- plannedQty: int

## Batch
- id: UUID
- jobOrderId: UUID
- goodQty: int
- scrapQty: int
- startTime: datetime
- endTime: datetime

---

# 2. PHYSICAL STRUCTURE

## Department
- id, plantId, name

## ResourceGroup
- id, departmentId, name, capacity

## Resource
- id, resourceGroupId, name, type

## Operator
- id, name, skills

---

# 3. PROCESS STRUCTURE

## ProductModel
- id, code, name

## ProcessFlow
- id, productModelId, version, isActive

## ProcessStep
- id, processFlowId, sequence, name
- standardCycleTime, setupTime, changeoverTime

## StepResourceAssignment
- id, processStepId, resourceGroupId, resourceId
- priority, capacityFactor

---

# 4. EXECUTION

## ProductionCycle
- id, batchId, processStepId, resourceId
- operatorId, startTime, endTime
- producedQty, goodQty, scrapQty

## DowntimeEvent
- id, resourceId, startTime, endTime, reasonCode

## QualityEvent
- id, productionCycleId, defectType, quantity

---

# 5. INVENTORY

## Inventory
- id, productModelId, type (RM|WIP|FG), quantity

---

# 6. EVENTS (SCHEMA)

- BatchStarted { batchId, timestamp }
- BatchCompleted { batchId, timestamp }
- DowntimeStarted { resourceId, timestamp }
- DowntimeEnded { resourceId, timestamp }
- QualityRecorded { cycleId, quantity }

---

# 7. RELATIONSHIPS

Plant → Department → ResourceGroup → Resource  
ProductModel → ProcessFlow → ProcessStep  
ProcessStep → ResourceGroup/Resource (N:N)  
JobOrder → Batch → ProductionCycle  

---

# 8. DOMAIN SERVICES (SIGNATURES)

## KPI Service
- computeOEE(events): KPIResult
- computeLeadTime(events): float

## Flow Service
- generateVSM(processFlow, events): VSMModel

---

# 9. VALUE OBJECTS

- TimeRange { start, end }
- Quantity { value, unit }
- Identifier { id }

---

# END
