# ARCHITECTURE

## Layers

UI → Application → Domain → Infrastructure

## Responsibilities

### UI
- Rendering only

### Application
- Orchestration

### Domain
- Business logic
- Invariants
- Events

### Infrastructure
- Database
- External systems

## Document / Standard Framework
- Shared dynamic tree across Work Instructions, Standard Work, Procedures, Material Flow Standards
- **StructureDocument** owns: content, target attachment, inheritance, tree resolution
- **Document Control** owns: lifecycle, revision history, audit trail, approval/archive, controlled copy, dates, owner, change reason
- Domain services own inheritance, status, validation, versioning, approval, override, permissions
- Frontend renders resolved result only — no status/inheritance calculation
- No lifecycle/permission rules in frontend
- No duplicated tree logic per module page
- No separate Document Control tree or page

## Rule
Domain always wins
