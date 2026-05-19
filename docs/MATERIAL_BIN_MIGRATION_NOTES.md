# Material Bin Migration Notes

## warehouse_code → Warehouse FK (Complete)

**Phase 1 (legacy):**
- `MaterialBin.warehouse_code` was a free-text `CharField(max_length=50)` used as a temporary plant-level warehouse identifier.
- Validation was minimal: only required for RM/FG bin types.

**Phase 2 (current):**
- A `Warehouse` model was created with:
  - `plant` FK (required)
  - `code` (unique per plant)
  - `name`, `warehouse_type`, `location`, `is_active`
  - Unique constraint: `(plant, code)`
- `MaterialBin.warehouse_code` was replaced with:
  - `warehouse` FK to `Warehouse`
  - `warehouse_code` remains as a **read-only property** (`self.warehouse.code if self.warehouse else ""`)
- The `clean()` method now validates warehouse plant consistency (same-plant enforcement).

**Migration path (already executed):**
1. Created `Warehouse` model and migration
2. Added `warehouse` FK to `MaterialBin`
3. Created `Warehouse` records from existing `warehouse_code` values (backfill)
4. Migrated existing `MaterialBin` rows to reference the new FK
5. Removed `warehouse_code` CharField from the model (now a property)

## Future Considerations

- The `warehouse_code` property is maintained for backward compatibility in GraphQL queries.
- When the frontend is updated to use `warehouseId` instead of `warehouseCode`, the property can be removed.
- No additional warehouse migration is needed.

## Migration Commands (for reference)

```python
# Example backfill command if run from Django shell:
from manufacturing.models import Warehouse, MaterialBin
for bin in MaterialBin.objects.filter(warehouse_id__isnull=True).exclude(warehouse_code=""):
    wh, _ = Warehouse.objects.get_or_create(
        plant=bin.plant,
        code=bin.warehouse_code,
        defaults={"name": f"Warehouse {bin.warehouse_code}"}
    )
    bin.warehouse = wh
    bin.save(update_fields=["warehouse"])
```
