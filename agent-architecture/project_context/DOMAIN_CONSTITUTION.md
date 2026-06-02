# Domain Constitution

## Organizational Hierarchy

Company -> Plant -> Department -> ResourceGroup -> Resource

## Operational Production-Line Flow

Plant -> ProductionLine -> Assigned Resource Groups

## Data Model Rules

- `ProductionLineResourceGroup` is backend-only
- UI label must be "Assigned Resource Groups"
- Routing uses assigned ResourceGroups
- Capacity uses active assigned ResourceGroups
- `ProductVariant.part_number` is active finished-good part number storage
- `PartNumber` is compatibility-only
- No standalone PartNumber UI
- BOM/Routing use `productVariantId`
- `MaterialItem.part_number` is used for BOM materials/components
- Application Settings contains settings only, not manufacturing master data

## Architecture Laws

### Backend
- Clean Architecture: domain services own validation, transactions, and invariants
- GraphQL resolvers must stay thin (delegate to services)
- Domain services own business rules

### Frontend
- UI consumes GraphQL/backend state only
- No mock operational data
- No hardcoded business data
- No business rules in UI
- Frontend styling must use Tailwind CSS only

### Document Framework
- Work Instructions, Standard Work, Procedures, and Material Flow Standards share the `StructureDocument` framework
- `StructureDocument` owns content, target attachment, inheritance, and structure-tree resolution
- Document Control owns lifecycle governance, revision history, audit trail, approval/archive transitions, controlled copy state, effective/review dates, owner, and change reason
- No separate Document Control tree
- No duplicate document framework
- No frontend inheritance logic
