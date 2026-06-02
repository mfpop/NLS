from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import find_files, read_file, count_lines_of_code, find_function_definitions


class AnalyzeUISkill(Skill):
    id = "analyze_ui"
    name = "analyze_ui"
    domain = "frontend"
    description = "Analyze frontend UI components for structure, accessibility, and design system compliance"
    allowed_agents = ["5.Nexus - Frontend-UI"]
    forbidden_agents = [
        "0.Nexus - General Chat",
        "1.Nexus - Governance",
        "2.Nexus - Manufacturing Structure",
        "3.Nexus - Architecture Audit",
        "4.Nexus - Backend-GraphQL",
    ]
    side_effects = False
    risk_level = "low"

    def execute(self, inp: SkillInput) -> SkillOutput:
        ws = inp.workspace_root
        target = inp.params.get("target_path", "frontend/src")
        try:
            component_files = find_files(ws, "*.tsx", subdirs=[target])
            component_files += find_files(ws, "*.tsx", subdirs=["frontend/src/pages"])
            component_files += find_files(ws, "*.tsx", subdirs=["frontend/src/components"])

            components = []
            a11y_issues = []
            total_loc = 0

            for fpath in list(dict.fromkeys(component_files))[:50]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                loc = count_lines_of_code(content)
                total_loc += loc

                has_jsx = "return (" in content or "return <" in content or "=> (" in content
                is_component = has_jsx or "function " in content or "const " in content

                a11y_findings = []
                if is_component:
                    if 'aria-label' not in content and 'role="' not in content:
                        a11y_findings.append("Missing aria-label or role attributes")
                    if '<button' in content and 'type=' not in content and 'onClick' in content:
                        a11y_findings.append("Button without type attribute")
                    if '<img' in content and 'alt=' not in content:
                        a11y_findings.append("Image without alt text")
                    if '<form' in content and 'aria-label' not in content and 'aria-labelledby' not in content and 'role="form"' not in content:
                        a11y_findings.append("Form without accessible label")

                if a11y_findings:
                    for issue in a11y_findings:
                        a11y_issues.append({"file": rel, "issue": issue})

                components.append({
                    "file": rel,
                    "lines": loc,
                    "is_component": is_component,
                    "a11y_issues": len(a11y_findings),
                })

            has_design_system = any(
                "Button" in (read_file(f) or "") for f in find_files(ws, "*.tsx", subdirs=["frontend/src/components/ui"])[:1]
            ) if find_files(ws, "*.tsx", subdirs=["frontend/src/components/ui"]) else False

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "components_found": components,
                    "a11y_issues": a11y_issues,
                    "design_system_compliance": has_design_system,
                    "stats": {"files_scanned": len(components), "total_loc": total_loc, "a11y_issue_count": len(a11y_issues)},
                    "summary": f"Scanned {len(components)} component files ({total_loc} LOC), found {len(a11y_issues)} accessibility issues",
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
