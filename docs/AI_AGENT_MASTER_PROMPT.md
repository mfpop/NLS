# AI_AGENT_MASTER_PROMPT
## Nexus LeanSync — Mandatory First Instruction (GLOBAL + OLLAMA + GRAPHQL ENFORCEMENT)

---

# 🔴 CRITICAL EXTENSION — OLLAMA AGENTS

This system uses local AI agents defined in:

```text
docs/ollama-architect.md
docs/ollama-coder.md
docs/AI_AGENT_MASTER_PROMPT.md
```

These are NOT optional.

They are:
→ **execution authority for AI agents**

You MUST obey them.

---

# 1. REQUIRED DOCUMENTS (GLOBAL + OLLAMA)

Before ANY action, you MUST read:

```text
README.md

docs/DOMAIN_CONSTITUTION.md
docs/DOMAIN_SPEC.md
docs/DOMAIN_HANDBOOK.md
docs/ARCHITECTURE.md

docs/EVENT_SOURCING_GUIDE.md
docs/KPI_ENGINE_GUIDE.md
docs/API_GUIDE.md
docs/DOMAIN_SERVICES_GUIDE.md

docs/ARCHITECT_REVIEW_CHECKLIST.md
docs/CI_VALIDATION_RULES.md

docs/ollama-architect.md
docs/ollama-coder.md
docs/AI_AGENT_MASTER_PROMPT.md
```

---

# 2. PRIORITY ORDER (IMPORTANT)

If conflicts appear:

1. DOMAIN_CONSTITUTION → highest authority  
2. ollama-architect.md → architecture enforcement  
3. AI_AGENT_MASTER_PROMPT → execution enforcement  
4. DOMAIN_SPEC → implementation truth  
5. ollama-coder.md → coding constraints  

👉 Domain ALWAYS wins

---

# 3. OLLAMA AGENT RULE

You must behave as:

→ **Architect + Coder combined**

Rules from:
- docs/ollama-architect.md
- docs/ollama-coder.md

are **binding**.

---

# 4. NON-NEGOTIABLE RULES

You must NEVER:

- violate Clean Architecture
- move logic outside Domain
- compute KPIs outside Domain
- mutate events
- break VSM rules
- remove ProductionControl
- bypass routing versioning
- store KPI as truth
- introduce hidden coupling
- model GraphQL around UI pages/components
- calculate business rules inside GraphQL resolvers
- read/write mock or hardcoded manufacturing data

---

# 5. GRAPHQL ARCHITECTURE RULES

GraphQL must expose the manufacturing domain clearly and safely.

GraphQL is NOT the Domain layer.
GraphQL is NOT the UI model.
GraphQL is NOT the KPI engine.
GraphQL is an API boundary that calls application/domain services.

## 5.1 GraphQL design objective

Optimize GraphQL for:

- domain clarity
- normalized relationships
- long-term schema evolution
- frontend stability
- backend service boundaries
- MySQL-backed data access
- low duplication
- low accidental complexity

Breaking changes are allowed during active development, but every breaking change must be intentional and documented.

---

## 5.2 Mandatory manufacturing hierarchy

The schema must respect this structure:

```text
Company
  → Plant
      → ProductionLine
          → Department
              → ResourceGroup
                  → Resource
```

Relationship rules:

- Company has many Plants.
- Plant has many ProductionLines.
- ProductionLine belongs to one Plant.
- Department may be shared by many ProductionLines.
- ResourceGroup belongs to one Department only.
- Resource belongs to one ResourceGroup only.
- Do NOT attach Resource directly to Department, ProductionLine, or Plant.
- Do NOT attach ResourceGroup directly to ProductionLine or Plant.
- Do NOT store productionLineId directly on Department.
- Use `ProductionLineDepartmentAssignment` for ProductionLine ↔ Department links.

Required structure types:

```text
Company
Plant
ProductionLine
Department
ProductionLineDepartmentAssignment
ResourceGroup
Resource
```

---

## 5.3 Required GraphQL modules

GraphQL must be organized by domain modules, not pages:

```text
1. Identity / Access
   User, Role

2. Manufacturing Structure
   Company, Plant, ProductionLine, Department,
   ProductionLineDepartmentAssignment, ResourceGroup, Resource

3. Scheduling
   Schedule, Shift, ScheduleAssignment

4. Reference Data
   ReferenceCategory, ReferenceValue, ResourceType, VisualIdentity

5. Product Routing
   ProductModel, ProcessFlow, ProcessStep

6. Domain Read Models
   ProductionStructureTree and other read-only domain summaries

7. Execution / Events
   Future extension only; do not overbuild now

8. KPI / Analytics
   Future read-only module; never calculated in UI or resolvers
```

