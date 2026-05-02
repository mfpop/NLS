# Copilot Instructions

## Build, test, and lint commands

### Frontend (`D:\02_Work\localai\lmd\frontend`)

```powershell
npm run build
npm run lint
```

No frontend test runner is configured in `package.json` yet.

### Backend (`D:\02_Work\localai\lmd\backend`)

Use the project virtualenv if present:

```powershell
.\.venv\Scripts\python.exe manage.py test
.\.venv\Scripts\python.exe manage.py test app.tests.TestCase.test_method
```

If the virtualenv is not available, use `python` instead of `.\.venv\Scripts\python.exe`.

There is no backend-specific lint command configured in the repo.

## High-level architecture

- The repo is split into a Django backend and a Vite/React frontend. The frontend currently boots Apollo Client in `frontend\src\main.tsx` and talks only to `/graphql/`.
- Vite proxies `/graphql` to `http://localhost:8000` in `frontend\vite.config.ts`, and Django exposes that endpoint with `AsyncGraphQLView` in `backend\config\urls.py`.
- GraphQL schema assembly is centralized in `backend\api\schema.py`, which composes root `Query` and `Mutation` classes from `backend\api\queries\__init__.py` and `backend\api\mutations\__init__.py`.
- The intended backend domain split comes from `Domain.md` and `Backend_Refactor_Spec.md`: keep **physical manufacturing structure** (`Plant -> Department -> ResourceGroup -> Resource`) separate from **product/process structure** (`ProductModel -> ProductVariant -> ProcessFlow -> ProcessStep`), and connect them through step/resource assignment rather than duplicating resources per product.
- Backend code is organized by bounded context/app (`manufacturing`, `process`, `execution`, `improvement`, `kpi_engine`, `shared`) and, inside each app, by layer (`models`, `selectors`, `services`). API exposure is meant to mirror those domains through `backend\api\types`, `backend\api\queries`, and `backend\api\mutations`.
- The current codebase is scaffold-heavy: many domain files and GraphQL domain modules are placeholders or partial stubs. Use the docs above as the source of truth for missing behavior, but prefer live code/config when they conflict.

## Key conventions

- Prefer the live implementation over older AI/spec docs when they disagree. The running backend is **Django + Strawberry GraphQL + PostgreSQL** (`backend\config\settings.py`, `backend\api\schema.py`), even though some older docs in the repo mention Graphene or MySQL.
- Keep the repo **GraphQL-only** unless the codebase explicitly changes direction. The only wired transport is `/graphql/`; do not add REST assumptions when extending frontend or backend flows.
- Preserve the domain boundary between **physical structure** and **process structure**. Product-specific routing should reference shared resources through assignment entities, not by cloning departments/resource groups/resources into product models.
- Follow the existing backend layering when adding behavior: domain app code belongs under its bounded context first, then gets surfaced through the matching GraphQL type/query/mutation modules.
- Frontend imports should use the `@` alias from `frontend\tsconfig.json` / `frontend\vite.config.ts`, and GraphQL client code should stay centralized under `frontend\src\graphql` rather than being scattered through components.
- For browser-level validation of the frontend, prefer the configured Playwright MCP server over ad hoc DOM reasoning when the app has runnable UI flows.
- Treat lightly populated backend files as scaffolding before extending them. Several modules exist mainly to define intended placement and naming, so inspect the current file contents carefully before assuming a model/service/query is already implemented.
