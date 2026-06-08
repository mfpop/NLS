# Backend Skills

This directory contains four skills used by the **4.Nexus - Backend-GraphQL** agent to analyze and validate the backend layer.

---

## 1. Validate Schema Skill

**Skill ID:** `validate_schema`
**Risk Level:** Medium | **Side Effects:** None

### Description
Validates GraphQL schema definitions and backend API contracts against syntactic and structural standards. Can operate in two modes: (a) scan the project for schema files, or (b) validate inline schema text passed as a parameter.

### Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project |
| `params.schema_text` | `string` | No | Inline schema text to validate. If omitted, the skill scans for `*.graphql` and `schema.py` files. |

### Validation Rules (inline mode)

| Rule | Severity | Condition |
|------|----------|-----------|
| Missing opening brace on type | Warning | `type` keyword found without `{` and not ending in `Query`/`Mutation`/`Subscription` |
| Incorrect `extend` usage | Warning | `extend` keyword not followed by `extend type` |
| Unclosed parenthesis | Error | `(` found without matching `)` on the same line |

### Output Format

```json
// File-scan mode
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "schemas_found": [{ "file": "backend/schema.graphql", "lines": 120 }],
  "summary": "Found 3 schema files in the project"
}

// Inline-validation mode
{
  "valid": false,
  "errors": ["Line 42: Unclosed parenthesis in definition"],
  "warnings": ["Line 15: Type definition may be missing opening brace"],
  "summary": "Validated 100 lines: 1 errors, 1 warnings"
}
```

### Dependencies
- `shared.types`, `shared.interfaces`
- `skills.utils.find_files`, `skills.utils.read_file`, `skills.utils.count_lines_of_code`

---

## 2. Analyze Models Skill

**Skill ID:** `analyze_models`
**Risk Level:** Medium | **Side Effects:** None

### Description
Analyzes Django models across the backend for correctness, relationship discovery, and Clean Architecture compliance. Scans `models.py` and `models/*.py` files under the `backend/` directory.

### Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project |
| `params.model_path` | `string` | No | Sub-path to search (default: `"backend"`) |

### Analysis Performed

- Class definition extraction and Django Model detection (`models.Model` in bases)
- Relationship detection: `ForeignKey`, `ManyToManyField`, `OneToOneField`
- Validation: flags files with classes that don't import `django.db.models`

### Output Format

```json
{
  "models_found": [
    { "name": "Product", "file": "backend/products/models.py", "lines": 45, "is_django_model": true }
  ],
  "relationships": [
    { "from": "Product", "type": "ForeignKey", "file": "backend/products/models.py" }
  ],
  "issues": [
    { "file": "backend/shared/models.py", "severity": "warning", "message": "File has class definitions but may not be a Django models file" }
  ],
  "stats": { "files_scanned": 5, "total_loc": 320, "model_count": 12 },
  "summary": "Scanned 5 model files, found 12 Django models, 3 relationships"
}
```

### Dependencies
- `shared.types`, `shared.interfaces`
- `skills.utils.find_files`, `skills.utils.read_file`, `skills.utils.find_class_definitions`, `skills.utils.count_lines_of_code`

---

## 3. Analyze Services Skill

**Skill ID:** `analyze_services`
**Risk Level:** Medium | **Side Effects:** None

### Description
Analyzes domain services for proper validation patterns, transaction ownership, and invariant enforcement. Scans Python files under `backend/application/`, `backend/domain/`, and `backend/services/`.

### Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project |

### Analysis Performed

- Function definition extraction and service file classification
- Validation pattern detection (functions with `"validate"` in the name)
- Transaction ownership detection (`"transaction"` or `"atomic"` in file content)
- Identification of empty service files (no function definitions)

### Output Format

```json
{
  "services_found": [
    { "file": "backend/domain/order_service.py", "functions": 4, "lines": 85 }
  ],
  "validation_patterns": [
    { "file": "backend/domain/order_service.py", "type": "validation_method" }
  ],
  "transaction_ownership": [
    { "file": "backend/domain/order_service.py", "pattern": "transaction_atomic" }
  ],
  "issues": [
    { "file": "backend/services/empty_svc.py", "severity": "info", "message": "Service file has no function definitions" }
  ],
  "stats": { "files_scanned": 12, "total_loc": 940 },
  "summary": "Scanned 12 service files, found 3 validation patterns, 2 transaction ownerships"
}
```

### Dependencies
- `shared.types`, `shared.interfaces`
- `skills.utils.find_files`, `skills.utils.read_file`, `skills.utils.find_function_definitions`, `skills.utils.count_lines_of_code`

---

## 4. Analyze GraphQL Skill

**Skill ID:** `analyze_graphql`
**Risk Level:** Medium | **Side Effects:** None

### Description
Analyzes GraphQL resolvers, mutations, and queries for thinness and proper service delegation. Scans Python files under `backend/api/` and `backend/graphql/`, plus `.graphql` files under `backend/` and `frontend/src/graphql/`.

### Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project |

### Analysis Performed

- Resolver function identification (names containing `"resolve"`, `"mutate"`, or `"query"`)
- Thinness check: files under 30 lines with resolvers are considered "thin"
- Fat/thick warning: files with resolvers at 30+ lines get a warning about delegating to services

### Output Format

```json
{
  "resolvers_found": [
    { "file": "backend/graphql/order_resolver.py", "functions": 3, "resolvers": ["resolve_order"], "lines": 28, "thin": true }
  ],
  "thinness_check": { "thin": 5, "fat": 2 },
  "delegation_patterns": [],
  "issues": [
    { "file": "backend/graphql/product_resolver.py", "severity": "warning", "message": "Resolver file has 55 lines — may be too thick" }
  ],
  "summary": "Scanned 8 GraphQL files: 5 thin, 2 may need refactoring"
}
```

### Dependencies
- `shared.types`, `shared.interfaces`
- `skills.utils.find_files`, `skills.utils.read_file`, `skills.utils.find_function_definitions`, `skills.utils.count_lines_of_code`

---

## Common Configuration

All backend skills share these agent access rules:

| Property | Value |
|----------|-------|
| `allowed_agents` | `["4.Nexus - Backend-GraphQL"]` |
| `forbidden_agents` | General Chat, Governance, Manufacturing, Audit, Frontend agents |
| `side_effects` | `false` (all are read-only) |

### Per-Skill Limits

| Skill | Max Files Scanned | Search Subdirectories |
|-------|-------------------|-----------------------|
| `validate_schema` | 20 | `backend/*.graphql`, `backend/schema.py` |
| `analyze_models` | 30 | `backend/models.py`, `backend/models/*.py` |
| `analyze_services` | 50 | `backend/application/`, `backend/domain/`, `backend/services/` |
| `analyze_graphql` | 40 (deduplicated) | `backend/api/`, `backend/graphql/`, `frontend/src/graphql/` |

## Error Handling

All four skills follow the same error contract on failure:

```json
{
  "status": "FAILED",
  "error": "<exception message>"
}
```
