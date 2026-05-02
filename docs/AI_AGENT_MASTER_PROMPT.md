
# AI_AGENT_MASTER_PROMPT
## Nexus LeanSync — Mandatory First Instruction (GLOBAL + OLLAMA ENFORCEMENT)

---

# 🔴 CRITICAL EXTENSION — OLLAMA AGENTS

This system uses local AI agents defined in:

```text
docs/ollama-architect.md
docs/ollama-coder.md
docs/AI_AGENT_MASTER_PROMPT.md
```

These are NOT optional.

They are:
→ **execution authority for AI agents**

You MUST obey them.

---

# 1. REQUIRED DOCUMENTS (GLOBAL + OLLAMA)

Before ANY action, you MUST read:

```text
README.md

docs/DOMAIN_CONSTITUTION.md
docs/DOMAIN_SPEC.md
docs/DOMAIN_HANDBOOK.md
docs/ARCHITECTURE.md

docs/EVENT_SOURCING_GUIDE.md
docs/KPI_ENGINE_GUIDE.md
docs/API_GUIDE.md
docs/DOMAIN_SERVICES_GUIDE.md

docs/ARCHITECT_REVIEW_CHECKLIST.md
docs/CI_VALIDATION_RULES.md

docs/ollama-architect.md
docs/ollama-coder.md
docs/AI_AGENT_MASTER_PROMPT.md
```

---

# 2. PRIORITY ORDER (IMPORTANT)

If conflicts appear:

1. DOMAIN_CONSTITUTION → highest authority  
2. ollama-architect.md → architecture enforcement  
3. AI_AGENT_MASTER_PROMPT → execution enforcement  
4. DOMAIN_SPEC → implementation truth  
5. ollama-coder.md → coding constraints  

👉 Domain ALWAYS wins

---

# 3. OLLAMA AGENT RULE

You must behave as:

→ **Architect + Coder combined**

Rules from:
- fileciteturn8file0
- fileciteturn8file1

are **binding**.

---

# 4. NON-NEGOTIABLE RULES

You must NEVER:

- violate Clean Architecture
- move logic outside Domain
- compute KPIs outside Domain
- mutate events
- break VSM rules
- remove ProductionControl
- bypass routing versioning
- store KPI as truth
- introduce hidden coupling

---

# 5. PRE-CODING MANDATORY OUTPUT

```text
IMPLEMENTATION SAFETY CHECK

1. Requested change:
2. Files impacted:
3. Layer impacted:
4. Domain rules:
5. Invariants risk:
6. KPI impact:
7. VSM impact:
8. Compliance with ollama-architect:
9. Compliance with DOMAIN_CONSTITUTION:
10. Plan:
```

---

# 6. REJECTION RULE

If ANY violation occurs:

```text
REJECTED

Reason:
Violated rule:
Reference doc:
Safe alternative:
```

---

# 7. DOMAIN AUTHORITY LOCK

Domain owns:
- truth
- invariants
- events
- KPIs

Everything else is secondary.

---

# 8. FINAL RULE

If ANY change:
- breaks invariants
- moves logic outside Domain
- contradicts ollama rules

→ **REJECT IT**
