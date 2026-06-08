"""Apply Production-style issue/action layouts to QualityControlPage.tsx"""
import re

path = r"D:\02_Work\localai\lmd\frontend\src\pages\check\QualityControlPage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# =========================================================
# 1. Add helper constants
# =========================================================
helper_constants = """
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
  };
"""

# Insert helper constants before "  // ══ Shared queries ══"
content = content.replace(
    "  // ══ Shared queries ══",
    helper_constants + "\n  // ══ Shared queries ══"
)

# =========================================================
# 2. Update hNewIssue
# =========================================================
old_new_issue = '  const hNewIssue = useCallback(() => { setShowNewIssue(true); setITitle(""); setISeverity("MEDIUM"); setIDesc(""); setIOwner(""); }, []);'
new_new_issue = '  const hNewIssue = useCallback(() => { setShowNewIssue(true); setITitle(""); setIProblemType("QUALITY"); setISeverity("MEDIUM"); setIDesc(""); setIOwner(""); setIDueDate(""); setINotes(""); setISourceType("MANUAL"); setISourceId(null); }, []);'
content = content.replace(old_new_issue, new_new_issue)

# =========================================================
# 3. Update hNewAction
# =========================================================
old_new_action = '  const hNewAction = useCallback(() => { setShowNewAction(true); setATitle(""); setAPriority("MEDIUM"); setAOwner(""); setADueDate(""); setADesc(""); }, []);'
new_new_action = '  const hNewAction = useCallback(() => { setShowNewAction(true); setATitle(""); setAPriority("MEDIUM"); setAOwner(""); setADueDate(""); setADesc(""); setANotes(""); setASourceType("MANUAL"); setASourceId(null); }, []);'
content = content.replace(old_new_action, new_new_action)

# =========================================================
# 4. Update hCreateIssue
# =========================================================
old_create_issue = """  const hCreateIssue = useCallback(async () => {
    if (!iTitle.trim()) return;
    const r = await createIssueMut({ variables: { title: iTitle.trim(), problemType: "QUALITY", severity: iSeverity, description: iDesc.trim() || null, reportedBy: iOwner.trim() || null, controlArea: "QUALITY" } });
    if (r.data) { setSuccessMsg("Issue created"); setShowNewIssue(false); refetchProblems(); }
    else { setSuccessMsg(r.error?.message || "Create failed"); }
  }, [iTitle, iSeverity, iDesc, iOwner, createIssueMut, refetchProblems]);"""

new_create_issue = """  const hCreateIssue = useCallback(async () => {
    if (!iTitle.trim()) return;
    try {
      const r = await createIssueMut({
        variables: {
          title: iTitle.trim(), problemType: iProblemType, severity: iSeverity,
          description: iDesc.trim() || null, reportedBy: iOwner.trim() || null,
          dueDate: iDueDate || null, notes: iNotes.trim() || null,
          sourceType: iSourceType === "MANUAL" ? null : iSourceType,
          sourceId: iSourceType === "MANUAL" ? null : iSourceId,
          controlArea: "QUALITY",
        },
      });
      if (r.data) { setSuccessMsg("Issue created"); setShowNewIssue(false); refetchProblems(); }
      else { setSuccessMsg(r.error?.message || "Create failed"); }
    } catch { setSuccessMsg("Create failed"); }
  }, [iTitle, iProblemType, iSeverity, iDesc, iOwner, iDueDate, iNotes, iSourceType, iSourceId, createIssueMut, refetchProblems]);"""
content = content.replace(old_create_issue, new_create_issue)

# =========================================================
# 5. Update hSaveEditIssue
# =========================================================
old_save_edit_issue = """  const hSaveEditIssue = useCallback(async () => {
    if (!editIssueId || !editITitle.trim()) return;
    const r = await updateIssueMut({ variables: { id: editIssueId, title: editITitle.trim(), severity: editISeverity, description: editIDesc.trim() || null } });
    if (r.data) { setSuccessMsg("Issue updated"); setEditIssueId(null); refetchProblems(); }
    else { setSuccessMsg(r.error?.message || "Update failed"); }
  }, [editIssueId, editITitle, editISeverity, editIDesc, updateIssueMut, refetchProblems]);"""

