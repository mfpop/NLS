# Audit Architecture Skill

## Description
Audits a completed implementation against architecture and governance rules. Checks backend resolver thickness, frontend GraphQL consumption, test coverage adequacy, and CSS file usage (Tailwind-only policy). Produces a numeric score with findings and recommendations.

**Skill ID:** `audit_architecture`
**Domain:** `audit`
**Risk Level:** High
**Side Effects:** None

## Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project to audit |
| `params.target_path` | `string` | No | Specific sub-path to audit (defaults to `workspace_root`) |

### Checks Performed

| Check | Target | Severity | Score Impact |
|-------|--------|----------|-------------|
| **Thin Resolvers** | Backend `*.py` files in `backend/graphql/` and `backend/api/` | Minor | -0.05 per file over 50 lines |
| **GraphQL Consumption** | Frontend `*.tsx` files in `frontend/src/pages/` | Info | None |
| **Test Coverage** | `*test*.py` (backend) and `*test*.ts` (frontend) files | Minor | -0.02 per file under 10 lines |
| **Tailwind Violation** | `*.css` files in `frontend/src/` | Major | -0.10 per file with `@import` |

## Output Format

```json
{
  "score": 0.85,
  "findings": [
    {
      "severity": "minor",
      "category": "thin_resolvers",
      "file": "backend/graphql/resolvers.py",
      "message": "Resolver file has 72 lines — should delegate to services"
    }
  ],
  "recommendations": [
    "Decompose thick resolver files into service + repository layers",
    "Add GraphQL queries/mutations to pages missing backend state consumption",
    "Expand test coverage for thin test files",
    "Migrate custom CSS to Tailwind utility classes"
  ],
  "stats": {
    "backend_files_checked": 15,
    "frontend_pages_checked": 8,
    "test_files_checked": 12,
    "css_files_checked": 3
  },
  "summary": "Audit score: 0.85 — 4 findings, 4 recommendations"
}
```

## Dependencies

- **Shared Types:** `shared.types` (`SkillInput`, `SkillOutput`, `SkillStatus`)
- **Shared Interfaces:** `shared.interfaces` (`Skill`)
- **Utilities:** `skills.utils.find_files`, `skills.utils.read_file`, `skills.utils.count_lines_of_code`

## Example Usage

**Input:**
```
workspace_root = "/path/to/project"
```

**Output:**
```json
{
  "score": 0.95,
  "findings": [
    { "severity": "minor", "category": "thin_resolvers", "file": "backend/graphql/order_resolver.py", "message": "Resolver file has 63 lines" }
  ],
  "recommendations": ["Decompose thick resolver files into service + repository layers"],
  "stats": { "backend_files_checked": 10, "frontend_pages_checked": 5, "test_files_checked": 3, "css_files_checked": 1 },
  "summary": "Audit score: 0.95 — 1 findings, 1 recommendations"
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
| `allowed_agents` | `["3.Nexus - Architecture Audit"]` | Only the Architecture Audit agent may invoke this skill |
| `forbidden_agents` | General Chat, Governance, Manufacturing, Backend, Frontend agents | All other specialized agents are excluded |
| `side_effects` | `false` | Read-only; no files or state are modified |
| `risk_level` | `"high"` | Audit results influence release decisions |
| File limits | Backend: 30, Frontend pages: 30, Tests: 20, CSS: 10 | Scans are capped to prevent excessive I/O |
