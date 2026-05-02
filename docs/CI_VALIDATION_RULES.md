# CI Validation Rules
## Nexus LeanSync

This document defines recommended automated checks for protecting architecture and domain correctness.

---

# 1. Required CI Stages

```text
1. backend-check
2. backend-tests
3. frontend-lint
4. frontend-build
5. architecture-guard
6. documentation-guard
```

---

# 2. Backend Checks

```bash
python backend/manage.py check
python backend/manage.py test
```

Fail CI if:
- Django check fails
- any test fails
- migrations are invalid
- event immutability tests fail
- KPI tests fail

---

# 3. Frontend Checks

```bash
cd frontend
npm run lint
npm run build
```

Fail CI if:
- TypeScript build fails
- lint fails
- React contains forbidden KPI formula patterns

---

# 4. Architecture Guard

Recommended static checks:

Fail if Domain imports forbidden dependencies:

```text
django
strawberry
graphql
react
requests
http
sqlalchemy
```

Fail if files inside domain apps import from:

```text
api
config
frontend
```

Allowed direction:

```text
api → application/services → domain apps → shared
```

Forbidden direction:

```text
domain apps → api
domain apps → frontend
domain apps → GraphQL
domain apps → HTTP
```

---

# 5. KPI Guard

Search forbidden KPI implementation locations:

Fail if KPI formulas appear in:

```text
frontend/src/
backend/api/
backend/config/
```

KPI formulas are allowed only in:

```text
backend/kpi_engine/
```

Forbidden formula indicators:

```text
Availability =
Performance =
Quality =
OEE =
operating_time / planned_time
good_units / total_units
```

---

# 6. Event Guard

Fail if execution event models allow direct overwrite of historical records without correction event.

Required checks:
- append-only tests
- no update path for historical execution events
- correction event path exists
- events persisted before publish

---

# 7. Documentation Guard

Required files:

```text
README.md
docs/DOMAIN_CONSTITUTION.md
docs/DOMAIN_SPEC.md
docs/DOMAIN_HANDBOOK.md
docs/API_GUIDE.md
docs/EVENT_SOURCING_GUIDE.md
docs/KPI_ENGINE_GUIDE.md
docs/VSM_GLOSSARY.md
docs/DOMAIN_GLOSSARY.md
```

Fail if:
- required file missing
- Modelfile-architect.md missing
- docs index not updated after new doc added

---

# 8. Docs Manager Security Guard

Fail if docs_manager allows:
- arbitrary path input
- `..` traversal
- reading `.env`
- reading files outside allowed docs root
- reading non-markdown files unless explicitly whitelisted

---

# 9. Suggested GitHub Actions Skeleton

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [ main ]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.14"
      - name: Install backend deps
        run: pip install -r backend/requirements.txt
      - name: Django check
        run: python backend/manage.py check
      - name: Backend tests
        run: python backend/manage.py test

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Install frontend deps
        working-directory: frontend
        run: npm ci
      - name: Lint
        working-directory: frontend
        run: npm run lint
      - name: Build
        working-directory: frontend
        run: npm run build
```

---

# Final Rule

CI must reject architecture drift before it becomes product debt.
