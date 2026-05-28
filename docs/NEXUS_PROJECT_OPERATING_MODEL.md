# Nexus — Project Operating Model

## 1. Purpose

Define a compact, reusable operating system for LeanSync/Nexus chats and project context.

Goals:

- Control token usage
- Ensure consistency across chats
- Maintain a single source of truth
- Enable scalable multi-agent workflows

---

## 2. Core Principles

- Project files = **source of truth**
- Chats = **temporary execution workspaces**
- Stable knowledge must be **persisted to files**
- Long chats must be **compacted and replaced**
- Instruction sets must be **copy/paste-ready**
- All outputs must be **concise and token efficient**

---

## 3. Nexus Workspaces

Use separate chats for each domain:

- Nexus — General Chat
- Nexus — Governance
- Nexus — Backend/GraphQL
- Nexus — Architecture Audit
- Nexus — Manufacturing Structure
- Nexus — Frontend/UI

Each workspace:

- Has a dedicated role definition
- Uses a focused instruction set
- Avoids cross-domain drift

---

## 4. Chat Rules / Invariants

- Be concise
- Be token efficient
- No comments unless explicitly requested
- Avoid unnecessary explanations
- Preserve exact LeanSync/Nexus terminology
- Provide structured, copy/paste-ready outputs
- Do not repeat known context
- Do not introduce speculative ideas unless explicitly requested

---

## 5. Authority Rules

- Project files override chat history
- Approved decisions override drafts
- Latest stable version overrides previous iterations

If conflict occurs:

→ Follow project files

---

## 6. Compact Handoff System

### When To Compact

Compact chats when they become:

- large
- repetitive
- polluted
- unstable
- outdated
- difficult to continue efficiently

---

### Compacting Requirements

A compact handoff must:

- include only **stable, approved, current information**
- be **ready for reuse in a new chat or project file**

Must exclude:

- rejected ideas
- obsolete instructions
- temporary debugging
- repeated discussion
- screenshots (unless formalized into rules)
- speculative ideas
- failed approaches
- duplicated content

---

### Compact Output Format

```md

# Nexus — Project Handoff


## 1. Current Chat Purpose

-


## 2. Approved Decisions

-


## 3. Approved Rules

-


## 4. Active Implementation Rules

-


## 5. Files / Modules Affected

-


## 6. Current Implementation State

-


## 7. Unresolved Issues

-


## 8. Risks

-


## 9. Next Actions

-
```
