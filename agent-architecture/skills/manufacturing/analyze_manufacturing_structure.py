from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import find_files, read_file, find_class_definitions


class AnalyzeManufacturingStructureSkill(Skill):
    id = "analyze_manufacturing_structure"
    name = "analyze_manufacturing_structure"
    domain = "manufacturing"
    description = "Analyze manufacturing hierarchy, BOM, routing, production lines, and capacity structure"
    allowed_agents = ["2.Nexus - Manufacturing Structure"]
    forbidden_agents = [
        "0.Nexus - General Chat",
        "1.Nexus - Governance",
        "3.Nexus - Architecture Audit",
        "4.Nexus - Backend-GraphQL",
        "5.Nexus - Frontend-UI",
    ]
    side_effects = False
    risk_level = "medium"

    MANUFACTURING_KEYWORDS = [
        "Company", "Plant", "ProductionLine", "Department",
        "ResourceGroup", "Resource", "ProductionLineResourceGroup",
        "ProductVariant", "MaterialItem", "Routing", "BOM",
        "WorkInstruction", "StandardWork", "Procedure",
        "StructureDocument", "DocumentControl",
    ]

    def execute(self, inp: SkillInput) -> SkillOutput:
        ws = inp.workspace_root
        struct_id = inp.params.get("structure_id", "")
        try:
            model_files = find_files(ws, "models.py", subdirs=["backend"])
            model_files += find_files(ws, "*.py", subdirs=["backend/manufacturing"])

            hierarchy = {
                "company": None, "plant": None, "production_lines": [],
                "departments": [], "resource_groups": [], "resources": [],
            }
            all_models = []

            for fpath in model_files[:20]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                classes = find_class_definitions(content)

                for cls in classes:
                    for kw in self.MANUFACTURING_KEYWORDS:
                        if kw.lower() in cls["name"].lower():
                            entry = {"name": cls["name"], "file": rel, "bases": cls["bases"]}
                            all_models.append(entry)

                            if "Company" in cls["name"]:
                                hierarchy["company"] = cls["name"]
                            elif "Plant" in cls["name"]:
                                hierarchy["plant"] = cls["name"]
                            elif "ProductionLine" in cls["name"] and "ResourceGroup" not in cls["name"]:
                                hierarchy["production_lines"].append(cls["name"])
                            elif "Department" in cls["name"]:
                                hierarchy["departments"].append(cls["name"])
                            elif "ResourceGroup" in cls["name"]:
                                hierarchy["resource_groups"].append(cls["name"])
                            elif "Resource" in cls["name"] and "ResourceGroup" not in cls["name"]:
                                hierarchy["resources"].append(cls["name"])

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "tree": {"id": struct_id or "default", "models_found": len(all_models)},
                    "summary": f"Found {len(all_models)} manufacturing-related models across {len(model_files)} files",
                    "hierarchy": hierarchy,
                    "manufacturing_models": all_models,
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
