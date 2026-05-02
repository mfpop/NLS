# Architect Review Checklist
## Nexus LeanSync

Use this checklist before approving any architectural, domain, backend, API, or VSM-related change.

---

# 1. Layer Separation

| Check | Pass |
|---|---|
| UI only renders and handles interaction | [ ] |
| GraphQL resolvers delegate to Application services | [ ] |
| Application services orchestrate only | [ ] |
| Domain owns business rules and invariants | [ ] |
| Infrastructure owns persistence/adapters only | [ ] |

Reject the change if business decisions appear in UI, resolvers, SQL, or infrastructure.

---

# 2. Domain Independence

Confirm Domain does not depend on:

- [ ] Django
- [ ] GraphQL
- [ ] React
- [ ] SQL / ORM
- [ ] HTTP
- [ ] UI state
- [ ] external APIs

---

# 3. Aggregate Boundaries

- [ ] One Aggregate = One Transaction
- [ ] No hidden multi-aggregate writes
- [ ] Cross-aggregate coordination is explicit
- [ ] Domain events are used where needed
- [ ] Transaction boundaries are visible and intentional

---

# 4. Event Truth

- [ ] Execution truth is represented by immutable events
- [ ] Events are append-only
- [ ] Events are persisted before publish
- [ ] Historical corrections use compensating events
- [ ] Event order is auditable

Reject if historical rows are overwritten as “corrections.”

---

# 5. KPI Correctness

- [ ] KPI values are not stored as source of truth
- [ ] KPI outputs are recomputable from events
- [ ] KPI inputs are exposed
- [ ] KPI formulas live in Domain services/policies
- [ ] KPI calculations are not in UI, SQL views, or GraphQL resolvers

---

# 6. VSM Integrity

- [ ] ProcessNodes have upstream and downstream context
- [ ] RM exists before first process
- [ ] FG exists after last process
- [ ] WIP is represented where material waits
- [ ] FlowLink direction matches real material flow
- [ ] InformationFlow exists wherever material flow exists
- [ ] ProductionControl is present
- [ ] Timeline aligns with process flow
- [ ] LeadTime = ProcessTime + WaitingTime

---

# 7. Routing and StandardWork

- [ ] ProcessFlow is versioned
- [ ] Routing version is locked after execution starts
- [ ] StandardWork is versioned
- [ ] ProductionCycle references the active StandardWork version
- [ ] Historical KPI traceability is preserved

---

# 8. Shared Resources

- [ ] Physical resources are not duplicated per product model
- [ ] Product flows reference resources through assignments
- [ ] Shared resource analysis remains possible by product and resource
- [ ] No hidden dependency between production lines

---

# 9. Documentation Impact

Update documents when needed:

- [ ] DOMAIN_SPEC.md
- [ ] DOMAIN_HANDBOOK.md
- [ ] DOMAIN_CONSTITUTION.md
- [ ] API_GUIDE.md
- [ ] EVENT_SOURCING_GUIDE.md
- [ ] KPI_ENGINE_GUIDE.md
- [ ] DIAGRAMS.md

---

# Final Decision

- [ ] Approve
- [ ] Request changes
- [ ] Reject due to constitutional violation

Reason:

```text
Write review decision here.
```