new_save_edit_issue = """  const hSaveEditIssue = useCallback(async () => {
    if (!editIssueId || !editITitle.trim()) return;
    try {
      const r = await updateIssueMut({ variables: { id: editIssueId, title: editITitle.trim(), severity: editISeverity, description: editIDesc.trim() || null, notes: editINotes.trim() || null, owner: editIOwner.trim() || null } });
      if (r.data) { setSuccessMsg("Issue updated"); setEditIssueId(null); refetchProblems(); }
      else { setSuccessMsg(r.error?.message || "Update failed"); }
    } catch { setSuccessMsg("Update failed"); }
  }, [editIssueId, editITitle, editISeverity, editIDesc, editINotes, editIOwner, updateIssueMut, refetchProblems]);"""
content = content.replace(old_save_edit_issue, new_save_edit_issue)

# =========================================================
# 6. Update hCreateAction
# =========================================================
old_create_action = """  const hCreateAction = useCallback(async () => {
    if (!aTitle.trim()) return;
    const r = await createActionMut({ variables: { title: aTitle.trim(), description: aDesc.trim() || null, owner: aOwner.trim() || null, dueDate: aDueDate || null, priority: aPriority, controlArea: "QUALITY" } });
    if (r.data) { setSuccessMsg("Action created"); setShowNewAction(false); refetchActions(); }
    else { setSuccessMsg(r.error?.message || "Create failed"); }
  }, [aTitle, aDesc, aOwner, aDueDate, aPriority, createActionMut, refetchActions]);"""

new_create_action = """  const hCreateAction = useCallback(async () => {
    if (!aTitle.trim()) return;
    try {
      const r = await createActionMut({
        variables: {
          title: aTitle.trim(), description: aDesc.trim() || null,
          owner: aOwner.trim() || null, dueDate: aDueDate || null,
          priority: aPriority, notes: aNotes.trim() || null,
          sourceType: toBackendSource(aSourceType),
          sourceId: aSourceType === "MANUAL" ? null : aSourceId,
          controlArea: "QUALITY",
        },
      });
      if (r.data) { setSuccessMsg("Action created"); setShowNewAction(false); refetchActions(); }
      else { setSuccessMsg(r.error?.message || "Create failed"); }
    } catch { setSuccessMsg("Create failed"); }
  }, [aTitle, aDesc, aOwner, aDueDate, aPriority, aNotes, aSourceType, aSourceId, createActionMut, refetchActions]);"""
content = content.replace(old_create_action, new_create_action)

# =========================================================
# 7. Update hSaveEditAction
# =========================================================
old_save_edit_action = """  const hSaveEditAction = useCallback(async () => {
    if (!editActionId || !editATitle.trim()) return;
    const r = await updateActionMut({ variables: { id: editActionId, title: editATitle.trim(), description: editADesc.trim() || null, owner: editAOwner.trim() || null, priority: editAPriority } });
    if (r.data) { setSuccessMsg("Action updated"); setEditActionId(null); refetchActions(); }
    else { setSuccessMsg(r.error?.message || "Update failed"); }
  }, [editActionId, editATitle, editADesc, editAOwner, editAPriority, updateActionMut, refetchActions]);"""

new_save_edit_action = """  const hSaveEditAction = useCallback(async () => {
    if (!editActionId || !editATitle.trim()) return;
    try {
      const r = await updateActionMut({ variables: { id: editActionId, title: editATitle.trim(), description: editADescription.trim() || null, owner: editAOwner.trim() || null, priority: editAPriority, notes: editANotes.trim() || null, sourceType: toBackendSource(editASourceType), sourceId: editASourceType === "MANUAL" ? null : editASourceId } });
      if (r.data) { setSuccessMsg("Action updated"); setEditActionId(null); refetchActions(); }
      else { setSuccessMsg(r.error?.message || "Update failed"); }
    } catch { setSuccessMsg("Update failed"); }
  }, [editActionId, editATitle, editADescription, editAOwner, editAPriority, editANotes, editASourceType, editASourceId, updateActionMut, refetchActions]);"""
content = content.replace(old_save_edit_action, new_save_edit_action)

