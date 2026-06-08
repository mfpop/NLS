# Frontend Skills

This directory contains three skills used by the **5.Nexus - Frontend-UI** agent to analyze, validate, and generate frontend UI components.

---

## 1. Analyze UI Skill

**Skill ID:** `analyze_ui`
**Risk Level:** Low | **Side Effects:** None

### Description
Analyzes frontend UI components for structural correctness, accessibility compliance, and design system adherence. Scans `.tsx` files from `frontend/src/pages/`, `frontend/src/components/`, and an optional custom target path.

### Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project |
| `params.target_path` | `string` | No | Custom sub-path to scan (default: `"frontend/src"`) |

### Accessibility Checks

| Check | Condition |
|-------|-----------|
| Missing ARIA attributes | Component has JSX but no `aria-label` or `role="..."` |
| Button without type | `<button` with `onClick` but no `type=` attribute |
| Image without alt | `<img` tag without `alt=` attribute |
| Form without accessible label | `<form` without `aria-label`, `aria-labelledby`, or `role="form"` |

### Design System Detection
Checks if `frontend/src/components/ui/` exists and contains an exported `Button` component.

### Output Format

```json
{
  "components_found": [
    { "file": "frontend/src/pages/Dashboard.tsx", "lines": 85, "is_component": true, "a11y_issues": 1 }
  ],
  "a11y_issues": [
    { "file": "frontend/src/pages/Dashboard.tsx", "issue": "Missing aria-label or role attributes" }
  ],
  "design_system_compliance": true,
  "stats": { "files_scanned": 10, "total_loc": 1200, "a11y_issue_count": 3 },
  "summary": "Scanned 10 component files (1200 LOC), found 3 accessibility issues"
}
```

### Dependencies
- `shared.types`, `shared.interfaces`
- `skills.utils.find_files`, `skills.utils.read_file`, `skills.utils.count_lines_of_code`, `skills.utils.find_function_definitions`

---

## 2. Validate Tailwind Skill

**Skill ID:** `validate_tailwind`
**Risk Level:** Low | **Side Effects:** None

### Description
Validates that frontend styling uses Tailwind CSS exclusively. Scans `.tsx` files for inline styles or CSS imports, and scans `.css` files under `frontend/src/styles/` for non-Tailwind CSS properties.

### Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project |
| `params.target_path` | `string` | No | Custom sub-path for TSX files (default: `"frontend/src"`) |

### Violation Detection

**In TSX files** (inline styles / CSS imports) — scans for any of:
- `style{{`, `style{` (inline styles)
- `<style>` (embedded CSS)
- `className={css.` (CSS modules)
- `from '` (import of CSS-like resources — simplified check)
- `.module.css"` or `.module.css'` (CSS module imports)

**In CSS files** (non-Tailwind properties) — scans for raw CSS properties like:
`margin-left:`, `font-size:`, `color:`, `background-color:`, `border-radius:`, `display:`, `position:`, `width:`, `height:`, `flex:`, `grid:`, `align-items:`, `justify-content:`, etc.

Lines starting with `/*` or `//` are excluded from CSS property checks.

### Output Format

```json
{
  "tailwind_only": false,
  "violations": [
    {
      "file": "frontend/src/pages/Dashboard.tsx",
      "pattern": "style\\{\\{",
      "type": "inline_style_or_css_import"
    },
    {
      "file": "frontend/src/styles/custom.css",
      "line": 15,
      "content": "  margin-left: 20px;",
      "type": "non_tailwind_css_property"
    }
  ],
  "stats": {
    "tsx_files_scanned": 20,
    "css_files_scanned": 2,
    "tsx_violations": 1,
    "css_violations": 1
  },
  "summary": "Scanned 20 TSX files, 2 CSS files: 2 Tailwind violations found"
}
```

### Dependencies
- `shared.types`, `shared.interfaces`
- `skills.utils.find_files`, `skills.utils.read_file`

---

## 3. Render Component Skill

**Skill ID:** `render_component`
**Risk Level:** Medium | **Side Effects:** Yes (may generate component code)

### Description
Generates or analyzes frontend UI component code following the existing design system patterns. Reads existing components from `frontend/src/components/ui/` to sample coding conventions (Tailwind usage, export patterns) and returns a component code scaffold.

### Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspace_root` | `string` | Yes | Root path of the project |
| `params.component_spec` | `object` | No | Specification object with at least a `description` field |
| `params.framework` | `string` | No | Target framework (default: `"react"`) |
| `task.input` | `string` | No | Used as fallback component description if `component_spec` is empty |

### Output Format

```json
{
  "code": "// Generated react component based on: <description>",
  "framework": "react",
  "tailwind_verified": true,
  "a11y_checked": true,
  "existing_patterns_sampled": [
    {
      "file": "frontend/src/components/ui/Button.tsx",
      "uses_tailwind": true,
      "is_exported": true
    }
  ],
  "summary": "Rendered react component spec — ready for generation at <workspace_root>/frontend/src/components/"
}
```

### Dependencies
- `shared.types`, `shared.interfaces`
- `skills.utils.find_files`, `skills.utils.read_file`

---

## Common Configuration

All frontend skills share these agent access rules:

| Property | Value |
|----------|-------|
| `allowed_agents` | `["5.Nexus - Frontend-UI"]` |
| `forbidden_agents` | General Chat, Governance, Manufacturing, Audit, Backend agents |
| `side_effects` | `analyze_ui` / `validate_tailwind`: `false`; `render_component`: `true` |

### Per-Skill Limits

| Skill | Max Files Scanned | Search Subdirectories |
|-------|-------------------|-----------------------|
| `analyze_ui` | 50 (deduplicated) | `frontend/src/pages/`, `frontend/src/components/`, custom target |
| `validate_tailwind` | 80 TSX + 10 CSS | `frontend/src/` (TSX), `frontend/src/styles/` (CSS) |
| `render_component` | 10 existing UI components | `frontend/src/components/ui/` |

## Error Handling

All three skills follow the same error contract on failure:

```json
{
  "status": "FAILED",
  "error": "<exception message>"
}
```
