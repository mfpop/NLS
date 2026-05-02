# Pull Request Template

## Summary
Describe the change in one or two sentences.

---

## Type of Change
- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Documentation
- [ ] Architecture / domain change
- [ ] Test only

---

## Architecture Layer Touched
- [ ] UI
- [ ] Application
- [ ] Domain
- [ ] Infrastructure
- [ ] GraphQL API
- [ ] Documentation

---

## Domain Constitution Check
Before submitting, confirm:

- [ ] Domain remains framework-agnostic.
- [ ] No business logic was added to UI, GraphQL resolvers, SQL, or infrastructure.
- [ ] One Aggregate = One Transaction is respected.
- [ ] Historical execution data is not mutated.
- [ ] Corrections use events, not direct overwrites.
- [ ] KPIs are derived from immutable events only.
- [ ] VSM material flow and information flow remain valid.
- [ ] ProductionControl is preserved where VSM flow is involved.
- [ ] Routing versioning is not broken.
- [ ] StandardWork versioning is not broken.

---

## Event / KPI Impact
- [ ] No event model change
- [ ] Event model changed and documented
- [ ] KPI calculation unchanged
- [ ] KPI calculation changed and tested
- [ ] KPI traceability preserved

Notes:

```text
Explain event/KPI impact here.
```

---

## Tests
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] GraphQL tests added/updated
- [ ] Manual UI test completed
- [ ] Not applicable

Commands run:

```bash
python backend/manage.py test
python backend/manage.py check
cd frontend && npm run build
cd frontend && npm run lint
```

---

## Documentation
- [ ] README updated if onboarding/setup changed
- [ ] DOMAIN_CONSTITUTION updated if laws changed
- [ ] DOMAIN_SPEC updated if entities/services changed
- [ ] DOMAIN_HANDBOOK updated if concepts changed
- [ ] API_GUIDE updated if GraphQL changed
- [ ] EVENT_SOURCING_GUIDE updated if events changed
- [ ] KPI_ENGINE_GUIDE updated if KPI rules changed
- [ ] No documentation update needed

---

## Final Architect Confirmation
- [ ] This PR does not weaken invariants.
- [ ] This PR does not move logic outside Domain.
- [ ] This PR does not create hidden coupling.
- [ ] This PR does not hide required VSM truth.
