# Agent Routing Guide

## How the Global Manager Routes Work

The Global Manager receives all incoming requests and determines:

1. **Which agent** should handle the request
2. **What workflow order** to follow
3. **What constraints** apply (Governance first? Backend before Frontend?)

## Decision Tree

```
Request → Global Manager
├── Is this a rule/naming/architecture decision?
│   └── Yes → Governance Agent
├── Does this change the data model or API?
│   └── Yes → Backend/GraphQL Agent → Frontend/UI Agent
├── Does this change the UI only?
│   └── Yes → Frontend/UI Agent
├── Is implementation complete and needs review?
│   └── Yes → Architecture Audit Agent
├── Is this ready to deploy?
│   └── Yes → Deployment Agent (after Audit approval)
└── Is this general planning/coordination?
    └── Yes → General Chat Agent
```

## Workflow Enforcement

| Scenario | Required Order |
|----------|---------------|
| New feature with data model changes | Governance → Backend → Frontend → Audit → Deploy |
| New feature without data model changes | Governance → Frontend → Audit → Deploy |
| UI-only change | Frontend → Audit → Deploy |
| Bug fix | Backend/Frontend → Audit → Deploy |
| Architecture decision | Governance only |
| Deployment | Audit → Deploy |

## Boundary Rules

| Rule | Enforcement |
|------|------------|
| Frontend must not contain business logic | Global Manager / Audit |
| Backend must not contain UI code | Global Manager / Audit |
| No duplicate models per domain | Governance / Audit |
| No hardcoded operational data | Governance / Audit |
| Tailwind only, no custom CSS | Governance / Audit |
