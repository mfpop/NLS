# PartNumber Deprecation — Architecture Decision Record

Status: **APPROVED** — 2026-05-30

## Current Frozen State

### Data storage
```
ProductVariant.part_number (CharField, nullable) = ACTIVE storage
PartNumber table                                    = compatibility artifact only
```

### What was done

| Layer | Change |
|-------|--------|
| **Model** | `ProductVariant.part_number` added (migration 0069). `PartNumber` table/ FKs preserved for legacy. |
| **Service** | BOM/Routing `create`/`update` accept `productVariantId`. `partNumberId` optional compat-only. `ProductIdentityService.create_part_number()` writes to `ProductVariant.part_number` — never creates PartNumber rows. |
| **GraphQL** | `productVariantId` on `BomInput`, `RoutingInput`, `SaveRoutingInput`. `partNumberId` fields remain optional. |
| **Import** | `"PartNumber"` removed from `MaterialsImportHandler.entity_types`. Cannot create via import. |
| **Capacity** | `_resource_group_ids_for_scope("PRODUCTION_LINE")` uses `ProductionLineResourceGroup`. Not `ProductionLineDepartmentAssignment`. |
| **Routing** | `validate_routing()` emits `UNASSIGNED_RG` for unassigned/inactive RGs. `add_step()`/`update_step()` reject unassigned RGs. |
| **Frontend BOM** | BOM form uses `productVariantId` selector. Label: `Variant Name · Part Number`. |
| **Frontend Routing** | Routing editor uses `productVariantId` selector. Label: `Variant Name · Part Number`. |
| **Frontend Product Master** | Variant form shows Part Number as field. Detail view shows Part Number in Relations. No standalone PartNumber UI. |

### Architecture invariants

```
ProductFamily → ProductModel → ProductVariant (part_number field)
                                         ↓
                             BOM / Routing / ProcessFlow
                             (use productVariantId)
```

- Part Number is a field on ProductVariant, not a hierarchy level
- `partNumberId` is compatibility-only for existing legacy records
- No code path creates standalone PartNumber rows
- No standalone PartNumber UI exists anywhere

### Tests

```
78 tests — all passing
├── 18  test_product_identity          (variant part_number + compatibility)
├── 3   test_graphql_mutations         (delegation patterns)
├── 20  test_routing_service_bom        (productVariantId path)
└── 37  test_pl_rg_assignment           (service + GraphQL + routing + capacity + backfill)
```

### Remaining cleanup (backend-only — do not execute until dedicated task)

1. Drop indexes: `mfg_bom_part_status_idx`, `mfg_route_line_part_stat_idx`
2. Remove GraphQL compat: `PartNumberNode`, `PartNumberInput`, `PartNumberPayload`, queries, mutations
3. Remove FK/model with data migration: `PartNumber` table, `ProcessFlow.part_number`, `Routing.part_number`, `BOM.part_number`
