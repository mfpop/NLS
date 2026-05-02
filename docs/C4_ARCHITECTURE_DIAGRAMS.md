# C4 ARCHITECTURE DIAGRAMS
## Nexus LeanSync — Levels 1–4

---

# Level 1 — System Context

```mermaid
C4Context
title Nexus LeanSync — System Context

Person(operator, "Operator / Team Member", "Records shop-floor execution and observations")
Person(supervisor, "Supervisor / Lean Leader", "Reviews flow, bottlenecks, KPIs, and kaizen actions")
Person(admin, "System Admin", "Configures users, roles, plants, resources, and documents")

System(nexus, "Nexus LeanSync", "Lean Manufacturing Control Tower for execution, VSM, gemba, kaizen, and KPI truth")

System_Ext(erp, "ERP / Planning System", "Customer demand, work orders, item master")
System_Ext(mes, "MES / Machine Data", "Execution signals, production cycles, equipment states")
System_Ext(identity, "Identity Provider", "Authentication and user access")
System_Ext(files, "Documentation Files", "Markdown architecture/domain documentation")

Rel(operator, nexus, "Records production, quality, downtime, gemba observations")
Rel(supervisor, nexus, "Uses Control Tower, VSM, KPI, and kaizen views")
Rel(admin, nexus, "Maintains configuration and governance docs")
Rel(nexus, erp, "Imports demand and planning data")
Rel(nexus, mes, "Consumes execution events")
Rel(nexus, identity, "Authenticates users")
Rel(nexus, files, "Reads markdown documentation")
```

---

# Level 2 — Container Diagram

```mermaid
C4Container
title Nexus LeanSync — Containers

Person(user, "User", "Operator, supervisor, admin")

System_Boundary(nexus, "Nexus LeanSync") {
  Container(frontend, "Frontend", "React + TypeScript + Vite", "UI rendering, page navigation, GraphQL client")
  Container(api, "GraphQL API", "Django + Strawberry GraphQL", "Application boundary for queries and mutations")
  Container(application, "Application Layer", "Python services", "Use-case orchestration and command handling")
  Container(domain, "Domain Layer", "Pure Python", "Aggregates, invariants, events, KPI policies, VSM rules")
  Container(infra, "Infrastructure Layer", "Django ORM / adapters", "Persistence and external integration adapters")
  ContainerDb(db, "Database", "PostgreSQL", "Operational data, events, read models")
  Container(docs, "Docs Manager", "Django service", "Reads whitelisted markdown files")
}

Rel(user, frontend, "Uses")
Rel(frontend, api, "GraphQL queries/mutations")
Rel(api, application, "Delegates use-cases")
Rel(application, domain, "Invokes domain logic")
Rel(application, infra, "Uses repositories/adapters")
Rel(infra, db, "Reads/writes")
Rel(api, docs, "Documentation queries")
```

---

# Level 3 — Component Diagram: Backend

```mermaid
C4Component
title Nexus LeanSync — Backend Components

Container_Boundary(backend, "Backend") {
  Component(api_schema, "api/schema.py", "GraphQL Schema", "Composes all queries and mutations")
  Component(api_queries, "api/queries", "GraphQL Queries", "Read access to snapshots and documentation")
  Component(api_mutations, "api/mutations", "GraphQL Mutations", "Write commands delegated to Application")
  Component(app_services, "Application Services", "Use-case orchestration", "Coordinates commands and queries")
  Component(domain_services, "Domain Services", "Pure domain logic", "KPI, VSM, routing, validation policies")
  Component(aggregates, "Aggregates", "Domain objects", "Plant, ProductionLine, JobOrder, Batch")
  Component(events, "Domain Events", "Immutable events", "BatchStarted, BatchCompleted, Downtime, Quality")
  Component(repositories, "Repositories", "Infrastructure adapters", "Persistence interface implementations")
  Component(models, "Django Models", "ORM mapping", "Database persistence representation")
  Component(docs_manager, "docs_manager", "Markdown reader", "Whitelisted documentation access")
}

Rel(api_schema, api_queries, "Includes")
Rel(api_schema, api_mutations, "Includes")
Rel(api_queries, app_services, "Calls")
Rel(api_mutations, app_services, "Calls")
Rel(app_services, domain_services, "Invokes")
Rel(domain_services, aggregates, "Uses")
Rel(domain_services, events, "Emits/reads")
Rel(app_services, repositories, "Persists/loads")
Rel(repositories, models, "Maps to ORM")
Rel(api_queries, docs_manager, "Reads documentation")
```

---

# Level 4 — Code-Level Package View

```mermaid
flowchart TD
  api[backend/api]
  manufacturing[backend/manufacturing]
  process[backend/process]
  execution[backend/execution]
  improvement[backend/improvement]
  kpi[backend/kpi_engine]
  shared[backend/shared]
  docs[backend/docs_manager]
  config[backend/config]

  api --> manufacturing
  api --> process
  api --> execution
  api --> improvement
  api --> kpi
  api --> docs

  kpi --> execution
  kpi --> process
  kpi --> manufacturing
  kpi --> shared

  execution --> process
  execution --> manufacturing
  execution --> shared

  process --> manufacturing
  process --> shared

  improvement --> execution
  improvement --> process
  improvement --> manufacturing
  improvement --> shared

  docs --> shared
  config --> api
```

---

# Enforcement Notes

- UI must never own domain logic.
- GraphQL resolvers must delegate to Application services.
- Domain logic must remain framework-agnostic.
- KPI outputs must come from immutable events.
