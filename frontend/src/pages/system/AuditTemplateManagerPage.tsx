import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useLocation } from "react-router-dom";
import {
  ClipboardCheck, Plus, RefreshCw, Archive, Copy, Eye, Search,
  X, Check, Loader2, Info, TriangleAlert, Pencil, Trash2,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { theme } from "@/styles/themeTokens";
import {
  AUDIT_TEMPLATES_QUERY,
  CREATE_AUDIT_TEMPLATE_MUTATION, UPDATE_AUDIT_TEMPLATE_MUTATION,
  ACTIVATE_AUDIT_TEMPLATE_MUTATION, ARCHIVE_AUDIT_TEMPLATE_MUTATION,
  CLONE_AUDIT_TEMPLATE_MUTATION,
  ADD_AUDIT_TEMPLATE_CATEGORY_MUTATION, UPDATE_AUDIT_TEMPLATE_CATEGORY_MUTATION,
  REMOVE_AUDIT_TEMPLATE_CATEGORY_MUTATION,
  ADD_AUDIT_TEMPLATE_QUESTION_MUTATION, UPDATE_AUDIT_TEMPLATE_QUESTION_MUTATION,
  REMOVE_AUDIT_TEMPLATE_QUESTION_MUTATION,
  INSTALL_DEFAULT_PC_TEMPLATES_MUTATION,
  INSTALL_DEFAULT_QC_TEMPLATES_MUTATION,
  INSTALL_DEFAULT_SAFETY_TEMPLATES_MUTATION,
  INSTALL_DEFAULT_MATERIAL_TEMPLATES_MUTATION,
} from "@/graphql/auditQueries";

interface AuditTemplate {
  id: string; code: string; name: string; auditType: string;
  moduleScope: string; targetTypes: string[]; version: number;
  status: string; isDefault: boolean; isActive: boolean;
  categories: AuditTemplateCategory[];
  createdAt: string; updatedAt: string;
}
interface AuditTemplateCategory {
  id: string; templateId: string; code: string; name: string;
  sequence: number; isRequired: boolean; questions: AuditTemplateQuestion[];
}
interface AuditTemplateQuestion {
  id: string; categoryId: string; code: string; question: string;
  responseType: string; isRequired: boolean; weight: number;
  sequence: number; helpText: string; maxScore: number; allowNa: boolean;
}

const AUDIT_TYPE_OPTIONS = [
  { value: "FIVE_S", label: "5S" },
  { value: "SAFETY", label: "Safety" },
  { value: "QUALITY", label: "Quality" },
  { value: "PROCESS_CHECK", label: "Process Check" },
  { value: "STANDARD_WORK_CHECK", label: "Standard Work Check" },
  { value: "TPM_EQUIPMENT_CHECK", label: "TPM / Equipment Check" },
  { value: "KANBAN_PULL_CHECK", label: "Kanban / Pull System Check" },
];
const MODULE_SCOPE_OPTIONS = [
  { value: "PRODUCTION_CONTROL", label: "Production Control" },
  { value: "QUALITY_CONTROL", label: "Quality Control" },
  { value: "SAFETY_CONTROL", label: "Safety Control" },
  { value: "MATERIAL_CONTROL", label: "Material Control" },
];
const RESPONSE_TYPE_OPTIONS = [
  { value: "PASS_FAIL_NA", label: "Pass / Fail / N/A" },
  { value: "YES_NO_NA", label: "Yes / No / N/A" },
  { value: "SCORE_1_5", label: "Score 1-5" },
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
];
const TARGET_TYPE_OPTIONS = [
  { value: "PLANT", label: "Plant" },
  { value: "PRODUCTION_LINE", label: "Production Line" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "RESOURCE_GROUP", label: "Resource Group" },
  { value: "RESOURCE", label: "Resource" },
];

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/30 bg-card p-8 text-center text-xs text-muted-foreground shadow-sm">
      <Icon className="mb-2 h-8 w-8 stroke-current opacity-40" />
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-success/10 text-success",
    DRAFT: "bg-info/10 text-info",
    ARCHIVED: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${colors[status] || "bg-muted text-muted-foreground"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "ACTIVE" ? "bg-success" : status === "DRAFT" ? "bg-info" : "bg-muted-foreground"}`} />
      {status || "UNKNOWN"}
    </span>
  );
}

export function AuditTemplateManagerPage() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ code: "", name: "", auditType: "FIVE_S", moduleScope: "PRODUCTION_CONTROL", targetTypes: ["PRODUCTION_LINE"] as string[] });
  const [editMetaForm, setEditMetaForm] = useState<{ name: string; moduleScope: string; targetTypes: string[] } | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState({ code: "", name: "", sequence: 0, isRequired: true });
  const [editingSection, setEditingSection] = useState<AuditTemplateCategory | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({ code: "", question: "", responseType: "PASS_FAIL_NA", isRequired: true, weight: 1, sequence: 0, helpText: "" });
  const [editingQuestion, setEditingQuestion] = useState<AuditTemplateQuestion | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const location = useLocation();

  // Determine module scope filter from URL path
  const moduleFilter = (() => {
    const path = location.pathname;
    if (path.includes("/production-control")) return "PRODUCTION_CONTROL";
    if (path.includes("/quality")) return "QUALITY_CONTROL";
    if (path.includes("/safety")) return "SAFETY_CONTROL";
    if (path.includes("/material")) return "MATERIAL_CONTROL";
    return null;
  })();

  const pageTitle = moduleFilter
    ? `${MODULE_SCOPE_OPTIONS.find((o) => o.value === moduleFilter)?.label || ""} Audit Templates`
    : "Audit Templates";
  const pageSubtitle = moduleFilter
    ? `Managing templates for ${MODULE_SCOPE_OPTIONS.find((o) => o.value === moduleFilter)?.label || ""}.`
    : "Create, edit, and manage audit templates used across Control modules.";

  const { data: templatesData, loading: templatesLoading, refetch: refetchTemplates } = useQuery<{ auditTemplates: AuditTemplate[] }>(AUDIT_TEMPLATES_QUERY, { fetchPolicy: "cache-and-network", errorPolicy: "all" });

  const templates = templatesData?.auditTemplates ?? [];
  const selectedTemplate = templates.find((t) => t.id === selectedId);
  const filteredTemplates = (moduleFilter
    ? templates.filter((t) => t.moduleScope === moduleFilter)
    : templates
  ).filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()));

  const [createTemplate] = useMutation<any>(CREATE_AUDIT_TEMPLATE_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [updateTemplate] = useMutation<any>(UPDATE_AUDIT_TEMPLATE_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [activateTemplate] = useMutation<any>(ACTIVATE_AUDIT_TEMPLATE_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [archiveTemplate] = useMutation<any>(ARCHIVE_AUDIT_TEMPLATE_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [cloneTemplate] = useMutation<any>(CLONE_AUDIT_TEMPLATE_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [addCategory] = useMutation<any>(ADD_AUDIT_TEMPLATE_CATEGORY_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [updateCategory] = useMutation<any>(UPDATE_AUDIT_TEMPLATE_CATEGORY_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [removeCategory] = useMutation<any>(REMOVE_AUDIT_TEMPLATE_CATEGORY_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [addQuestion] = useMutation<any>(ADD_AUDIT_TEMPLATE_QUESTION_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [updateQuestion] = useMutation<any>(UPDATE_AUDIT_TEMPLATE_QUESTION_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [removeQuestion] = useMutation<any>(REMOVE_AUDIT_TEMPLATE_QUESTION_MUTATION, { refetchQueries: [AUDIT_TEMPLATES_QUERY] });
  const [installTemplatesPC] = useMutation<any>(INSTALL_DEFAULT_PC_TEMPLATES_MUTATION);
  const [installTemplatesQC] = useMutation<any>(INSTALL_DEFAULT_QC_TEMPLATES_MUTATION);
  const [installTemplatesSafety] = useMutation<any>(INSTALL_DEFAULT_SAFETY_TEMPLATES_MUTATION);
  const [installTemplatesMaterial] = useMutation<any>(INSTALL_DEFAULT_MATERIAL_TEMPLATES_MUTATION);

  const btnClass = "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";
  const inputClass = "h-7 w-full rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-colors";
  const selectClass = "h-7 w-full rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30";

  const handleCreate = async () => {
    if (!createForm.code.trim() || !createForm.name.trim()) { setStatusMessage("Code and name are required."); return; }
    setSaving(true);
    try {
      const { data: result } = await createTemplate({ variables: { input: { code: createForm.code.trim(), name: createForm.name.trim(), auditType: createForm.auditType, moduleScope: createForm.moduleScope, targetTypes: createForm.targetTypes } } });
      if (result?.createAuditTemplate?.errors?.length) { setStatusMessage(result.createAuditTemplate.errors.map((e: { message: string }) => e.message).join(", ")); setSaving(false); return; }
      setStatusMessage("Template created.");
      setShowCreateForm(false);
      setCreateForm({ code: "", name: "", auditType: "FIVE_S", moduleScope: "PRODUCTION_CONTROL", targetTypes: ["PRODUCTION_LINE"] });
      setSaving(false);
    } catch (err) { setStatusMessage(err instanceof Error ? err.message : "Save failed."); setSaving(false); }
  };

  const handleUpdateMeta = async () => {
    if (!selectedId || !editMetaForm) return;
    setSaving(true);
    try {
      const { data: result } = await updateTemplate({ variables: { id: selectedId, input: { name: editMetaForm.name, moduleScope: editMetaForm.moduleScope, targetTypes: editMetaForm.targetTypes } } });
      if (result?.updateAuditTemplate?.errors?.length) { setStatusMessage(result.updateAuditTemplate.errors.map((e: { message: string }) => e.message).join(", ")); setSaving(false); return; }
      setStatusMessage("Template updated.");
      setEditMetaForm(null);
      setSaving(false);
    } catch (err) { setStatusMessage(err instanceof Error ? err.message : "Save failed."); setSaving(false); }
  };

  const handleActivate = async () => {
    if (!selectedId) return;
    await activateTemplate({ variables: { id: selectedId } });
    setStatusMessage("Template activated.");
  };

  const handleArchive = async () => {
    if (!selectedId) return;
    setConfirmAction({ type: "archive", id: selectedId, label: `Archive "${selectedTemplate?.name}"?` });
  };

  const handleClone = async () => {
    if (!selectedId) return;
    await cloneTemplate({ variables: { id: selectedId } });
    setStatusMessage("Template cloned as new draft version.");
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "archive") {
      await archiveTemplate({ variables: { id: confirmAction.id } });
      setStatusMessage("Template archived.");
      setSelectedId(null);
    } else if (confirmAction.type === "removeSection") {
      await removeCategory({ variables: { id: confirmAction.id } });
      setStatusMessage("Section removed.");
    } else if (confirmAction.type === "removeQuestion") {
      await removeQuestion({ variables: { id: confirmAction.id } });
      setStatusMessage("Question removed.");
    }
    setConfirmAction(null);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.code.trim() || !sectionForm.name.trim()) { setStatusMessage("Code and name are required."); return; }
    setSaving(true);
    try {
      if (editingSection) {
        const { data: result } = await updateCategory({ variables: { id: editingSection.id, input: { code: sectionForm.code.trim(), name: sectionForm.name.trim(), sequence: sectionForm.sequence, isRequired: sectionForm.isRequired } } });
        if (result?.updateAuditTemplateCategory?.errors?.length) { setStatusMessage(result.updateAuditTemplateCategory.errors.map((e: { message: string }) => e.message).join(", ")); setSaving(false); return; }
        setStatusMessage("Section updated.");
      } else if (selectedId) {
        const { data: result } = await addCategory({ variables: { templateId: selectedId, input: { code: sectionForm.code.trim(), name: sectionForm.name.trim(), sequence: sectionForm.sequence, isRequired: sectionForm.isRequired } } });
        if (result?.addAuditTemplateCategory?.errors?.length) { setStatusMessage(result.addAuditTemplateCategory.errors.map((e: { message: string }) => e.message).join(", ")); setSaving(false); return; }
        setStatusMessage("Section added.");
      }
      setShowSectionForm(false);
      setEditingSection(null);
      setSectionForm({ code: "", name: "", sequence: 0, isRequired: true });
      setSaving(false);
    } catch (err) { setStatusMessage(err instanceof Error ? err.message : "Save failed."); setSaving(false); }
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.code.trim() || !questionForm.question.trim()) { setStatusMessage("Code and question are required."); return; }
    setSaving(true);
    try {
      if (editingQuestion) {
        const { data: result } = await updateQuestion({ variables: { id: editingQuestion.id, input: { code: questionForm.code.trim(), question: questionForm.question.trim(), responseType: questionForm.responseType, isRequired: questionForm.isRequired, weight: questionForm.weight, sequence: questionForm.sequence, helpText: questionForm.helpText } } });
        if (result?.updateAuditTemplateQuestion?.errors?.length) { setStatusMessage(result.updateAuditTemplateQuestion.errors.map((e: { message: string }) => e.message).join(", ")); setSaving(false); return; }
        setStatusMessage("Question updated.");
      } else if (selectedCategoryId) {
        const { data: result } = await addQuestion({ variables: { categoryId: selectedCategoryId, input: { code: questionForm.code.trim(), question: questionForm.question.trim(), responseType: questionForm.responseType, isRequired: questionForm.isRequired, weight: questionForm.weight, sequence: questionForm.sequence, helpText: questionForm.helpText } } });
        if (result?.addAuditTemplateQuestion?.errors?.length) { setStatusMessage(result.addAuditTemplateQuestion.errors.map((e: { message: string }) => e.message).join(", ")); setSaving(false); return; }
        setStatusMessage("Question added.");
      }
      setShowQuestionForm(false);
      setEditingQuestion(null);
      setSelectedCategoryId(null);
      setQuestionForm({ code: "", question: "", responseType: "PASS_FAIL_NA", isRequired: true, weight: 1, sequence: 0, helpText: "" });
      setSaving(false);
    } catch (err) { setStatusMessage(err instanceof Error ? err.message : "Save failed."); setSaving(false); }
  };

  const openEditSection = (s: AuditTemplateCategory) => {
    setEditingSection(s);
    setSectionForm({ code: s.code, name: s.name, sequence: s.sequence, isRequired: s.isRequired });
    setShowSectionForm(true);
  };

  const openAddQuestion = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingQuestion(null);
    setQuestionForm({ code: "", question: "", responseType: "PASS_FAIL_NA", isRequired: true, weight: 1, sequence: 0, helpText: "" });
    setShowQuestionForm(true);
  };

  const openEditQuestion = (q: AuditTemplateQuestion) => {
    setEditingQuestion(q);
    setSelectedCategoryId(q.categoryId);
    setQuestionForm({ code: q.code, question: q.question, responseType: q.responseType, isRequired: q.isRequired, weight: q.weight, sequence: q.sequence, helpText: q.helpText });
    setShowQuestionForm(true);
  };

  const statusMsg = statusMessage ? (
    <div className={`flex items-center gap-2 rounded border px-3 py-1.5 text-[10px] ${statusMessage.includes("fail") || statusMessage.includes("Error") || statusMessage.includes("required") ? "border-danger/20 bg-danger/10 text-danger" : "border-info/20 bg-info/10 text-info"}`}>
      <Info className="h-3.5 w-3.5 shrink-0 stroke-current" />
      <span className="flex-1">{statusMessage}</span>
      <button onClick={() => setStatusMessage(null)}><X className="h-3 w-3" /></button>
    </div>
  ) : null;

  const confirmBanner = confirmAction ? (
    <div className="flex items-center gap-2 rounded border border-warning/20 bg-warning/10 px-3 py-2 text-[10px] text-warning">
      <TriangleAlert className="h-4 w-4 shrink-0 stroke-current" />
      <span className="flex-1">{confirmAction.label}</span>
      <button type="button" onClick={executeConfirm} className="inline-flex h-6 items-center rounded bg-warning px-2 text-[10px] font-semibold text-warning-foreground">Confirm</button>
      <button type="button" onClick={() => setConfirmAction(null)} className="inline-flex h-6 items-center rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground">Cancel</button>
    </div>
  ) : null;

  return (
    <AppPageLayout
      icon={<ClipboardCheck />}
      iconClass={theme.iconBoxBrand}
      title={pageTitle}
      subtitle={pageSubtitle}
    >
      <div className="flex h-full gap-2 p-2 overflow-hidden">
        {/* Left: Template list */}
        <div className="flex w-72 shrink-0 flex-col gap-1.5 overflow-hidden rounded-lg border border-border/10 bg-card">
          <div className="flex items-center gap-1 border-b border-border/10 px-2 py-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="h-6 w-full rounded border border-input bg-card pl-6 pr-1.5 text-[10px] outline-none focus:border-ring" />
            </div>
            <button type="button" onClick={() => refetchTemplates()} className={btnClass} disabled={templatesLoading}><RefreshCw className={`h-3 w-3 ${templatesLoading ? "animate-spin" : ""}`} /></button>
          </div>
          <div className="flex items-center gap-1 px-2 pb-1">
            <button type="button" onClick={() => { setShowCreateForm(!showCreateForm); setCreateForm({ code: "", name: "", auditType: "FIVE_S", moduleScope: "PRODUCTION_CONTROL", targetTypes: ["PRODUCTION_LINE"] }); }}
              className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-3 w-3" /> New</button>
            <button type="button" onClick={async () => {
              setSaving(true);
              try {
                await installTemplatesPC();
                await installTemplatesQC();
                await installTemplatesSafety();
                await installTemplatesMaterial();
                setStatusMessage("Default templates installed for all modules.");
              } catch (err) {
                setStatusMessage(err instanceof Error ? err.message : "Install failed.");
              } finally {
                await refetchTemplates();
                setSaving(false);
              }
            }}
              className={btnClass} disabled={saving} title="Install default templates for all modules"><Copy className="h-3 w-3" /> Defaults</button>
          </div>

          {showCreateForm && (
            <div className="mx-2 mb-1 rounded border border-border/10 bg-muted/30 p-2">
              <div className="space-y-1.5">
                <input type="text" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} placeholder="Code (e.g. PC_MY_AUDIT)" className={inputClass} />
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Name" className={inputClass} />
                <select value={createForm.auditType} onChange={(e) => setCreateForm({ ...createForm, auditType: e.target.value })} className={selectClass}>
                  {AUDIT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={createForm.moduleScope} onChange={(e) => setCreateForm({ ...createForm, moduleScope: e.target.value })} className={selectClass}>
                  {MODULE_SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex flex-wrap gap-1">
                  {TARGET_TYPE_OPTIONS.map((o) => (
                    <label key={o.value} className="flex cursor-pointer items-center gap-1 text-[9px] text-muted-foreground">
                      <input type="checkbox" checked={createForm.targetTypes.includes(o.value)} onChange={(e) => {
                        setCreateForm({ ...createForm, targetTypes: e.target.checked ? [...createForm.targetTypes, o.value] : createForm.targetTypes.filter((t) => t !== o.value) });
                      }} className="h-3 w-3 accent-primary" />{o.label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={handleCreate} disabled={saving} className="inline-flex h-6 flex-1 items-center justify-center gap-1 rounded bg-primary text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Create</button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="inline-flex h-6 items-center gap-1 rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground"><X className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {templatesLoading && !templatesData && <EmptyState icon={ClipboardCheck} message="Loading templates..." />}
            {!templatesLoading && filteredTemplates.length === 0 && <EmptyState icon={ClipboardCheck} message="No audit templates found." />}
            {filteredTemplates.map((t) => (
              <button key={t.id} type="button" onClick={() => setSelectedId(t.id)}
                className={`mb-1 w-full rounded border p-2 text-left transition-colors ${selectedId === t.id ? "border-primary/30 bg-primary/5" : "border-transparent bg-card hover:bg-muted/40"}`}>
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 truncate text-[11px] font-semibold text-foreground">{t.name}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                  <span className="font-mono">{t.code}</span>
                  <span>v{t.version}</span>
                  {t.isDefault && <span className="rounded bg-muted px-1 text-[8px]">default</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Detail / Edit */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border/10 bg-card p-3">
          {!selectedTemplate && (
            <div className="flex h-full items-center justify-center">
              <p className="text-[11px] text-muted-foreground">Select an audit template to view and edit.</p>
            </div>
          )}
          {selectedTemplate && (
            <div className="space-y-3">
              {statusMsg}
              {confirmBanner}

              {/* Template Metadata */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">{selectedTemplate.name}</h2>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">{selectedTemplate.code}</span>
                    <span>v{selectedTemplate.version}</span>
                    <StatusBadge status={selectedTemplate.status} />
                    {selectedTemplate.isDefault && <span className="rounded bg-muted px-1 text-[9px]">System Default</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
                    <span className="rounded bg-muted/50 px-1.5 py-0.5">{selectedTemplate.auditType}</span>
                    <span className="rounded bg-muted/50 px-1.5 py-0.5">{selectedTemplate.moduleScope}</span>
                    {(selectedTemplate.targetTypes || []).map((tt: string) => (
                      <span key={tt} className="rounded bg-muted/50 px-1.5 py-0.5">{tt}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedTemplate.status !== "ACTIVE" && (
                    <button type="button" onClick={handleActivate} className={btnClass}><Eye className="h-3.5 w-3.5" /> Activate</button>
                  )}
                  {selectedTemplate.status !== "ARCHIVED" && (
                    <button type="button" onClick={handleArchive} className={btnClass}><Archive className="h-3.5 w-3.5" /> Archive</button>
                  )}
                  <button type="button" onClick={handleClone} className={btnClass}><Copy className="h-3.5 w-3.5" /> Clone</button>
                  <button type="button" onClick={() => {
                    setEditMetaForm(editMetaForm ? null : { name: selectedTemplate.name, moduleScope: selectedTemplate.moduleScope, targetTypes: selectedTemplate.targetTypes || [] });
                  }} className={btnClass}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </div>

              {/* Edit Template Metadata Form */}
              {editMetaForm && (
                <div className="rounded-lg border border-border/10 bg-muted/30 p-3">
                  <h3 className="mb-2 text-[11px] font-bold text-foreground">Edit Template Metadata</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Name</label>
                      <input type="text" value={editMetaForm.name} onChange={(e) => setEditMetaForm({ ...editMetaForm, name: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Module Scope</label>
                      <select value={editMetaForm.moduleScope} onChange={(e) => setEditMetaForm({ ...editMetaForm, moduleScope: e.target.value })} className={selectClass}>
                        {MODULE_SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-1">
                      <button type="button" onClick={handleUpdateMeta} disabled={saving}
                        className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save</button>
                      <button type="button" onClick={() => setEditMetaForm(null)} className="inline-flex h-7 items-center gap-1 rounded bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground"><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Target Types</label>
                    <div className="flex flex-wrap gap-2">
                      {TARGET_TYPE_OPTIONS.map((o) => (
                        <label key={o.value} className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
                          <input type="checkbox" checked={editMetaForm.targetTypes.includes(o.value)} onChange={(e) => {
                            setEditMetaForm({ ...editMetaForm, targetTypes: e.target.checked ? [...editMetaForm.targetTypes, o.value] : editMetaForm.targetTypes.filter((t) => t !== o.value) });
                          }} className="h-3.5 w-3.5 accent-primary" />{o.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sections (Categories) */}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-[11px] font-bold text-foreground">Sections</h3>
                  <button type="button" onClick={() => { setShowSectionForm(!showSectionForm); setEditingSection(null); setSectionForm({ code: "", name: "", sequence: 0, isRequired: true }); }}
                    className="inline-flex h-6 items-center gap-1 rounded bg-primary px-1.5 text-[9px] font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-3 w-3" /> Add Section</button>
                </div>

                {showSectionForm && (
                  <div className="mb-2 rounded border border-border/10 bg-muted/30 p-2">
                    <h4 className="mb-1 text-[10px] font-semibold text-foreground">{editingSection ? "Edit Section" : "New Section"}</h4>
                    <div className="grid grid-cols-4 gap-1.5">
                      <input type="text" value={sectionForm.code} onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })} placeholder="Code" className={inputClass} />
                      <input type="text" value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="Name" className={inputClass} />
                      <input type="number" value={sectionForm.sequence} onChange={(e) => setSectionForm({ ...sectionForm, sequence: parseInt(e.target.value) || 0 })} placeholder="Sequence" className={inputClass} />
                      <div className="flex items-end gap-1">
                        <label className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
                          <input type="checkbox" checked={sectionForm.isRequired} onChange={(e) => setSectionForm({ ...sectionForm, isRequired: e.target.checked })} className="h-3.5 w-3.5 accent-primary" /> Required
                        </label>
                        <button type="button" onClick={handleSaveSection} disabled={saving}
                          className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}</button>
                        <button type="button" onClick={() => { setShowSectionForm(false); setEditingSection(null); }} className="inline-flex h-7 items-center gap-1 rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                )}

                {(!selectedTemplate.categories || selectedTemplate.categories.length === 0) && (
                  <p className="text-[10px] text-muted-foreground">No sections defined. Add a section to start building the template.</p>
                )}
                {selectedTemplate.categories && selectedTemplate.categories.map((section) => (
                  <div key={section.id} className="mb-2 rounded-lg border border-border/10">
                    <div className="flex items-center gap-2 border-b border-border/10 bg-muted/20 px-3 py-1.5">
                      <span className="flex-1 text-[11px] font-bold text-foreground">{section.name}</span>
                      <span className="text-[9px] text-muted-foreground">{section.code}</span>
                      <span className="text-[9px] text-muted-foreground">Seq: {section.sequence}</span>
                      <button type="button" onClick={() => openAddQuestion(section.id)} className="rounded p-0.5 text-muted-foreground hover:text-primary" title="Add question"><Plus className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => openEditSection(section)} className="rounded p-0.5 text-muted-foreground hover:text-primary" title="Edit section"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setConfirmAction({ type: "removeSection", id: section.id, label: `Remove section "${section.name}" and its questions?` })} className="rounded p-0.5 text-muted-foreground hover:text-danger" title="Remove section">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {section.questions && section.questions.length > 0 && (
                      <div className="divide-y divide-border/5">
                        {section.questions.map((q) => (
                          <div key={q.id} className="flex items-start gap-2 px-3 py-1.5 hover:bg-muted/20">
                            <span className="mt-0.5 shrink-0 text-[9px] font-mono font-bold text-muted-foreground">Q{q.sequence}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-medium text-foreground">{q.question}</div>
                              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                <span className="rounded bg-muted/40 px-1">{RESPONSE_TYPE_OPTIONS.find((o) => o.value === q.responseType)?.label || q.responseType}</span>
                                {q.isRequired && <span className="text-danger">*</span>}
                                <span>Weight: {q.weight}</span>
                                {q.helpText && <span className="italic">"{q.helpText}"</span>}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-0.5">
                              <button type="button" onClick={() => openEditQuestion(q)} className="rounded p-0.5 text-muted-foreground hover:text-primary" title="Edit question"><Pencil className="h-3 w-3" /></button>
                              <button type="button" onClick={() => setConfirmAction({ type: "removeQuestion", id: q.id, label: `Remove question "${q.question.substring(0, 40)}..."?` })} className="rounded p-0.5 text-muted-foreground hover:text-danger" title="Remove question">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!section.questions || section.questions.length === 0) && (
                      <p className="px-3 py-2 text-[10px] text-muted-foreground">No questions in this section.</p>
                    )}
                  </div>
                ))}

                {/* Question Form (renders below the target section) */}
                {showQuestionForm && (
                  <div className="mb-2 rounded border border-border/10 bg-muted/30 p-2">
                    <h4 className="mb-1 text-[10px] font-semibold text-foreground">{editingQuestion ? "Edit Question" : "New Question"}</h4>
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-6 gap-1.5">
                        <input type="text" value={questionForm.code} onChange={(e) => setQuestionForm({ ...questionForm, code: e.target.value })} placeholder="Code" className={inputClass} />
                        <select value={questionForm.responseType} onChange={(e) => setQuestionForm({ ...questionForm, responseType: e.target.value })} className={`${selectClass} col-span-1`}>
                          {RESPONSE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <input type="number" value={questionForm.weight} onChange={(e) => setQuestionForm({ ...questionForm, weight: parseInt(e.target.value) || 1 })} placeholder="Weight" className={inputClass} />
                        <input type="number" value={questionForm.sequence} onChange={(e) => setQuestionForm({ ...questionForm, sequence: parseInt(e.target.value) || 0 })} placeholder="Seq" className={inputClass} />
                        <label className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
                          <input type="checkbox" checked={questionForm.isRequired} onChange={(e) => setQuestionForm({ ...questionForm, isRequired: e.target.checked })} className="h-3.5 w-3.5 accent-primary" /> Required
                        </label>
                        <div className="flex items-end gap-1">
                          <button type="button" onClick={handleSaveQuestion} disabled={saving}
                            className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}</button>
                          <button type="button" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); setSelectedCategoryId(null); }} className="inline-flex h-7 items-center gap-1 rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground"><X className="h-3 w-3" /></button>
                        </div>
                      </div>
                      <input type="text" value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} placeholder="Question text" className={inputClass} />
                      <input type="text" value={questionForm.helpText} onChange={(e) => setQuestionForm({ ...questionForm, helpText: e.target.value })} placeholder="Help text (optional)" className={inputClass} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppPageLayout>
  );
}
