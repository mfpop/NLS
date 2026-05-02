# FOLDER NAMING CONVENTION GUIDE
## Nexus LeanSync

---

# Purpose

Keep the project structure predictable, scalable, and aligned with Clean Architecture.

---

# General Rules

- Use lowercase folder names.
- Use snake_case for Python packages.
- Use PascalCase for React components.
- Use kebab-case only for generated/static assets if needed.
- Do not mix domain concepts and UI concepts in the same folder.
- Avoid vague names such as `helpers`, `misc`, `stuff`, `common2`.

---

# Backend Naming

Recommended backend root:

```text
backend/
├── config/
├── api/
├── manufacturing/
├── process/
├── execution/
├── improvement/
├── kpi_engine/
├── docs_manager/
└── shared/
```

---

# Bounded Context Folder Pattern

Each domain app should use:

```text
app_name/
├── models/
├── selectors/
├── services/
├── repositories/
├── validators.py
├── exceptions.py
├── constants.py
├── types.py
└── tests/
```

| Folder/File | Purpose |
|---|---|
| `models/` | ORM persistence representation |
| `selectors/` | read/query functions |
| `services/` | application/domain coordination |
| `repositories/` | persistence abstraction/adapters |
| `validators.py` | input and domain validation helpers |
| `exceptions.py` | domain-specific exceptions |
| `constants.py` | stable constants/enums |
| `types.py` | DTOs/value objects where appropriate |
| `tests/` | unit and integration tests |

---

# API Folder Pattern

```text
api/
├── schema.py
├── queries/
├── mutations/
├── types/
├── permissions.py
├── validators.py
└── errors.py
```

Rules:
- Queries are read-only.
- Mutations delegate to Application services.
- No domain decisions in GraphQL resolvers.

---

# Frontend Naming

Recommended frontend root:

```text
frontend/src/
├── components/
├── pages/
├── routes/
├── graphql/
├── hooks/
├── services/
├── state/
├── styles/
├── types/
└── utils/
```

---

# Page Folder Pattern

```text
pages/PageName/
├── PageName.tsx
├── components/
├── hooks/
├── types.ts
└── constants.ts
```

Example:

```text
pages/DocumentationCenter/
├── DocumentationCenter.tsx
├── DocumentLibrary.tsx
├── MarkdownReader.tsx
├── DocumentInspector.tsx
├── documentationMeta.ts
└── documentationTypes.ts
```

---

# Documentation Naming

Use uppercase names for root governance docs:

```text
README.md
DOMAIN_CONSTITUTION.md
DOMAIN_SPEC.md
DOMAIN_HANDBOOK.md
ARCHITECTURE.md
CONTRIBUTING.md
API_GUIDE.md
KPI_ENGINE_GUIDE.md
EVENT_SOURCING_GUIDE.md
```

Use `docs/` for grouped documentation only if the root becomes too crowded.

Recommended:

```text
docs/
├── INDEX.md
├── diagrams/
├── guides/
├── references/
└── governance/
```

---

# Avoid

Do not use:

```text
backend/app/
backend/core/
backend/common/
frontend/pages/NewPage2/
frontend/components/Everything/
docs/random/
```

Unless the folder has a clear, stable responsibility.

---

# Final Rule

A folder name must answer:

```text
What responsibility lives here?
```

If the answer is not obvious, rename it.
