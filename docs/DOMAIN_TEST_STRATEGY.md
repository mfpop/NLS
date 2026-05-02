# Domain Test Strategy
## Nexus LeanSync

This document defines the test strategy required to protect domain correctness.

---

# 1. Testing Goal

Tests must prove that:

- domain invariants cannot be broken,
- events remain immutable,
- KPIs are recomputable from events,
- VSM flow integrity is preserved,
- routing and StandardWork versioning remain traceable.

---

# 2. Test Pyramid

```text
Domain Unit Tests
Application Service Tests
Repository / Infrastructure Tests
GraphQL API Tests
Frontend Integration Tests
```

Most business-critical tests must live at Domain and Application levels.

---

# 3. Domain Unit Tests

Test pure domain behavior without Django, GraphQL, DB, or UI.

Required tests:

- ProducedQty cannot exceed PlannedQty
- Routing cannot change after execution starts
- Batch cannot be silently rewritten
- Batch totals match event history
- Operator skill is validated at execution timestamp
- Equipment state belongs to closed set
- LeadTime = ProcessTime + WaitingTime

---

# 4. Event Tests

Required tests:

- BatchStarted is immutable
- BatchCompleted is immutable
- DowntimeStarted/DowntimeEnded pair correctly
- QualityRecorded does not overwrite previous quality records
- Correction events compensate instead of editing history
- Events are persisted before publish
- Event ordering is auditable

---

# 5. KPI Tests

Required tests:

- Availability = Operating Time / Planned Time
- Performance = Ideal Cycle Time × Total Units / Operating Time
- Quality = Good Units / Total Units
- OEE = Availability × Performance × Quality
- KPI values recompute from event history
- KPI cache can be deleted and rebuilt
- KPI output exposes source event references

---

# 6. VSM Tests

Required tests:

- VSM cannot render without ProductionControl
- Material flow cannot exist without information flow
- RM inventory exists before first process
- FG inventory exists after last process
- WIP exists where material waits
- FlowLink direction matches real flow
- Push/Pull/Kanban types are not interchangeable
- Timeline aligns to process sequence

---

# 7. Application Service Tests

Test orchestration without placing decisions in the Application layer.

Required tests:

- startBatch delegates invariant checks to Domain
- completeBatch emits correct event
- recordQuality appends QualityRecorded
- startDowntime appends DowntimeStarted
- endDowntime appends DowntimeEnded
- createJobOrder locks routing version correctly
- GraphQL mutation calls Application service only

---

# 8. Repository / Infrastructure Tests

Required tests:

- events are append-only in persistence
- repositories map ORM models to domain objects correctly
- path traversal is blocked in docs_manager
- `.env` and secrets are never exposed by docs_manager
- migrations preserve historical data

---

# 9. GraphQL Tests

Required tests:

- `/graphql/` is available
- queries return expected shapes
- mutations delegate correctly
- invalid commands return domain errors
- no resolver performs KPI calculation
- documentationFiles only returns whitelisted markdown files

---

# 10. Frontend Tests

Required tests:

- Documentation Center lists docs
- Markdown renders tables and code blocks
- Mermaid failure falls back safely
- VSM page preserves visible flow elements
- Active Line selector remains visible
- No KPI formula exists in React components

---

# 11. CI Minimum Test Commands

```bash
python backend/manage.py check
python backend/manage.py test
cd frontend && npm run lint
cd frontend && npm run build
```

---

# Final Rule

A test suite is valid only if it protects domain truth, not just code coverage.