# =========================================================
# 8. Replace problemDetail create form
# =========================================================
old_problem_create = """  const problemDetail = (id: number | null) => {
    const item = id ? problems.find((p: any) => p.id === id) ?? null : null;
    if (showNewIssue && !item) {
      return <div className="flex-1 min-h-0 overflow-y-auto p-5"><h2 className="text-sm font-bold text-foreground mb-4">New Issue</h2><div className="space-y-3 max-w-lg"><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Title *</label><input type="text" value={iTitle} onChange={(e) => setITitle(e.target.value)} className={iCls} placeholder="Issue title..." /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Severity *</label><select value={iSeverity} onChange={(e) => setISeverity(e.target.value)} className={sCls}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner</label><input type="text" value={iOwner} onChange={(e) => setIOwner(e.target.value)} className={iCls} placeholder="Owner..." /></div></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description</label><textarea value={iDesc} onChange={(e) => setIDesc(e.target.value)} rows={3} className={iCls + " resize-none h-20"} placeholder="Describe..." /></div></div></div>;
    }
    if (!item) return renderOverview();
    if (editIssueId) {
      return <div className="flex-1 min-h-0 overflow-y-auto p-5"><h2 className="text-sm font-bold text-foreground mb-4">Edit Issue</h2><div className="space-y-3 max-w-lg"><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Title *</label><input type="text" value={editITitle} onChange={(e) => setEditITitle(e.target.value)} className={iCls} /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Severity</label><select value={editISeverity} onChange={(e) => setEditISeverity(e.target.value)} className={sCls}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div><div /></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description</label><textarea value={editIDesc} onChange={(e) => setEditIDesc(e.target.value)} rows={3} className={iCls + " resize-none h-20"} /></div></div></div>;
    }
    return <div className="flex-1 min-h-0 overflow-y-auto p-5"><h2 className="text-base font-bold text-foreground mb-2">{item.title}</h2><div className="text-sm text-muted-foreground">{item.description || "No description"}</div><div className="mt-3 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm"><span className="text-muted-foreground">Status</span><span>{item.status}</span><span className="text-muted-foreground">Severity</span><span>{item.severity}</span><span className="text-muted-foreground">Type</span><span>{item.problemType}</span></div></div>;
  };
  const actionList"""

new_problem_create = """  const problemDetail = (id: number | null) => {
    const item = id ? problems.find((p: any) => p.id === id) ?? null : null;

    // Create mode
    if (showNewIssue && !item) {
      return <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
        <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 space-y-3">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Type *</label><select value={iProblemType} onChange={(e) => setIProblemType(e.target.value)} className={SEL_INPUT}>{problemTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Severity *</label><select value={iSeverity} onChange={(e) => setISeverity(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner *</label><input type="text" value={iOwner} onChange={(e) => setIOwner(e.target.value)} className={SEL_INPUT} placeholder="Owner..." /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Due Date</label><input type="date" value={iDueDate} onChange={(e) => setIDueDate(e.target.value)} className={SEL_INPUT} /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Source Type</label><select value={iSourceType} onChange={(e) => setISourceType(e.target.value)} className={SEL_INPUT}>{issueSourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          {iSourceType !== "MANUAL" && <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Source</label><input type="text" value={iSourceId ?? ""} onChange={(e) => setISourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} placeholder="Source ID..." /></div>}
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Title *</label><input type="text" value={iTitle} onChange={(e) => setITitle(e.target.value)} className={SEL_INPUT} placeholder="Issue title..." /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description</label><textarea value={iDesc} onChange={(e) => setIDesc(e.target.value)} rows={3} className="h-24 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" placeholder="Describe..." /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Notes</label><textarea value={iNotes} onChange={(e) => setINotes(e.target.value)} rows={2} className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" placeholder="Notes..." /></div>
        </div>
      </div>;
    }

    if (!item) return renderOverview();

    // Edit mode
    if (editIssueId) {
      return <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
        <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 space-y-3">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Type</label><select value={item.problemType} className={SEL_INPUT + " opacity-60 cursor-not-allowed"} disabled>{problemTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Severity *</label><select value={editISeverity} onChange={(e) => setEditISeverity(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Status</label><select value={item.status} className={SEL_INPUT + " opacity-60 cursor-not-allowed"} disabled><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option><option value="CANCELLED">Cancelled</option></select></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner</label><input type="text" value={editIOwner} onChange={(e) => setEditIOwner(e.target.value)} className={SEL_INPUT} /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Due Date</label><input type="date" value={editIDueDate} onChange={(e) => setEditIDueDate(e.target.value)} className={SEL_INPUT} /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Source Type</label><select value={editISourceType} onChange={(e) => setEditISourceType(e.target.value)} className={SEL_INPUT}>{issueSourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          {editISourceType !== "MANUAL" && <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Source</label><input type="text" value={editISourceId ?? ""} onChange={(e) => setEditISourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} /></div>}
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Title *</label><input type="text" value={editITitle} onChange={(e) => setEditITitle(e.target.value)} className={SEL_INPUT} /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description</label><textarea value={editIDesc} onChange={(e) => setEditIDesc(e.target.value)} rows={3} className="h-24 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Notes</label><textarea value={editINotes} onChange={(e) => setEditINotes(e.target.value)} rows={2} className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
        </div>
      </div>;
    }

    // Read-only view
    const isSrc = issueSourceLabel(item.sourceType);
    const sevCls = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.MEDIUM;
    const statCls = ISSUE_STATUS_STYLES[item.status] || ISSUE_STATUS_STYLES.OPEN;
    return <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
      <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
        <div><h2 className="text-base font-bold text-foreground">{item.title || "Issue"}</h2>
          <div className="flex items-center gap-2 mt-1"><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${statCls}`}>{statusLabel(item.status)}</span>{item.severity && <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${sevCls}`}>{item.severity}</span>}</div></div>
        {item.description && <div><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground">{item.description}</p></div>}
        {item.notes && <div><p className="text-xs font-medium text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground">{item.notes}</p></div>}
      </div>
      <div className="w-[35%] shrink-0 border-l border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-5 space-y-4">
        <div><p className="text-xs font-medium text-muted-foreground mb-2">Status & Severity</p>
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${statCls}`}>{statusLabel(item.status)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${sevCls}`}>{item.severity || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{item.problemType || "-"}</span></div>
          </div></div>
        <div><p className="text-xs font-medium text-muted-foreground mb-2">Source</p><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{isSrc}</span></div></div></div>
        <div><p className="text-xs font-medium text-muted-foreground mb-2">Assignment</p><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="text-foreground font-medium">{item.reportedBy || item.owner || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-foreground">{item.createdAt?.slice(0, 10) || "-"}</span></div>
          </div></div>
      </div>
    </div>;
  };
  const actionList"""

