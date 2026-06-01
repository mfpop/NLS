# DOMAIN SERVICES GUIDE

## Purpose
Encapsulate business logic inside Domain.

## Rules
- Stateless
- Pure logic
- No framework dependency

## Examples

### KPI Service
computeOEE(events)

### Flow Service
generateVSM(flow, events)

### Document / Standard Framework Service
- **StructureDocumentService** owns: inheritance resolution, status computation (has-instruction / inherited / missing), validation, target resolution, tree building
- **StructureDocumentControlService** owns: lifecycle governance, revision history, audit trail, approval/archive transitions, controlled copy state, effective/review dates, owner, change reason
- Uses shared dynamic manufacturing structure tree (Company → Plant → Production Line → Department → Resource Group → Resource)
- GraphQL resolvers remain thin pass-through
- StructureDocumentControlService does NOT duplicate target validation, inheritance resolution, or tree logic — it delegates to StructureDocumentService where needed

## Anti-patterns
- Logic in controllers
- Logic in GraphQL resolvers
- Logic in models (ORM heavy)
- Duplicated tree logic per document module page
- Frontend calculating inheritance or status
