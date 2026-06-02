from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import find_files, read_file, find_function_definitions, count_lines_of_code


class AnalyzeGraphQLSkill(Skill):
    id = "analyze_graphql"
    name = "analyze_graphql"
    domain = "backend"
    description = "Analyze GraphQL resolvers, mutations, queries for thinness and proper delegation"
    allowed_agents = ["4.Nexus - Backend-GraphQL"]
    forbidden_agents = [
        "0.Nexus - General Chat",
        "1.Nexus - Governance",
        "2.Nexus - Manufacturing Structure",
        "3.Nexus - Architecture Audit",
        "5.Nexus - Frontend-UI",
    ]
    side_effects = False
    risk_level = "medium"

    def execute(self, inp: SkillInput) -> SkillOutput:
        ws = inp.workspace_root
        try:
            resolver_files = find_files(ws, "*.py", subdirs=["backend/api", "backend/graphql"])
            resolver_files += find_files(ws, "*.graphql", subdirs=["backend"])
            resolver_files += find_files(ws, "*.graphql", subdirs=["frontend/src/graphql"])

            resolvers = []
            issues = []

            for fpath in list(dict.fromkeys(resolver_files))[:40]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                funcs = find_function_definitions(content)
                loc = count_lines_of_code(content)

                resolver_names = [f for f in funcs if any(
                    kw in f["name"].lower() for kw in ["resolve", "mutate", "query"]
                )]

                thin = loc < 30
                entry = {
                    "file": rel,
                    "functions": len(funcs),
                    "resolvers": resolver_names,
                    "lines": loc,
                    "thin": thin,
                }
                resolvers.append(entry)

                if not thin and resolver_names:
                    issues.append({
                        "file": rel,
                        "severity": "warning",
                        "message": f"Resolver file has {loc} lines — may be too thick, consider delegating to services",
                    })

            thin_count = sum(1 for r in resolvers if r.get("thin"))
            fat_count = sum(1 for r in resolvers if r.get("resolvers") and not r.get("thin"))

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "resolvers_found": resolvers,
                    "thinness_check": {"thin": thin_count, "fat": fat_count},
                    "delegation_patterns": [],
                    "issues": issues,
                    "summary": f"Scanned {len(resolver_files)} GraphQL files: {thin_count} thin, {fat_count} may need refactoring",
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