---

## 5.4 Naming rules

Use domain-driven names.

Required naming:

- `Company`, not `ManufacturingOrganization`
- `ProductionLine`, not `Line`
- `ResourceGroup`, not `Group`
- `Resource`, not mixed `Asset`, `Machine`, `Workstation`
- `iconKey` and `colorKey`, not CSS/Tailwind/React component names
- `archiveEntity`, not `deleteEntity` for domain records
- `EntityStatus`, not loose status strings

Avoid generic or page-driven names:

```text
DashboardCard
SidebarItem
ProfileCompletionCard
ProductionStructurePanel
ControlTowerWidget
PageData
```

These belong to the frontend, not GraphQL domain schema.

---

## 5.5 Shared type rules

Main domain types should consistently expose:

```text
id
code
name
description where useful
status
createdAt
updatedAt
createdBy where useful
updatedBy where useful
```

Use reusable interfaces/patterns where supported:

```text
Node
Auditable
VisualConfigurable
```

Use this status model:

```text
ACTIVE
INACTIVE
ARCHIVED
```

Do not use free-text status fields for core entities.

---

## 5.6 Mutation rules

Use consistent mutation naming:

```text
createEntity
updateEntity
archiveEntity
```

Examples:

```text
createPlant
updatePlant
archivePlant
createProductionLine
updateProductionLine
archiveProductionLine
createDepartment
updateDepartment
archiveDepartment
assignDepartmentToProductionLine
removeDepartmentFromProductionLine
createResourceGroup
updateResourceGroup
archiveResourceGroup
createResource
updateResource
archiveResource
assignSchedule
```

Mutation payloads must follow this pattern:

```graphql
type EntityPayload {
  ok: Boolean!
  entity: Entity
  errors: [MutationError!]!
}

type MutationError {
  field: String
  code: String!
  message: String!
}
```

Input rules:

- Inputs contain only writable fields.
- Inputs must not include calculated fields.
- Inputs must not include audit fields.
- Inputs must use IDs for relationships.
- Inputs must not perform hidden nested writes unless explicitly approved.
- Validation belongs in backend/domain services, not React components.

---

## 5.7 Resolver rules

Resolvers must be thin.

Resolvers may:

- parse GraphQL arguments
- call application/domain services
- return service results
- map service errors to GraphQL errors/payloads

Resolvers must NOT:

- contain business rules
- calculate KPIs/OEE/efficiency/utilization
- decide schedule inheritance
- mutate events
- bypass domain services
- execute hidden multi-aggregate transactions
- hardcode plants, lines, departments, resources, schedules, icons, or colors

All real data must come from MySQL through Django models/repositories/services.

---

## 5.8 Schedule rules

Do NOT add these direct fields to every entity:

```text
plantScheduleId
productionLineScheduleId
departmentScheduleId
resourceGroupScheduleId
resourceScheduleId
```

Use `ScheduleAssignment`.

`ScheduleAssignment` must support:

```text
entityType
entityId
scheduleId
inheritanceMode
validFrom
validTo
```

Effective schedule must be resolved by backend domain logic.

Resolution priority:

```text
1. Resource
2. ResourceGroup
3. Department
4. ProductionLine
5. Plant
6. Company/global default
```

If resources inside a ResourceGroup have different schedules:

- do NOT fake one schedule as truth
- use resource-level schedules for execution
- use inherited schedule for defaults
- use composite availability for capacity calculations later

---

## 5.9 Department sharing rules

Departments can be shared by multiple ProductionLines.

Do NOT model:

```text
Department.productionLineId
```

Use:

```text
ProductionLineDepartmentAssignment
```

Assignment may contain:

```text
productionLineId
departmentId
sequence
status
```

`ProductionLine.departments` must resolve through assignments.
`Department.productionLines` must resolve through assignments.

---

## 5.10 Product routing rules

Keep physical structure separate from product flow.

Physical structure answers:

```text
WHERE can work happen?
```

Product routing answers:

```text
HOW does this product move through the structure?
```

Required routing types:

```text
ProductModel
ProcessFlow
ProcessStep
```

Rules:

- ProductModel defines what is produced.
- ProcessFlow defines routing for a ProductModel on a ProductionLine.
- ProcessStep connects routing to Department, ResourceGroup, or Resource.
- Do NOT put routing directly inside ProductionLine, Department, ResourceGroup, or Resource.
- Version ProcessFlow if routing can change over time.

---

## 5.11 Query rules

Queries must be domain-oriented.

Allowed examples:

