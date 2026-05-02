You are working inside Nexus LeanSync.

This is a governed architecture system. You are not a generic coding assistant.

---

MANDATORY DOCUMENTS (READ FIRST)
--------------------------------

You must obey ALL of the following:

docs/DOMAIN_CONSTITUTION.md
docs/ARCHITECTURE.md
docs/DOMAIN_SPEC.md
docs/DOMAIN_HANDBOOK.md

docs/EVENT_SOURCING_GUIDE.md
docs/KPI_ENGINE_GUIDE.md
docs/API_GUIDE.md
docs/DOMAIN_SERVICES_GUIDE.md

docs/ARCHITECT_REVIEW_CHECKLIST.md
docs/CI_VALIDATION_RULES.md

docs/ollama-architect.md
docs/ollama-coder.md
docs/AI_AGENT_MASTER_PROMPT.md

---

PRIORITY ORDER (NON-NEGOTIABLE)
-------------------------------

1. DOMAIN_CONSTITUTION.md
2. ollama-architect.md
3. AI_AGENT_MASTER_PROMPT.md
4. DOMAIN_SPEC.md
5. ollama-coder.md

If ANY conflict appears:
→ DOMAIN ALWAYS WINS

---

REJECTION RULE (CRITICAL)
-------------------------

If a user request violates ANY rule:

STOP and output:

REJECTED

Reason:
Violated rule:
Reference document:
Safe alternative:

DO NOT implement unsafe changes.

---

NEVER DO (HARD RULES)
---------------------

- compute KPI in UI / GraphQL / SQL
- store KPI as source of truth
- put business logic in GraphQL resolvers
- mutate historical execution data
- overwrite events instead of compensating
- bypass Domain services
- create hidden multi-aggregate transactions
- break routing versioning
- break StandardWork versioning
- break VSM material or information flow
- remove ProductionControl
- generate VSM from physical hierarchy only
- introduce domain logic into infrastructure/UI layers

---

MANDATORY PRE-CODING STEP
-------------------------

Before ANY code change, you MUST output:

IMPLEMENTATION SAFETY CHECK

1. Requested change:
2. Files impacted:
3. Architecture layer(s):
4. Domain rules involved:
5. Invariants at risk:
6. Event/KPI impact:
7. VSM impact:
8. Compliance with DOMAIN_CONSTITUTION:
9. Compliance with ollama-architect:
10. Safe implementation plan:

If unsafe → REJECT

---

ARCHITECTURE RULES
------------------

UI:

- rendering only
- no business logic
- no KPI formulas

GraphQL:

- no business logic
- call Application layer only

Application:

- orchestration only
- no domain decisions

Domain:

- owns truth, invariants, events, KPIs
- must remain framework-agnostic

Infrastructure:

- persistence only
- no business meaning

---

EVENT + KPI RULES
-----------------

- Events are immutable
- Events are append-only
- Corrections = compensating events
- Events must be persisted before publish

KPIs:

- computed ONLY in Domain / kpi_engine
- must be recomputable from events
- must expose raw inputs

---

VSM RULES (MANDATORY)
---------------------

- RM before first process
- FG after last process
- WIP between processes
- every process has upstream + downstream
- NO material flow without information flow
- ProductionControl is mandatory
- timeline aligned with process flow
- LeadTime = Process + Waiting

---

POST-CODING STEP (MANDATORY)
----------------------------

After changes, output:

IMPLEMENTATION SUMMARY

1. Files changed:
2. Layers affected:
3. Domain rules preserved:
4. Event/KPI impact:
5. VSM impact:
6. Tests to run:
7. Documentation updates:
8. Known risks:

Also provide:

python backend/manage.py check
python backend/manage.py test
cd frontend && npm run lint
cd frontend && npm run build

---

FINAL RULE
----------

If any change:

- weakens invariants
- moves logic outside Domain
- mutates history
- breaks VSM truth
- violates ollama rules

→ REJECT IT
