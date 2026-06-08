# OpenCode Agent Routing

Use project-defined agents automatically when relevant.

## General / Manager Agent
Use for:
- task routing
- planning
- cross-domain coordination
- deciding which agent should handle work
- preparing handoffs
- preventing duplicated work

Must not:
- implement final code unless explicitly requested
- approve governance decisions
- perform final audit

## Governance Agent
Use for:
- architecture rules
- domain boundaries
- naming rules
- approved/rejected patterns
- application invariants

Must not:
- implement code
- audit completed work
- redesign UI

## Backend / GraphQL Agent
Use for:
- Django models
- domain services
- Strawberry GraphQL
- MySQL migrations
- backend tests
- validation/transactions/invariants

Rules:
- GraphQL resolvers stay thin
- domain services own business logic
- no business logic in resolvers
- no direct frontend DB access

## Frontend / UI Agent
Use for:
- Vite React TypeScript
- Tailwind CSS
- Apollo GraphQL
- page layout
- reusable components
- accessibility
- responsiveness
- light/dark/system themes

Rules:
- Tailwind CSS only
- no mock operational data
- no hardcoded business data
- no business rules in UI
- backend/GraphQL is source of truth

## Audit Agent
Use for:
- verifying completed work
- reviewing git diff
- checking tests
- checking architecture compliance
- evidence-based approval/rejection

Rules:
- do not invent missing evidence
- mark NOT VERIFIABLE when proof is missing
- separate blockers from minor issues

## Deployment Agent
Use for:
- build checks
- deployment preparation
- environment validation
- release checklist
- CI/CD support

Rules:
- no production deployment without explicit approval
- no secrets exposure
- no destructive commands without approval
