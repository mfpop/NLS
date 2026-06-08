"""Fix ordering: move helper constants that reference 'problems' to after problems/actions are declared"""
import re

path = r"D:\02_Work\localai\lmd\frontend\src\pages\check\QualityControlPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# The helper constants block was inserted before "// Shared queries"
# which is before 'problems' and 'actions' are declared.
# We need to move the block that contains issueOpts to after problems/actions.

# First, remove the inserted block (it's before // Shared queries)
old_block_to_remove = """  // Issue/action helpers
  const problemTypeOpts = [{ value: "QUALITY", label: "Quality" }, { value: "OPERATIONAL", label: "Operational" }, { value: "SAFETY", label: "Safety" }, { value: "MATERIAL", label: "Material" }];
  const issueSourceTypeOpts = [{ value: "AUDIT_FINDING", label: "Audit Finding" }, { value: "MANUAL", label: "Manual" }];
  const actionSourceTypeOpts = [{ value: "ISSUE", label: "Issue" }, { value: "AUDIT_FINDING", label: "Audit Finding" }, { value: "MANUAL", label: "Manual" }];
  const toBackendSource = (v: string) => v === "ISSUE" ? "PROBLEM" : v === "AUDIT_FINDING" ? "AUDIT_FINDING" : null;
  const issueSourceLabel = (st: string) => st === "AUDIT_FINDING" ? "Audit Finding" : "Manual";
  const actionSourceLabel = (st: string) => st === "PROBLEM" || st === "ISSUE" ? "Issue" : st === "AUDIT_FINDING" ? "Audit Finding" : "Manual";
  const SEL_INPUT = "h-8 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2 text-sm text-foreground outline-none focus:border-blue-500";
  const issueOpts = useMemo(() => problems.filter((p: any) => p.status === "OPEN"), [problems]);
  const sourceIdLabel = (st: string, sid: number | null) => {
    if (!sid) return "-";
    if (st === "PROBLEM" || st === "ISSUE") { const p = problems.find((x: any) => x.id === sid); return p?.title || `Issue #${sid}`; }
    return `#${sid}`;
  };

  // ══ Shared queries ══"""

if old_block_to_remove in content:
    content = content.replace(old_block_to_remove, "  // ══ Shared queries ══")
    print("Removed old helper constants block")
else:
    print("Could not find the helper constants block to remove")

# Now insert the block after problems/actions are declared
# Look for "  const actions = (actionsData as any)?.actions || [];"
insert_point = "  const actions = (actionsData as any)?.actions || [];"
insert_after = """  const actions = (actionsData as any)?.actions || [];

  // Issue/action helpers
  const problemTypeOpts = [{ value: "QUALITY", label: "Quality" }, { value: "OPERATIONAL", label: "Operational" }, { value: "SAFETY", label: "Safety" }, { value: "MATERIAL", label: "Material" }];
  const issueSourceTypeOpts = [{ value: "AUDIT_FINDING", label: "Audit Finding" }, { value: "MANUAL", label: "Manual" }];
  const actionSourceTypeOpts = [{ value: "ISSUE", label: "Issue" }, { value: "AUDIT_FINDING", label: "Audit Finding" }, { value: "MANUAL", label: "Manual" }];
  const toBackendSource = (v: string) => v === "ISSUE" ? "PROBLEM" : v === "AUDIT_FINDING" ? "AUDIT_FINDING" : null;
  const issueSourceLabel = (st: string) => st === "AUDIT_FINDING" ? "Audit Finding" : "Manual";
  const actionSourceLabel = (st: string) => st === "PROBLEM" || st === "ISSUE" ? "Issue" : st === "AUDIT_FINDING" ? "Audit Finding" : "Manual";
  const SEL_INPUT = "h-8 w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 px-2 text-sm text-foreground outline-none focus:border-blue-500";
  const issueOpts = useMemo(() => problems.filter((p: any) => p.status === "OPEN"), [problems]);
  const sourceIdLabel = (st: string, sid: number | null) => {
    if (!sid) return "-";
    if (st === "PROBLEM" || st === "ISSUE") { const p = problems.find((x: any) => x.id === sid); return p?.title || `Issue #${sid}`; }
    return `#${sid}`;
  };"""

content = content.replace(insert_point, insert_after)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Helper constants moved after problems/actions declarations")