```text
companies
company(id)
plants(companyId)
plant(id)
productionLines(plantId)
productionLine(id)
departments(productionLineId)
department(id)
resourceGroups(departmentId)
resourceGroup(id)
resources(resourceGroupId)
resource(id)
schedules
schedule(id)
productModels
productModel(id)
processFlows(productModelId, productionLineId)
processFlow(id)
productionStructureTree(plantId)
```

`productionStructureTree(plantId)` is allowed because it is a domain read model, not a UI component.

Avoid queries named after pages or components.

---

## 5.12 KPI and analytics rules

Do NOT expose KPI/OEE/efficiency/utilization as mutable CRUD fields.

Forbidden examples:

```text
Plant.oee
ProductionLine.efficiency
Department.utilization
ResourceGroup.performance
Resource.oee
```

KPI/analytics must be:

- calculated only by approved domain/KPI services
- exposed through read-only analytics queries
- never stored as operational truth
- never calculated by React
- never calculated directly by GraphQL resolvers
- never calculated directly by SQL views unless approved by the domain architecture

---

## 5.13 Reference and visual configuration rules

Do not hardcode reference data.

Required concepts:

```text
ReferenceCategory
ReferenceValue
ResourceType
VisualIdentity
```

Visual rules:

- business entities may expose `iconKey` and `colorKey`
- frontend theme decides final colors/icons
- do not expose Tailwind classes from domain objects
- do not expose raw SVG/React icon components from backend
- icons/colors must be configurable from reference/config tables

---

## 5.14 Performance rules

GraphQL must avoid N+1 queries.

Use:

- DataLoader where appropriate
- Django `select_related`
- Django `prefetch_related`
- bounded tree queries
- pagination for growing lists
- filtering for large datasets
- consistent ordering

Rules:

- Do not globally load all plants/lines/resources unless explicitly required.
- Tree queries must be scoped, normally by `plantId`.
- Large lists must support pagination or filters.

---

## 5.15 Breaking change policy

Breaking changes are allowed during development only when they improve domain clarity or reduce future risk.

For every breaking GraphQL change, output:

```text
Old field/type/mutation:
New field/type/mutation:
Reason:
Frontend impact:
Backend impact:
Migration impact:
Risk:
```

Do not keep bad names only for backward compatibility during active development.

---

## 5.16 Stabilization policy

Stabilize early:

```text
Company
Plant
ProductionLine
Department
ProductionLineDepartmentAssignment
ResourceGroup
Resource
Schedule
ScheduleAssignment
User
Role
EntityStatus
StructureNodeType
```

Keep flexible for now:

```text
KPI/OEE
VSM model
Control Tower summaries
Gemba Walk records
ProcessFlow versioning details
Execution events
Downtime events
Quality events
Capacity calculation
Badge/scoring logic
```

Do not overbuild future modules now.
Create safe extension points only.

---

# 6. PRE-CODING MANDATORY OUTPUT

```text
IMPLEMENTATION SAFETY CHECK

1. Requested change:
2. Files impacted:
3. Layer impacted:
4. Domain rules:
5. Invariants risk:
6. KPI impact:
7. VSM impact:
8. GraphQL schema impact:
9. Resolver/service impact:
10. MySQL/data migration impact:
11. Compliance with ollama-architect:
12. Compliance with DOMAIN_CONSTITUTION:
13. Plan:
```

---

# 7. GRAPHQL CHANGE OUTPUT REQUIRED

For any GraphQL schema/query/mutation/resolver change, provide:

```text
GRAPHQL CHANGE SUMMARY

1. Types added:
2. Types changed:
3. Types removed:
4. Queries added/changed/removed:
5. Mutations added/changed/removed:
6. Inputs added/changed/removed:
7. Resolver changes:
8. Domain service changes:
9. Frontend query/mutation updates required:
10. Breaking changes:
11. Migration/data impact:
12. Risks or unstable areas:
```

---

# 8. REJECTION RULE

If ANY violation occurs:

```text
REJECTED

Reason:
Violated rule:
Reference doc:
Safe alternative:
```

---

# 9. DOMAIN AUTHORITY LOCK

Domain owns:

- truth
- invariants
- events
- KPIs
- schedule resolution
- routing/versioning rules
- manufacturing structure rules

Everything else is secondary.

GraphQL exposes domain capabilities.
GraphQL does not own domain truth.

---

# 10. FINAL RULE

If ANY change:

- breaks invariants
- moves logic outside Domain
- contradicts ollama rules
- models UI pages as domain schema
- calculates KPIs outside Domain/KPI services
- bypasses GraphQL resolver → service → domain flow
- introduces mock/hardcoded manufacturing data

→ **REJECT IT**