content = content.replace(old_problem_create, new_problem_create)

# =========================================================
# 9. Replace actionDetail
# =========================================================
old_action_create = """  const actionDetail = (id: number | null) => {
    const item = id ? actions.find((a: any) => a.id === id) ?? null : null;
    if (showNewAction && !item) {
      return <div className="flex-1 min-h-0 overflow-y-auto p-5"><h2 className="text-sm font-bold text-foreground mb-4">New Action</h2><div className="space-y-3 max-w-lg"><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Title *</label><input type="text" value={aTitle} onChange={(e) => setATitle(e.target.value)} className={iCls} placeholder="Action title..." /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Priority</label><select value={aPriority} onChange={(e) => setAPriority(e.target.value)} className={sCls}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Due Date</label><input type="date" value={aDueDate} onChange={(e) => setADueDate(e.target.value)} className={iCls} /></div></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner</label><input type="text" value={aOwner} onChange={(e) => setAOwner(e.target.value)} className={iCls} placeholder="Owner..." /></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description</label><textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={3} className={iCls + " resize-none h-20"} placeholder="Describe..." /></div></div></div>;
    }
    if (!item) return renderOverview();
    if (editActionId) {
      return <div className="flex-1 min-h-0 overflow-y-auto p-5"><h2 className="text-sm font-bold text-foreground mb-4">Edit Action</h2><div className="space-y-3 max-w-lg"><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Title *</label><input type="text" value={editATitle} onChange={(e) => setEditATitle(e.target.value)} className={iCls} /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Priority</label><select value={editAPriority} onChange={(e) => setEditAPriority(e.target.value)} className={sCls}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Due Date</label><input type="date" value={editADueDate} onChange={(e) => setEditADueDate(e.target.value)} className={iCls} /></div></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner</label><input type="text" value={editAOwner} onChange={(e) => setEditAOwner(e.target.value)} className={iCls} /></div><div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description</label><textarea value={editADesc} onChange={(e) => setEditADesc(e.target.value)} rows={3} className={iCls + " resize-none h-20"} /></div></div></div>;
    }
    return <div className="flex-1 min-h-0 overflow-y-auto p-5"><h2 className="text-base font-bold text-foreground mb-2">{item.title}</h2><div className="text-sm text-muted-foreground">{item.description || "No description"}</div><div className="mt-3 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm"><span className="text-muted-foreground">Status</span><span>{item.status}</span><span className="text-muted-foreground">Priority</span><span>{item.priority}</span><span className="text-muted-foreground">Owner</span><span>{item.owner || "-"}</span></div></div>;
  };
"""

