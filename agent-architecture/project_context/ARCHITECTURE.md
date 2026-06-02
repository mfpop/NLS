# Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      User Input                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Execution Loop                            │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Task      │  │ Router   │  │ Result Formatter     │  │
│  │ Creation  │──► (Intent) │──► (Structured → String) │  │
│  └───────────┘  └────┬─────┘  └──────────────────────┘  │
│                      │                                   │
└──────────────────────┼───────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                     Agent                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  agent.yaml (role, mission, authority, skills)     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ Skill 1  │ │ Skill 2  │ │ Skill 3  │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Agent System Architecture

- **Agents** are defined by `agent.yaml` files with role, mission, authority, allowed tasks, forbidden tasks, and skill bindings
- **Skills** are independent, domain-specific modules in subdirectories under `skills/`
- **Router** classifies intent and selects the best agent
- **Execution Loop** orchestrates task creation, context loading, routing, skill execution, and result formatting
- **Memory** is runtime-only and must never override `project_context/`

## Source of Truth Rules

1. `project_context/` is the official local source of truth
2. Agents reference `project_context/` as read-only context
3. Memory is runtime memory only
4. Memory must not override `project_context/`
5. Skills must not define permanent governance rules
6. Governance-approved rules must be written into `project_context/`
7. Chats and memory are temporary
8. Stable decisions belong in `project_context/ACTIVE_DECISIONS.md`
