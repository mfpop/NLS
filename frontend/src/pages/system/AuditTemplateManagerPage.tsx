import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardCheck, Plus, RefreshCw, Archive, Copy, Eye,
  Check, Loader2, TriangleAlert, Pencil, Trash2, X,
} from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { RecordListPanel } from "@/components/shared/RecordListPanel";
import { PageToolbar, ToolbarButton, ToolbarDropdown } from "@/components/layout/PageToolbar";
import { LEFT_COLUMN_WIDTH_CLASS } from "@/components/layout/layoutWidths";
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

const inputClass = "h-8 w-full rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors";
const selectClass = "h-8 w-full rounded-[2px] border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-success/15 text-success border-success/20",
    DRAFT: "bg-primary/15 text-primary border-primary/20",
    ARCHIVED: "bg-muted text-muted-foreground border-border/40",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${colors[status] || "bg-muted text-muted-foreground border-border/40"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "ACTIVE" ? "bg-success" : status === "DRAFT" ? "bg-primary" : "bg-muted-foreground/40"}`} />
      {status || "UNKNOWN"}
    </span>
  );
}
function ConfirmBanner({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-warning/20 bg-warning/10 px-3 py-2 text-[10px] text-warning">
      <TriangleAlert className="h-4 w-4 shrink-0 stroke-current" />
      <span className="flex-1">{label}</span>
      <button type="button" onClick={onConfirm} className="inline-flex h-6 items-center rounded bg-warning px-2 text-[10px] font-semibold text-warning-foreground">Confirm</button>
      <button type="button" onClick={onCancel} className="inline-flex h-6 items-center rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground">Cancel</button>
    </div>
  );
}

export function AuditTemplateManagerPage() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageMode, setPageMode] = useState<"view" | "edit" | "create">("view");
  const [createForm, setCreateForm] = useState({ code: "", name: "", auditType: "FIVE_S", moduleScope: "PRODUCTION_CONTROL", targetTypes: ["PRODUCTION_LINE"] as string[] });
  const [editForm, setEditForm] = useState<{ name: string; moduleScope: string; targetTypes: string[] } | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState({ code: "", name: "", sequence: 0, isRequired: true });
  const [editingSection, setEditingSection] = useState<AuditTemplateCategory | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({ code: "", question: "", responseType: "PASS_FAIL_NA", isRequired: true, weight: 1, sequence: 0, helpText: "" });
  const [editingQuestion, setEditingQuestion] = useState<AuditTemplateQuestion | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [installing, setInstalling] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

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

  const handleCreate = async () => {
    if (!createForm.code.trim() || !createForm.name.trim()) { setStatusMessage("Code and name are required."); return; }
    setSaving(true);
    try {
      const { data: result } = await createTemplate({ variables: { input: { code: createForm.code.trim(), name: createForm.name.trim(), auditType: createForm.auditType, moduleScope: createForm.moduleScope, targetTypes: createForm.targetTypes } } });
      if (result?.createAuditTemplate?.errors?.length) { setStatusMessage(result.createAuditTemplate.errors.map((e: { message: string }) => e.message).join(", ")); setSaving(false); return; }
      setStatusMessage("Template created.");
      setPageMode("view");
      setCreateForm({ code: "", name: "", auditType: "FIVE_S", moduleScope: "PRODUCTION_CONTROL", targetTypes: ["PRODUCTION_LINE"] });
      setSaving(false);
    } catch (err) { setStatusMessage(err instanceof Error ? err.message : "Save failed."); setSaving(false); }
  };

  const handleUpdateMeta = async () => {
    if (!selectedId || !editForm) return;
    setSaving(true);
    try {
      const { data: result } = await updateTemplate({ variables: { id: selectedId, input: { name: editForm.name, moduleScope: editForm.moduleScope, targetTypes: editForm.targetTypes } } });
      if (result?.updateAuditTemplate?.errors?.length) { setStatusMessage(result.updateAuditTemplate.errors.map((e: { message: string }) => e.message).join(", ")); setSaving(false); return; }
      setStatusMessage("Template updated.");
      setPageMode("view");
      setEditForm(null);
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
    const res = await cloneTemplate({ variables: { id: selectedId } });
    const newId = res?.data?.cloneAuditTemplate?.auditTemplate?.id || res?.data?.cloneAuditTemplate?.id;
    if (newId) setSelectedId(newId);
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

  const handleInstallDefaults = async () => {
    setInstalling(true);
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
      setInstalling(false);
    }
  };

  return (
    <AppPageLayout
      icon={<ClipboardCheck />}          iconClass="bg-accent/15 text-accent-foreground"
      title={pageTitle}
      subtitle={pageSubtitle}
      toolbar={
        <PageToolbar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); if (pageMode === "create") setPageMode("view"); }}
          searchPlaceholder="Search templates..."
          leftWidthClass={LEFT_COLUMN_WIDTH_CLASS}
          filters={
            <ToolbarDropdown
              value={moduleFilter || ""}
              onChange={(val) => {
                const target = val === "PRODUCTION_CONTROL" ? "/system/audit-templates/production-control"
                  : val === "QUALITY_CONTROL" ? "/system/audit-templates/quality"
                  : val === "SAFETY_CONTROL" ? "/system/audit-templates/safety"
                  : val === "MATERIAL_CONTROL" ? "/system/audit-templates/material"
                  : "/system/audit-templates";
                navigate(target);
              }}
              options={[{ value: "", label: "All modules" }, ...MODULE_SCOPE_OPTIONS]}
              placeholder="All modules"
            />
          }
          actions={
            pageMode === "edit" || pageMode === "create" ? (
              <>
                <ToolbarButton icon={Check} label={saving ? "Saving..." : "Save Template"} onClick={pageMode === "create" ? handleCreate : handleUpdateMeta} disabled={saving} variant="edit" />
                <ToolbarButton icon={X} label="Cancel" onClick={() => { setPageMode("view"); setEditForm(null); setCreateForm({ code: "", name: "", auditType: "FIVE_S", moduleScope: "PRODUCTION_CONTROL", targetTypes: ["PRODUCTION_LINE"] }); }} variant="danger" />
                <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetchTemplates()} disabled={templatesLoading} variant="neutral" />
              </>
            ) : (
              <>
                <ToolbarButton icon={Plus} label="New Template" onClick={() => { setPageMode("create"); setSelectedId(null); setCreateForm({ code: "", name: "", auditType: "FIVE_S", moduleScope: moduleFilter || "PRODUCTION_CONTROL", targetTypes: ["PRODUCTION_LINE"] }); }} variant="create" />
                <ToolbarButton icon={Copy} label="Defaults" onClick={handleInstallDefaults} disabled={installing} variant="neutral" title="Install default templates for all modules" />
                <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => refetchTemplates()} disabled={templatesLoading} variant="neutral" />
              </>
            )
          }
        />
      }
      leftColumn={
        <RecordListPanel
          title="Audit Templates"
          records={filteredTemplates}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setPageMode("view"); setEditForm(null); }}
          getId={(t) => t.id}
          renderRecord={(t, _selected) => (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="flex-1 truncate text-sm font-semibold text-foreground">{t.name}</span>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-mono">{t.code}</span>
                <span>v{t.version}</span>
                {t.isDefault && <span className="rounded bg-muted px-1 text-[8px] text-muted-foreground">default</span>}
              </div>
            </div>
          )}
          emptyMessage="No audit templates found."
          pageSize={100}
          className="border-r-0 bg-transparent"
          selectedBorderClass="border-l-violet-600"
          selectedBgClass="bg-violet-50/40"
        />
      }
      footer={
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          {statusMessage ? (
            <span className={/fail|error|required/i.test(statusMessage) ? "text-danger font-medium" : "text-success font-medium"}>{statusMessage}</span>
          ) : pageMode === "create" ? (
            <span className="text-primary font-medium">Creating template</span>
          ) : selectedTemplate ? (
            <span>Editing: <span className="font-semibold text-muted-foreground">{selectedTemplate.name}</span> <span className="font-mono text-[10px]">{selectedTemplate.code}</span></span>
          ) : (
            <span>{filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}</span>
          )}
        </span>
      }
    >      <div className="flex flex-1 flex-col overflow-hidden bg-muted">
        {confirmAction && (
          <ConfirmBanner
            label={confirmAction.label}
            onConfirm={executeConfirm}
            onCancel={() => setConfirmAction(null)}
          />
        )}

        {/* ── Create Mode ── */}
        {pageMode === "create" && (
          <div className="h-full overflow-y-auto bg-muted">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">New Audit Template</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Fill in the details to create a new audit template.</p>
            </div>
            <div className="grid grid-cols-5 gap-2 max-w-2xl p-3">
              <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">Code</label><input type="text" value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} placeholder="e.g. PC_MY_AUDIT" className={inputClass} /></div>
              <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">Name</label><input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Template name" className={inputClass} /></div>
              <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">Audit Type</label><select value={createForm.auditType} onChange={(e) => setCreateForm({ ...createForm, auditType: e.target.value })} className={selectClass}>{AUDIT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div><label className="block text-[11px] font-medium text-muted-foreground mb-1">Module</label><select value={createForm.moduleScope} onChange={(e) => setCreateForm({ ...createForm, moduleScope: e.target.value })} className={selectClass}>{MODULE_SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="flex items-end">
                <div className="flex flex-wrap gap-1.5">
                  {TARGET_TYPE_OPTIONS.map((o) => (
                    <label key={o.value} className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
                      <input type="checkbox" checked={createForm.targetTypes.includes(o.value)} onChange={(e) => { setCreateForm({ ...createForm, targetTypes: e.target.checked ? [...createForm.targetTypes, o.value] : createForm.targetTypes.filter((t) => t !== o.value) }); }} className="h-3.5 w-3.5" />{o.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {pageMode === "view" && !selectedTemplate && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-xs text-muted-foreground/60">Select an audit template from the left panel to view and edit.</p>
          </div>
        )}

        {/* ── Edit Mode (compact editor) ── */}
        {pageMode === "edit" && selectedTemplate && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Summary strip */}
            <div className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">{selectedTemplate.name}</h2>
                <StatusBadge status={selectedTemplate.status} />
                {selectedTemplate.isDefault && <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Default</span>}
                <span className="text-[11px] text-muted-foreground">{selectedTemplate.categories?.length || 0} section{(selectedTemplate.categories?.length || 0) !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Grid editor */}
            <div className="grid flex-1 min-h-0 grid-cols-[280px_1fr] divide-x divide-border overflow-hidden">
              {/* Left: Template Setup */}
              <div className="overflow-y-auto bg-muted px-3 py-2 space-y-3">
                <div className="grid grid-cols-[90px_1fr] items-center min-h-9 gap-2 px-3">
                  <span className="text-[11px] font-medium text-muted-foreground">Name</span>
                  <input type="text" value={editForm?.name ?? selectedTemplate.name} onChange={(e) => setEditForm((prev) => prev ? { ...prev, name: e.target.value } : null)} className={inputClass} />
                </div>
                <div className="grid grid-cols-[90px_1fr] items-center min-h-9 gap-2 px-3">
                  <span className="text-[11px] font-medium text-muted-foreground">Code</span>
                  <input type="text" defaultValue={selectedTemplate.code} className={inputClass} readOnly />
                </div>
                <div className="grid grid-cols-[90px_1fr] items-center min-h-9 gap-2 px-3">
                  <span className="text-[11px] font-medium text-muted-foreground">Audit Type</span>
                  <select defaultValue={selectedTemplate.auditType} className={`${selectClass} opacity-60 cursor-not-allowed`} disabled>
                    {AUDIT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-[90px_1fr] items-center min-h-9 gap-2 px-3">
                  <span className="text-[11px] font-medium text-muted-foreground">Module</span>
                  <select value={editForm?.moduleScope ?? selectedTemplate.moduleScope} onChange={(e) => setEditForm((prev) => prev ? { ...prev, moduleScope: e.target.value } : null)} className={selectClass}>
                    {MODULE_SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-[90px_1fr] items-center min-h-9 gap-2 px-3">
                  <span className="text-[11px] font-medium text-muted-foreground">Targets</span>
                  <div className="flex flex-wrap gap-1.5">
                    {TARGET_TYPE_OPTIONS.map((o) => (
                      <label key={o.value} className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
                        <input type="checkbox" checked={(editForm?.targetTypes ?? selectedTemplate.targetTypes ?? []).includes(o.value)} onChange={(e) => setEditForm((prev) => prev ? { ...prev, targetTypes: e.target.checked ? [...prev.targetTypes, o.value] : prev.targetTypes.filter((t) => t !== o.value) } : null)} className="h-3.5 w-3.5" />{o.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Sections & Questions */}
              <div className="overflow-y-auto bg-muted">
                {/* Sections */}
                {(!selectedTemplate.categories || selectedTemplate.categories.length === 0) && (
                  <p className="px-3 py-2 text-[10px] text-muted-foreground/60">No sections defined.</p>
                )}
                {selectedTemplate.categories && selectedTemplate.categories.map((section) => (
                  <div key={section.id}>
                    {/* Section header */}
                    <div className="h-9 border-b border-border bg-muted px-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">{section.name}</span>
                        <span className="text-[10px] text-muted-foreground/60">Seq: {section.sequence}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => openAddQuestion(section.id)} className="rounded p-1 text-muted-foreground/60 hover:text-primary hover:bg-primary/10" title="Add question"><Plus className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => openEditSection(section)} className="rounded p-1 text-muted-foreground/60 hover:text-primary hover:bg-primary/10" title="Edit section"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setConfirmAction({ type: "removeSection", id: section.id, label: `Remove section "${section.name}" and its questions?` })} className="rounded p-1 text-muted-foreground/60 hover:text-danger hover:bg-danger/10" title="Remove section">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Questions */}
                    {section.questions && section.questions.length > 0 && (
                      <div className="divide-y divide-border/50">
                        {section.questions.map((q) => (
                          <div key={q.id} className="grid grid-cols-[48px_minmax(280px,1fr)_120px_90px_96px] items-center min-h-9 border-b border-border/50 px-3 hover:bg-muted/60">
                            <span className="text-[10px] font-mono font-medium text-muted-foreground/60">Q{q.sequence}</span>
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-foreground">{q.question}</span>
                              {q.helpText && <p className="text-xs text-muted-foreground truncate">{q.helpText}</p>}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{RESPONSE_TYPE_OPTIONS.find((o) => o.value === q.responseType)?.label || q.responseType}</span>
                            <span className="text-[10px] text-muted-foreground">{q.weight}</span>
                            <div className="flex items-center gap-0.5 justify-end">
                              <button type="button" onClick={() => openEditQuestion(q)} className="rounded p-1 text-muted-foreground/60 hover:text-primary hover:bg-primary/10" title="Edit question"><Pencil className="h-3 w-3" /></button>
                              <button type="button" onClick={() => setConfirmAction({ type: "removeQuestion", id: q.id, label: `Remove question "${q.question.substring(0, 40)}..."?` })} className="rounded p-1 text-muted-foreground/60 hover:text-danger hover:bg-danger/10" title="Remove question">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Section Form */}
                {showSectionForm && (
                  <div className="border-b border-border bg-muted p-2">
                    <h4 className="mb-1 text-[10px] font-semibold text-muted-foreground">{editingSection ? "Edit Section" : "New Section"}</h4>
                    <div className="flex flex-wrap gap-1.5 max-w-lg">
                      <input type="text" value={sectionForm.code} onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })} placeholder="Code" className={`${inputClass} w-32`} />
                      <input type="text" value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="Name" className={`${inputClass} w-40`} />
                      <input type="number" value={sectionForm.sequence} onChange={(e) => setSectionForm({ ...sectionForm, sequence: parseInt(e.target.value) || 0 })} placeholder="Seq" className={`${inputClass} w-16`} />
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <input type="checkbox" checked={sectionForm.isRequired} onChange={(e) => setSectionForm({ ...sectionForm, isRequired: e.target.checked })} className="h-3.5 w-3.5" /> Required
                      </label>
                      <button type="button" onClick={handleSaveSection} disabled={saving}
                        className="inline-flex h-8 items-center gap-1 rounded bg-success px-2 text-[10px] font-semibold text-white hover:bg-success/80 disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}</button>
                      <button type="button" onClick={() => { setShowSectionForm(false); setEditingSection(null); }} className="inline-flex h-8 items-center gap-1 rounded border border-border bg-background px-2 text-[10px] font-semibold text-muted-foreground hover:bg-muted"><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                )}

                {/* Question Form */}
                {showQuestionForm && (
                  <div className="border-b border-border bg-muted p-2">
                    <h4 className="mb-1 text-[10px] font-semibold text-muted-foreground">{editingQuestion ? "Edit Question" : "New Question"}</h4>
                    <div className="space-y-1.5 max-w-xl">
                      <input type="text" value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} placeholder="Question text" className={inputClass} />
                      <div className="flex flex-wrap gap-1.5">
                        <input type="text" value={questionForm.code} onChange={(e) => setQuestionForm({ ...questionForm, code: e.target.value })} placeholder="Code" className={`${inputClass} w-28`} />
                        <select value={questionForm.responseType} onChange={(e) => setQuestionForm({ ...questionForm, responseType: e.target.value })} className={`${selectClass} w-40`}>
                          {RESPONSE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <input type="number" value={questionForm.weight} onChange={(e) => setQuestionForm({ ...questionForm, weight: parseInt(e.target.value) || 1 })} placeholder="Weight" className={`${inputClass} w-20`} />
                        <input type="number" value={questionForm.sequence} onChange={(e) => setQuestionForm({ ...questionForm, sequence: parseInt(e.target.value) || 0 })} placeholder="Seq" className={`${inputClass} w-16`} />
                        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <input type="checkbox" checked={questionForm.isRequired} onChange={(e) => setQuestionForm({ ...questionForm, isRequired: e.target.checked })} className="h-3.5 w-3.5" /> Required
                        </label>
                        <button type="button" onClick={handleSaveQuestion} disabled={saving}
                          className="inline-flex h-8 items-center gap-1 rounded bg-success px-2 text-[10px] font-semibold text-white hover:bg-success/80 disabled:opacity-50">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}</button>
                        <button type="button" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); setSelectedCategoryId(null); }} className="inline-flex h-8 items-center gap-1 rounded border border-border bg-background px-2 text-[10px] font-semibold text-muted-foreground hover:bg-muted"><X className="h-3 w-3" /></button>
                      </div>
                      <input type="text" value={questionForm.helpText} onChange={(e) => setQuestionForm({ ...questionForm, helpText: e.target.value })} placeholder="Help text (optional)" className={inputClass} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── View Mode Detail ── */}
        {pageMode === "view" && selectedTemplate && (
          <div className="h-full overflow-y-auto divide-y divide-border/50 bg-muted">
            {/* Template Summary */}
            <div className="px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{selectedTemplate.name}</h2>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{selectedTemplate.code}</span>
                    <span>v{selectedTemplate.version}</span>
                    <StatusBadge status={selectedTemplate.status} />
                    {selectedTemplate.isDefault && <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Default</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedTemplate.status !== "ACTIVE" && (
                    <button type="button" onClick={handleActivate} className="inline-flex h-7 items-center gap-1 rounded border border-success/20 bg-success/10 px-2 text-[10px] font-medium text-success hover:bg-success/15"><Eye className="h-3 w-3" /> Activate</button>
                  )}
                  {selectedTemplate.status !== "ARCHIVED" && (
                    <button type="button" onClick={handleArchive} className="inline-flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-[10px] font-medium text-muted-foreground hover:bg-muted"><Archive className="h-3 w-3" /> Archive</button>
                  )}
                  <button type="button" onClick={handleClone} className="inline-flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-[10px] font-medium text-muted-foreground hover:bg-muted"><Copy className="h-3 w-3" /> Clone</button>
                  <button type="button" onClick={() => { setPageMode("edit"); setEditForm({ name: selectedTemplate.name, moduleScope: selectedTemplate.moduleScope, targetTypes: selectedTemplate.targetTypes || [] }); }} className="inline-flex h-7 items-center gap-1 rounded bg-violet-600 px-2 text-[10px] font-medium text-white hover:bg-violet-700"><Pencil className="h-3 w-3" /> Edit</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{selectedTemplate.auditType}</span>
                <span className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{selectedTemplate.moduleScope}</span>
                {(selectedTemplate.targetTypes || []).map((tt: string) => (
                  <span key={tt} className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{tt}</span>
                ))}
              </div>
            </div>

            {/* Scope / Targets */}
            <div className="px-4 py-2">
              <div className="h-8 border-b border-border bg-muted flex items-center"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Scope / Targets</span></div>
              <div className="flex flex-wrap gap-1.5 py-2">
                <span className="text-[11px] font-medium text-muted-foreground">Control Area:</span>
                <span className="text-xs text-muted-foreground">{selectedTemplate.moduleScope}</span>
                <span className="mx-1 text-muted-foreground/30">|</span>
                <span className="text-[11px] font-medium text-muted-foreground">Targets:</span>
                {(selectedTemplate.targetTypes || []).length > 0 ? (
                  (selectedTemplate.targetTypes || []).map((tt: string) => (
                    <span key={tt} className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{tt}</span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground/60">None</span>
                )}
              </div>
            </div>

            {/* Sections & Questions */}
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sections &amp; Questions</span>
              </div>
              {(!selectedTemplate.categories || selectedTemplate.categories.length === 0) && (
                <p className="text-xs text-muted-foreground/60">No sections defined.</p>
              )}
              {selectedTemplate.categories && selectedTemplate.categories.map((section) => (
                <div key={section.id} className="mb-2 border border-border/50 rounded-sm">
                  <div className="h-8 border-b border-border bg-muted px-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">{section.name}</span>
                      <span className="text-[10px] text-muted-foreground/60">{section.code} · Seq: {section.sequence}{section.isRequired ? ' · Required' : ''}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{section.questions?.length || 0} question{(section.questions?.length || 0) !== 1 ? "s" : ""}</span>
                  </div>
                  {section.questions && section.questions.length > 0 && (
                    <div className="divide-y divide-border/50">
                      {section.questions.map((q, qi) => (
                        <div key={q.id} className="grid grid-cols-[48px_minmax(280px,1fr)_120px_90px] items-center min-h-8 px-3 hover:bg-muted/60">
                          <span className="text-[10px] font-mono font-medium text-muted-foreground/60">Q{q.sequence || qi + 1}</span>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-foreground">{q.question}</span>
                            {q.helpText && <p className="text-xs text-muted-foreground truncate">{q.helpText}</p>}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{RESPONSE_TYPE_OPTIONS.find((o) => o.value === q.responseType)?.label || q.responseType}{q.isRequired ? ' *' : ''}</span>
                          <span className="text-[10px] text-muted-foreground text-right">Weight: {q.weight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Audit Note */}
            <div className="px-4 py-2">
              <div className="h-8 border-b border-border bg-muted flex items-center"><span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Audit Note</span></div>
              <div className="py-2 space-y-1 text-[12px] text-muted-foreground">
                <div>Created: <span className="font-medium text-muted-foreground">{selectedTemplate.createdAt ? new Date(selectedTemplate.createdAt).toLocaleDateString() : '—'}</span></div>
                <div>Updated: <span className="font-medium text-muted-foreground">{selectedTemplate.updatedAt ? new Date(selectedTemplate.updatedAt).toLocaleDateString() : '—'}</span></div>
                <div>Version: <span className="font-medium text-muted-foreground">{selectedTemplate.version}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppPageLayout>
  );
}