new_action_create = """  const actionDetail = (id: number | null) => {
    const item = id ? actions.find((a: any) => a.id === id) ?? null : null;

    // Create mode
    if (showNewAction && !item) {
      return <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
        <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 space-y-3">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Source Type</label><select value={aSourceType} onChange={(e) => setASourceType(e.target.value)} className={SEL_INPUT}>{actionSourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          {aSourceType !== "MANUAL" && <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Linked Source *</label>{aSourceType === "ISSUE" ? <select value={aSourceId ?? ""} onChange={(e) => setASourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT}><option value="">Select...</option>{issueOpts.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}</select> : <input type="text" value={aSourceId ?? ""} onChange={(e) => setASourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} placeholder="Source ID..." />}</div>}
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Priority *</label><select value={aPriority} onChange={(e) => setAPriority(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner *</label><input type="text" value={aOwner} onChange={(e) => setAOwner(e.target.value)} className={SEL_INPUT} placeholder="Owner..." /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Due Date *</label><input type="date" value={aDueDate} onChange={(e) => setADueDate(e.target.value)} className={SEL_INPUT} /></div>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Title *</label><input type="text" value={aTitle} onChange={(e) => setATitle(e.target.value)} className={SEL_INPUT} placeholder="Action title..." /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description</label><textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={3} className="h-24 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" placeholder="Describe..." /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Notes</label><textarea value={aNotes} onChange={(e) => setANotes(e.target.value)} rows={2} className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" placeholder="Notes..." /></div>
        </div>
      </div>;
    }

    if (!item) return renderOverview();

    // Edit mode
    if (editActionId) {
      return <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
        <div className="w-[25%] shrink-0 overflow-y-auto border-r border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-4 space-y-3">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Source Type</label><select value={editASourceType} onChange={(e) => setEditASourceType(e.target.value)} className={SEL_INPUT}>{actionSourceTypeOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          {editASourceType !== "MANUAL" && <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Linked Source</label>{editASourceType === "ISSUE" ? <select value={editASourceId ?? ""} onChange={(e) => setEditASourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT}><option value="">Select...</option>{issueOpts.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}</select> : <input type="text" value={editASourceId ?? ""} onChange={(e) => setEditASourceId(e.target.value ? Number(e.target.value) : null)} className={SEL_INPUT} placeholder="Source ID..." />}</div>}
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Priority *</label><select value={editAPriority} onChange={(e) => setEditAPriority(e.target.value)} className={SEL_INPUT}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Status</label><select value={item.status} className={SEL_INPUT + " opacity-60 cursor-not-allowed"} disabled><option value="OPEN">Open</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Owner *</label><input type="text" value={editAOwner} onChange={(e) => setEditAOwner(e.target.value)} className={SEL_INPUT} placeholder="Owner..." /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Due Date *</label><input type="date" value={editADueDate} onChange={(e) => setEditADueDate(e.target.value)} className={SEL_INPUT} /></div>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Title *</label><input type="text" value={editATitle} onChange={(e) => setEditATitle(e.target.value)} className={SEL_INPUT} /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Description</label><textarea value={editADescription} onChange={(e) => setEditADescription(e.target.value)} rows={3} className="h-24 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
          <div><label className="block text-[10px] font-medium text-muted-foreground mb-1">Notes</label><textarea value={editANotes} onChange={(e) => setEditANotes(e.target.value)} rows={2} className="h-16 w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none resize-none" /></div>
        </div>
      </div>;
    }

    // Read-only view
    const srcType = actionSourceLabel(item.sourceType);
    const srcIdDisp = sourceIdLabel(item.sourceType, item.sourceId);
    return <div className="flex-1 min-h-0 flex overflow-hidden bg-gradient-to-b from-white/30 to-white/10 dark:from-slate-900/30 dark:to-slate-900/10">
      <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
        <div><h2 className="text-base font-bold text-foreground">{item.title}</h2>
          <div className="flex items-center gap-2 mt-1"><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${ACTION_STATUS_STYLES[item.status] || ACTION_STATUS_STYLES.OPEN}`}>{statusLabel(item.status)}</span>{item.priority && <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.MEDIUM}`}>{item.priority}</span>}</div></div>
        {item.description && <div><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground">{item.description}</p></div>}
        {item.notes && <div><p className="text-xs font-medium text-muted-foreground mb-1">Notes</p><p className="text-sm text-foreground">{item.notes}</p></div>}
      </div>
      <div className="w-[35%] shrink-0 border-l border-white/20 dark:border-slate-700/20 bg-white/40 dark:bg-slate-900/40 p-5 space-y-4">
        <div><p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${ACTION_STATUS_STYLES[item.status] || ACTION_STATUS_STYLES.OPEN}`}>{statusLabel(item.status)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.MEDIUM}`}>{item.priority || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span className="text-foreground font-medium">{item.owner || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="text-foreground">{item.dueDate || "-"}</span></div>
          </div></div>
        <div><p className="text-xs font-medium text-muted-foreground mb-2">Source</p><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{srcType}</span></div>{item.sourceId && <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="text-foreground font-medium">{srcIdDisp}</span></div>}</div></div>
        <div><p className="text-xs font-medium text-muted-foreground mb-2">Dates</p><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="text-foreground">{item.createdAt?.slice(0, 10) || "-"}</span></div></div></div>
      </div>
    </div>;
  };
"""

