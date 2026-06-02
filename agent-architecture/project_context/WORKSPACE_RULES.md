# Workspace Rules

## File Organization

- `project_context/` — Permanent source of truth documentation
- `agents/` — Agent definitions (agent.yaml per agent)
- `skills/` — Domain-organized skill implementations
- `config/` — System configuration files
- `memory/` — Runtime memory storage
- `execution/` — Orchestration and routing
- `shared/` — Shared types, interfaces, constants
- `tests/` — Test suite

## Agent Interaction Rules

1. Agents must not call each other directly
2. Skills must not call other skills directly
3. The Router selects the agent
4. The Agent selects the skill
5. The Execution Loop orchestrates the full flow

## Context Precedence

1. `project_context/` files (highest)
2. `config/` files
3. Agent `agent.yaml` files
4. Runtime memory (lowest)

## Governance Rules

- Governance agent owns rules, invariants, forbidden patterns, permanent decisions
- Governance must not implement code
- Governance must not audit completed implementation
- Architecture Audit verifies completed work against governance rules
- Architecture Audit must not create new rules
- Architecture Audit must not redesign
