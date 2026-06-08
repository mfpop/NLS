# Check Governance Skill

## Description
Validates documents and processes against active governance policies and domain constitutions. Scans input text against a set of active decisions and constitutional sections to determine compliance, flag violations, and produce a governance score.

**Skill ID:** `check_governance`
**Domain:** `governance`
**Risk Level:** High
**Side Effects:** None

## Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `params.document` or `task.input` | `string` | Yes | Document text to validate. Falls back to `task.input` if `params.document` is not provided. |
| `context_documents` | `Document[]` | Yes | Must include documents with `ACTIVE_DECISIONS` or `DOMAIN_CONSTITUTION` in their path for full validation. |

### Context Document Requirements

- **ACTIVE_DECISIONS**: A document whose file path contains `"ACTIVE_DECISIONS"`. Lines starting with numbered prefixes (e.g. `"1."`, `"2."`) are parsed as active rules.
- **DOMAIN_CONSTITUTION**: A document whose file path contains `"DOMAIN_CONSTITUTION"`. Sections checked include:
  - `"UI consumes GraphQL/backend state only"`
  - `"No mock operational data"`
  - `"No hardcoded business data"`
  - `"No business rules in UI"`
  - `"Frontend styling must use Tailwind CSS only"`

## Output Format

```json
{
  "compliant": true,
  "violations": [
    {
      "rule": "<active decision text>",
      "severity": "info",
      "message": "Active decision applies: <rule text (100 chars)>"
    }
  ],
  "score": 1.0,
  "active_decisions_reviewed": <context document count>,
  "summary": "Governance check complete: <N> applicable rules, score <score>"
}
```

- `compliant` is `true` only when there are zero **critical**-severity violations.
- `score` is clamped to a minimum of `0.0`.
- Violations are generated for active decisions containing: `"No standalone"`, `"must not"`, `"must stay"`, or `"only"`.

## Dependencies

- **Shared Types:** `shared.types` (`SkillInput`, `SkillOutput`, `SkillStatus`)
- **Shared Interfaces:** `shared.interfaces` (`Skill`)
- **Utility:** `skills.utils.read_file`

## Example Usage

**Input:**
```
params.document = "We plan to add a standalone dashboard widget..."
context_documents = [
  Document(path="/decisions/ACTIVE_DECISIONS.md", content="1. No standalone UI components"),
  Document(path="/rules/DOMAIN_CONSTITUTION.md", content="UI consumes GraphQL/backend state only")
]
```

**Output:**
```json
{
  "compliant": true,
  "violations": [
    {
      "rule": "No standalone UI components",
      "severity": "info",
      "message": "Active decision applies: No standalone UI components"
    }
  ],
  "score": 1.0,
  "active_decisions_reviewed": 2,
  "summary": "Governance check complete: 1 applicable rules, score 1.00"
}
```

## Error Handling

If an exception occurs during execution, the skill returns:
```json
{
  "status": "FAILED",
  "error": "<exception message>"
}
```

## Configuration

| Property | Value | Notes |
|----------|-------|-------|
| `allowed_agents` | `["1.Nexus - Governance"]` | Only the Governance agent may invoke this skill |
| `forbidden_agents` | General Chat, Manufacturing, Audit, Backend, Frontend agents | All other specialized agents are excluded |
| `side_effects` | `false` | Read-only; no files or state are modified |
| `risk_level` | `"high"` | Governance validation can block releases |
