# Migration Notes

> Documents the structural changes made during the initial scaffold-to-implementation pass.

---

## Overview

The project started as an empty scaffold generated from a spec. This document records every structural decision made during the build-out so future contributors understand why the layout looks the way it does.

---

## Backend Changes

### Added `process/` Django app

The original scaffold was missing the `process/` app entirely. It was created with the full standard layout:
```
process/
├── apps.py (ProcessConfig)
├── models/__init__.py
├── selectors/__init__.py
├── services/__init__.py
├── migrations/__init__.py
├── validators.py
├── exceptions.py
└── constants.py
```

Registered in `INSTALLED_APPS` as `"process"`.

### Added `kpi_engine/__init__.py`

`kpi_engine/` was missing `__init__.py`, causing import failures. Added to make it a proper Python package.

### Fixed `kpi_engine/apps.py`

The file contained stray text (`ECHO is off.`) from a Windows batch file artifact, causing a `SyntaxError`. Replaced with a proper `AppConfig` subclass.

### Added `api/mutations/` layer

The original scaffold had `api/queries/` but no `api/mutations/`. Created:
```
api/mutations/
├── __init__.py          (root Mutation class, composes all domains)
├── manufacturing.py
├── process.py
├── execution.py
└── improvement.py
```

### Added `api/errors.py`, `api/permissions.py`, `api/validators.py`

Not present in the original scaffold. Added to provide API-level error, permission, and validation infrastructure:
- `errors.py` — `ApiError`, `NotFoundError`, `ValidationError`, `PermissionDeniedError`
- `permissions.py` — `require_authenticated()`, `require_role()`
- `validators.py` — `validate_non_empty_string()`

### Extended `shared/`

Added missing shared infrastructure files:
- `shared/exceptions.py` — `SharedDomainError` hierarchy
- `shared/constants.py` — Cross-domain constants (`DEFAULT_PAGE_SIZE`, status strings)
- `shared/types.py` — `Identifier: TypeAlias = int | str`

### Added per-app `validators.py`, `exceptions.py`, `constants.py`

Every domain app (`manufacturing`, `process`, `execution`, `improvement`, `kpi_engine`) received these three files. Previously absent from the scaffold.

### Added `admin.py` to all domain apps

Missing from the original scaffold for most apps. Added empty (ready for registration).

### GraphQL schema bootstrap fix

Strawberry rejected empty `Query` and `Mutation` classes. Added a `health() -> str` field to `Query` and a `ping() -> str` field to `Mutation` as anchors. All domain query/mutation classes are mixed in via inheritance.

---

## Frontend Changes

### Removed Zustand

Zustand was in `package.json` but unused. Removed. State is managed with `useReducer` only (`src/state/appStore.ts`).

### Restructured `src/` layout

Added missing directories and barrel files:
```
src/
├── config/       (env.ts, constants.ts, index.ts)
├── graphql/      (system.ts, index.ts)
├── state/        (appStore.ts, index.ts)
├── hooks/        (useDocumentTitle.ts, index.ts)
├── utils/        (format.ts, index.ts)
├── types/        (dashboard.ts, index.ts)
└── styles/       (app.css)
```

### Fixed Apollo Client v4 import

Apollo Client 4 moved `ApolloProvider` to `@apollo/client/react`. Updated `main.tsx` imports accordingly.

### Fixed TypeScript 6 `baseUrl` deprecation

Added `"ignoreDeprecations": "6.0"` to `tsconfig.json` to suppress the `baseUrl` deprecation warning from TypeScript 6.

### Created ESLint flat config

ESLint v9 no longer supports `.eslintrc`. Created `eslint.config.js` with `typescript-eslint` flat config.

### Created `vite-env.d.ts`

Added `/// <reference types="vite/client" />` and `ImportMeta.env` interface for `VITE_GRAPHQL_URL`.

### Fixed Vite proxy config

Confirmed `vite.config.ts` proxies `/graphql` → `http://localhost:8000` in dev.

---

## Tools

### Moved `structure.bat` and `structure.txt` to `tools/`

Previously at the project root. Moved to `tools/` to keep the root clean. `structure.bat` now writes output to `tools/structure.txt`.

---

## Dependency Upgrades

All packages were upgraded to latest stable versions at time of scaffold:

| Package | Version |
|---|---|
| Django | 6.0.4 |
| strawberry-graphql-django | 0.82.1 |
| psycopg2-binary | 2.9.12 |
| python-decouple | 3.8 |
| django-cors-headers | 4.9.0 |
| React | 19.2.5 |
| TypeScript | 6.0.3 |
| Vite | 8.0.10 |
| Apollo Client | 4.1.9 |
| React Router | 7.14.2 |
| ESLint | 10.3.0 |

---

## Validation Status at Completion

| Check | Result |
|---|---|
| `manage.py check` | 0 issues |
| `npm run build` | ✓ 571 modules |
| `npm run lint` | clean |
| GraphQL schema validation | passes (health + ping anchors) |