content = content.replace(old_action_create, new_action_create)

# =========================================================
# 10. Update toolbar disabled conditions
# =========================================================
content = content.replace(
    'if (showNewIssue) return <><ToolbarButton icon={Save} label="Save Issue" onClick={hCreateIssue} disabled={!iTitle.trim()} variant="success" /><span className="h-5 w-px shrink-0 bg-border/25" /><ToolbarButton icon={ArrowLeft} label="Cancel" onClick={() => setShowNewIssue(false)} /></>;',
    'if (showNewIssue) return <><ToolbarButton icon={Save} label="Save Issue" onClick={hCreateIssue} disabled={!iTitle.trim() || !iOwner.trim() || !iSeverity} variant="success" /><span className="h-5 w-px shrink-0 bg-border/25" /><ToolbarButton icon={ArrowLeft} label="Cancel" onClick={() => setShowNewIssue(false)} /></>;'
)
content = content.replace(
    'if (showNewAction) return <><ToolbarButton icon={Save} label="Save Action" onClick={hCreateAction} disabled={!aTitle.trim()} variant="success" /><span className="h-5 w-px shrink-0 bg-border/25" /><ToolbarButton icon={ArrowLeft} label="Cancel" onClick={() => setShowNewAction(false)} /></>;',
    'if (showNewAction) return <><ToolbarButton icon={Save} label="Save Action" onClick={hCreateAction} disabled={!aTitle.trim() || !aOwner.trim() || !aDueDate} variant="success" /><span className="h-5 w-px shrink-0 bg-border/25" /><ToolbarButton icon={ArrowLeft} label="Cancel" onClick={() => setShowNewAction(false)} /></>;'
)
content = content.replace(
    'if (editIssueId) return <><ToolbarButton icon={Save} label="Save" onClick={hSaveEditIssue} disabled={!editITitle.trim()} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={() => hCancelIssue(editIssueId)} /><span className="h-5 w-px shrink-0 bg-border/25" /><ToolbarButton icon={ArrowLeft} label="Back" onClick={() => setEditIssueId(null)} /></>;',
    'if (editIssueId) return <><ToolbarButton icon={Save} label="Save" onClick={hSaveEditIssue} disabled={!editITitle.trim()} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={() => hCancelIssue(editIssueId)} /><span className="h-5 w-px shrink-0 bg-border/25" /><ToolbarButton icon={ArrowLeft} label="Back" onClick={() => setEditIssueId(null)} /></>;'
)
content = content.replace(
    'if (editActionId) return <><ToolbarButton icon={Save} label="Save" onClick={hSaveEditAction} disabled={!editATitle.trim()} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={() => hCancelAction(editActionId)} /><span className="h-5 w-px shrink-0 bg-border/25" /><ToolbarButton icon={ArrowLeft} label="Back" onClick={() => setEditActionId(null)} /></>;',
    'if (editActionId) return <><ToolbarButton icon={Save} label="Save" onClick={hSaveEditAction} disabled={!editATitle.trim() || !editAOwner.trim()} variant="success" /><ToolbarButton icon={X} label="Cancel" onClick={() => hCancelAction(editActionId)} /><span className="h-5 w-px shrink-0 bg-border/25" /><ToolbarButton icon={ArrowLeft} label="Back" onClick={() => setEditActionId(null)} /></>;'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("All Production-style layouts applied successfully")
