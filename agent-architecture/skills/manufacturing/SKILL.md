# Analyze Manufacturing Structure Skill

## Description
Analyzes the manufacturing hierarchy in a codebase by scanning Django models and Python files for domain entities. Discovers the organizational tree (Company → Plant → ProductionLine → Department → ResourceGroup → Resource) and reports all manufacturing-related model classes found.

**Skill ID:** `analyze_manufacturing_structure`
**Domain:** `manufacturing`
**Risk Level:** Medium
**Side Effects:** None

## Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project to scan |
| `params.structure_id` | `string` | No | Optional identifier for the structure tree |

## Output Format

```json
{
  "tree": {
    "id": "<structure_id or 'default'>",
    "models_found": 42
  },
  "summary": "Found 42 manufacturing-related models across 10 files",
  "hierarchy": {
    "company": "Company",
    "plant": "Plant",
    "production_lines": ["ProductionLine", ...],
    "departments": ["Department", ...],
    "resource_groups": ["ResourceGroup", ...],
    "resources": ["Resource", ...]
  },
  "manufacturing_models": [
    {
      "name": "ProductionLine",
      "file": "backend/manufacturing/models.py",
      "bases": ["Model"]
    }
  ]
}
```

### Hierarchy Mapping Rules

| Keyword in Class Name | Hierarchy Slot |
|-----------------------|---------------|
| `Company` | `hierarchy.company` |
| `Plant` | `hierarchy.plant` |
| `ProductionLine` (without `ResourceGroup`) | `hierarchy.production_lines[]` |
| `Department` | `hierarchy.departments[]` |
| `ResourceGroup` | `hierarchy.resource_groups[]` |
| `Resource` (without `ResourceGroup`) | `hierarchy.resources[]` |

### Manufacturing Keywords (used to identify relevant models)

`Company`, `Plant`, `ProductionLine`, `Department`, `ResourceGroup`, `Resource`, `ProductionLineResourceGroup`, `ProductVariant`, `MaterialItem`, `Routing`, `BOM`, `WorkInstruction`, `StandardWork`, `Procedure`, `StructureDocument`, `DocumentControl`

## Dependencies

- **Shared Types:** `shared.types` (`SkillInput`, `SkillOutput`, `SkillStatus`)
- **Shared Interfaces:** `shared.interfaces` (`Skill`)
- **Utilities:** `skills.utils.find_files`, `skills.utils.read_file`, `skills.utils.find_class_definitions`

## Example Usage

**Input:**
```
workspace_root = "/path/to/project"
params.structure_id = "plant-42"
```

**Output:**
```json
{
  "tree": { "id": "plant-42", "models_found": 12 },
  "summary": "Found 12 manufacturing-related models across 3 files",
  "hierarchy": {
    "company": "Company",
    "plant": "Plant",
    "production_lines": ["ProductionLine"],
    "departments": ["AssemblyDepartment", "PaintDepartment"],
    "resource_groups": ["ToolResourceGroup"],
    "resources": ["RobotResource"]
  },
  "manufacturing_models": [
    { "name": "Company", "file": "backend/manufacturing/models.py", "bases": ["Model"] },
    { "name": "ProductionLine", "file": "backend/manufacturing/models.py", "bases": ["Model"] }
  ]
}
```

## Error Handling

If an exception occurs during execution, the skill returns:
```json
{
  "status": "FAILED",
  "error": "<exception message>"
}
```

## Configuration

| Property | Value | Notes |
|----------|-------|-------|
| `allowed_agents` | `["2.Nexus - Manufacturing Structure"]` | Only the Manufacturing agent may invoke this skill |
| `forbidden_agents` | General Chat, Governance, Audit, Backend, Frontend agents | All other specialized agents are excluded |
| `side_effects` | `false` | Read-only; no files or state are modified |
| `risk_level` | `"medium"` | Scans the filesystem but does not modify anything |
| File limit | 20 files max | Only the first 20 model files are scanned |
