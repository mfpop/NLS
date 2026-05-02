# Backend Refactor Specification

> Documents the architectural decisions, layering rules, and implementation contracts for the Nexus LeanSync backend.

---

## Objective

Build a Lean Manufacturing Control Tower backend where:

- Physical factory structure is **shared** across all product models
- Each product model has its **own process flow**
- Resources are assigned to process steps through explicit assignment entities — never duplicated
- All API surface is **GraphQL only** via Strawberry

---

## 1. Core Architecture

### Two Independent Layers

**Physical Structure (static)**
```
Plant → Department → ResourceGroup → Resource
```

**Process Structure (dynamic, model-specific)**
```
ProductModel → ProductVariant → ProcessFlow (versioned) → ProcessStep
```

**Link between them**
```
ProcessStep → StepResourceAssignment → ResourceGroup / Resource
```

---

## 2. Project Layout

```
backend/
├── config/             Django settings, URLs, ASGI/WSGI
├── api/                GraphQL schema layer
│   ├── schema.py       Root schema (Query + Mutation)
│   ├── queries/        Domain query classes, composed in __init__.py
│   ├── mutations/      Domain mutation classes, composed in __init__.py
│   ├── types/          Strawberry @strawberry.type dataclasses
│   ├── errors.py       ApiError hierarchy
│   ├── permissions.py  Permission check helpers
│   └── validators.py   API-level input validators
├── manufacturing/      Physical structure bounded context
├── process/            Product routing bounded context
├── execution/          Production execution bounded context
├── improvement/        Lean improvement bounded context
├── kpi_engine/         KPI calculation bounded context
└── shared/             Cross-domain base code
    ├── models/base.py  TimeStampedModel (created_at, updated_at)
    ├── utils/          time_windows.py (get_shift_window)
    ├── exceptions.py   SharedDomainError hierarchy
    ├── constants.py    Cross-domain string constants
    └── types.py        Identifier TypeAlias (int | str)
```

---

## 3. App Layering Convention

Every domain app (`manufacturing`, `process`, `execution`, `improvement`, `kpi_engine`) follows this internal structure:

```
<app>/
├── __init__.py
├── apps.py             AppConfig subclass
├── admin.py            Django admin registrations
├── constants.py        Domain string constants
├── exceptions.py       Typed exception hierarchy
├── validators.py       Domain validation functions
├── migrations/
├── models/
│   └── __init__.py     ORM model definitions
├── selectors/
│   └── __init__.py     Read-only query functions (no business logic)
└── services/
    └── __init__.py     Write operations and business logic
```

**Rule:** Never call a `service` from a `selector`. Never bypass the service layer from the API layer. Selectors are pure reads.

---

## 4. GraphQL Layer

### Schema Composition

```python
# api/schema.py
schema = strawberry.Schema(query=Query, mutation=Mutation)

# api/queries/__init__.py  — merges all domain query classes
# api/mutations/__init__.py — merges all domain mutation classes
# api/types/__init__.py    — re-exports all domain types
```

### Domain Module Split

| Module | Location |
|---|---|
| Manufacturing queries | `api/queries/manufacturing.py` |
| Process queries | `api/queries/process.py` |
| Execution queries | `api/queries/execution.py` |
| Improvement queries | `api/queries/improvement.py` |
| KPI queries | `api/queries/kpi.py` |
| Manufacturing mutations | `api/mutations/manufacturing.py` |
| Process mutations | `api/mutations/process.py` |
| Execution mutations | `api/mutations/execution.py` |
| Improvement mutations | `api/mutations/improvement.py` |
| Manufacturing types | `api/types/manufacturing.py` |
| Process types | `api/types/process.py` |
| Execution types | `api/types/execution.py` |
| Improvement types | `api/types/improvement.py` |
| KPI types | `api/types/kpi.py` |

### Endpoint

```python
# config/urls.py
path("graphql/", AsyncGraphQLView.as_view(schema=schema))
```

**No REST endpoints exist or should be added.**

---

## 5. Error Handling

```python
# api/errors.py
class ApiError(Exception): ...
class NotFoundError(ApiError): ...
class ValidationError(ApiError): ...
class PermissionDeniedError(ApiError): ...
```

Domain apps define their own exception hierarchies extending `SharedDomainError`:

```python
# e.g. manufacturing/exceptions.py
class ManufacturingDomainError(SharedDomainError): ...
class PlantNotFoundError(ManufacturingDomainError): ...
```

---

## 6. Permissions

```python
# api/permissions.py
def require_authenticated(info: strawberry.types.Info) -> None: ...
def require_role(info, role: str) -> None: ...
```

Called at the resolver level before delegating to services.

---

## 7. Validation

Two validation tiers:

1. **API validators** (`api/validators.py`) — validate GraphQL input shapes
2. **Domain validators** (`<app>/validators.py`) — enforce domain rules before service writes

```python
# api/validators.py
def validate_non_empty_string(value: str, field_name: str) -> None: ...

# manufacturing/validators.py
def validate_plant_code(code: str) -> None: ...

# process/validators.py
def validate_step_resource_assignment(resource_group_id, resource_id) -> None: ...
```

---

## 8. Shared Infrastructure

### TimeStampedModel

All domain models inherit from `shared.models.base.TimeStampedModel`:

```python
class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

### Time Windows

```python
# shared/utils/time_windows.py
def get_shift_window(now: datetime) -> tuple[datetime, datetime]:
    """Returns (shift_start, now) where shift_start is 06:00 today."""
```

### Identifier Type

```python
# shared/types.py
from typing import TypeAlias
Identifier: TypeAlias = int | str
```

---

## 9. Settings

Key settings in `config/settings.py`:

```python
INSTALLED_APPS = [
    ...
    "shared",
    "manufacturing",
    "process",
    "execution",
    "improvement",
    "kpi_engine",
    "strawberry_django",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        ...  # configured via python-decouple
    }
}

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv())
```

---

## 10. Rules Summary

| Rule | Enforced by |
|---|---|
| GraphQL only — no REST | urls.py |
| Physical structure never duplicated per product | process validators |
| StepResourceAssignment: group or resource required | process/validators.py |
| Only one active ProcessFlow per variant | process/services.py |
| Only one active StandardWork per step | process/services.py |
| All writes go through services | convention |
| All reads go through selectors | convention |
| Domain exceptions extend SharedDomainError | exceptions.py |
| All models include created_at/updated_at | TimeStampedModel |
