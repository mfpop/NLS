import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Building2, Plus, RefreshCw, Archive, Pencil, Info, Check, X, Loader2, TriangleAlert } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarButton, ToolbarDropdown } from "@/components/layout/PageToolbar";
import { ADMINISTRATIVE_DEPARTMENTS_QUERY, COMPANIES_LIST_QUERY, USERS_LIST_QUERY } from "@/graphql/administrationQueries";
import { CREATE_ADMINISTRATIVE_DEPARTMENT, UPDATE_ADMINISTRATIVE_DEPARTMENT, ARCHIVE_ADMINISTRATIVE_DEPARTMENT } from "@/graphql/administrationMutations";
import { PLANTS_QUERY } from "@/graphql/plantQueries";
import { theme } from "@/styles/themeTokens";
import { formatDateShort } from "@/utils/dateFormat";

interface AdministrativeDepartment {
  id: string; companyId: string; companyName: string;
  plantId?: string | null; plantName?: string | null;
  code: string; name: string; description: string;
  managerId?: string | null; managerName?: string | null;
  isActive: boolean; createdAt: string; updatedAt: string;
}
interface CompanyOption { id: string; code: string; name: string; }
interface PlantOption { id: string; name: string; code: string; companyId: string; }
interface UserOption { id: string; username: string; fullName: string; }

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground shadow-sm">
      <Building2 className="mb-2 h-8 w-8 stroke-current opacity-40" />
      {message}
    </div>
  );
}

export function AdministrativeDepartmentsPage() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ companyId: "", plantId: "", code: "", name: "", description: "", managerId: "" });
  const [selectedCompany, setSelectedCompany] = useState("");
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { data: deptData, loading, error, refetch } = useQuery<{ administrativeDepartments: AdministrativeDepartment[] }>(
    ADMINISTRATIVE_DEPARTMENTS_QUERY,
    { variables: { companyId: selectedCompany || undefined }, fetchPolicy: "cache-and-network", errorPolicy: "all" },
  );
  const { data: companiesData } = useQuery<{ companies: CompanyOption[] }>(COMPANIES_LIST_QUERY);
  const { data: usersData } = useQuery<{ usersList: UserOption[] }>(USERS_LIST_QUERY);
  const { data: plantData } = useQuery<{ plants: PlantOption[] }>(PLANTS_QUERY, {
    variables: { companyId: form.companyId || selectedCompany || undefined },
    skip: !form.companyId && !selectedCompany,
  });

  const [createDept] = useMutation(CREATE_ADMINISTRATIVE_DEPARTMENT, { refetchQueries: [ADMINISTRATIVE_DEPARTMENTS_QUERY] });
  const [updateDept] = useMutation(UPDATE_ADMINISTRATIVE_DEPARTMENT, { refetchQueries: [ADMINISTRATIVE_DEPARTMENTS_QUERY] });
  const [archiveDept] = useMutation(ARCHIVE_ADMINISTRATIVE_DEPARTMENT, { refetchQueries: [ADMINISTRATIVE_DEPARTMENTS_QUERY] });

  const departments = deptData?.administrativeDepartments ?? [];
  const companies = companiesData?.companies ?? [];
  const usersList = usersData?.usersList ?? [];
  const plants = plantData?.plants ?? [];

  const filtered = departments.filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "h-7 w-full rounded border border-input bg-card px-2 text-[11px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-colors";
  const inputErrorClass = "h-7 w-full rounded border border-danger/50 bg-card px-2 text-[11px] text-foreground outline-none focus:border-danger focus:ring-1 focus:ring-danger/30 transition-colors";

  const fieldError = (key: string) => touched[key] && !form[key as keyof typeof form]?.toString().trim();

  const resetForm = useCallback(() => {
    setForm({ companyId: "", plantId: "", code: "", name: "", description: "", managerId: "" });
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
    setTouched({});
  }, []);

  const handleEdit = (dept: AdministrativeDepartment) => {
    setForm({
      companyId: dept.companyId,
      plantId: dept.plantId || "",
      code: dept.code,
      name: dept.name,
      description: dept.description,
      managerId: dept.managerId || "",
    });
    setEditingId(dept.id);
    setShowForm(true);
    setTouched({});
  };

  const handleSave = async () => {
    const missing: string[] = [];
    if (!form.code.trim()) missing.push("code");
    if (!form.name.trim()) missing.push("name");
    if (!form.companyId) missing.push("company");
    setTouched({ code: true, name: true, companyId: true });
    if (missing.length) { setStatusMessage(`Required: ${missing.join(", ")}.`); return; }

    setSaving(true);
    try {
      const vars = { code: form.code.trim(), name: form.name.trim(), description: form.description, companyId: form.companyId, plantId: form.plantId || null, managerId: form.managerId || null };
      const { data: result } = editingId
        ? await updateDept({ variables: { id: editingId, input: vars } })
        : await createDept({ variables: { input: vars } });
      const payload = editingId ? (result as any)?.updateAdministrativeDepartment : (result as any)?.createAdministrativeDepartment;
      if (payload?.errors?.length) {
        setStatusMessage(payload.errors.map((e: { message: string }) => e.message).join(", "));
        setSaving(false);
        return;
      }
      setStatusMessage(editingId ? "Department updated." : "Department created.");
      resetForm();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Save failed.");
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    setConfirmArchive(null);
    try {
      await archiveDept({ variables: { id } });
      setStatusMessage("Department archived.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Archive failed.");
    }
  };

  const fmtDate = (iso: string) => {
    if (!iso) return "-";
    return formatDateShort(iso) || iso;
  };

  return (
    <AppPageLayout
      icon={<Building2 />}
      iconClass={theme.iconBoxBrand}
      title="Administrative Departments"
      subtitle="Manage departments for user organization, responsibility, and access scoping."
      toolbar={
        <PageToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search departments..."
          filters={
            <ToolbarDropdown value={selectedCompany} onChange={setSelectedCompany} options={[{ value: "", label: "All Companies" }, ...companies.map((c) => ({ value: c.id, label: c.name }))]} />
          }
          actions={
            <>
              <ToolbarButton icon={RefreshCw} label={loading ? "Refreshing..." : "Refresh"} onClick={() => refetch()} disabled={loading} />
              <ToolbarButton icon={Plus} label="New Department" onClick={() => { resetForm(); setShowForm(true); }} />
            </>
          }
        />
      }
    >
      <div className="h-full overflow-y-auto p-2">
        {statusMessage && (
          <div className={`mb-2 flex items-center gap-2 rounded border px-3 py-1.5 text-[10px] ${statusMessage.includes("fail") || statusMessage.includes("Required") ? "border-danger/20 bg-danger/10 text-danger" : "border-info/20 bg-info/10 text-info"}`}>
            <Info className="h-3.5 w-3.5 shrink-0 stroke-current" />
            <span className="flex-1">{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="shrink-0"><X className="h-3 w-3" /></button>
          </div>
        )}

        {confirmArchive && (
          <div className="mb-2 flex items-center gap-2 rounded border border-warning/20 bg-warning/10 px-3 py-2 text-[10px] text-warning">
            <TriangleAlert className="h-4 w-4 shrink-0 stroke-current" />
            <span className="flex-1">Archive this department? It will be marked inactive.</span>
            <button type="button" onClick={() => handleArchive(confirmArchive)} className="inline-flex h-6 items-center rounded bg-warning px-2 text-[10px] font-semibold text-warning-foreground hover:bg-warning/90">Archive</button>
            <button type="button" onClick={() => setConfirmArchive(null)} className="inline-flex h-6 items-center rounded bg-muted px-2 text-[10px] font-semibold text-muted-foreground">Cancel</button>
          </div>
        )}

        {showForm && (
          <div className="mb-3 rounded-lg border border-border bg-card p-3 shadow-md">
            <h3 className="mb-2 text-[11px] font-bold text-foreground">{editingId ? "Edit Department" : "New Department"}</h3>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Company <span className="text-danger">*</span></label>
                <select value={form.companyId} onChange={(e) => { setForm({ ...form, companyId: e.target.value, plantId: "" }); setTouched({ ...touched, companyId: true }); }}
                  className={fieldError("companyId") ? inputErrorClass : inputClass}>
                  <option value="">Select company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {fieldError("companyId") && <p className="mt-0.5 text-[9px] text-danger">Required</p>}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Plant</label>
                <select value={form.plantId} onChange={(e) => setForm({ ...form, plantId: e.target.value })}
                  className={inputClass}>
                  <option value="">No plant (optional)</option>
                  {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Code <span className="text-danger">*</span></label>
                <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} onBlur={() => setTouched({ ...touched, code: true })}
                  className={fieldError("code") ? inputErrorClass : inputClass} />
                {fieldError("code") && <p className="mt-0.5 text-[9px] text-danger">Required</p>}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Name <span className="text-danger">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={() => setTouched({ ...touched, name: true })}
                  className={fieldError("name") ? inputErrorClass : inputClass} />
                {fieldError("name") && <p className="mt-0.5 text-[9px] text-danger">Required</p>}
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Manager</label>
                <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                  className={inputClass}>
                  <option value="">No manager</option>
                  {usersList.map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>)}
                </select>
              </div>
              <div className="flex items-end gap-1">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} {saving ? "Saving..." : "Save"}</button>
                <button type="button" onClick={resetForm} disabled={saving}
                  className="inline-flex h-7 items-center gap-1 rounded bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted/80"><X className="h-3 w-3" /> Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading && !deptData && <EmptyState message="Loading departments..." />}
        {error && <div className="rounded border border-danger/25 bg-danger/10 px-3 py-2 text-[10px] text-danger">{error.message}</div>}
        {!loading && !error && filtered.length === 0 && <EmptyState message={search ? "No departments match your search." : "No departments yet. Create one to get started."} />}

        {filtered.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/50 text-left text-[10px] font-semibold text-muted-foreground">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Plant</th>
                  <th className="px-3 py-2">Manager</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dept) => (
                  <tr key={dept.id} className="border-t border-border text-foreground transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-[10px] font-bold">{dept.code}</td>
                    <td className="px-3 py-2 font-semibold">{dept.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{dept.companyName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{dept.plantName || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{dept.managerName || "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${dept.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dept.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                        {dept.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{fmtDate(dept.updatedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-0.5">
                        <button type="button" onClick={() => handleEdit(dept)} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        {dept.isActive && (
                          <button type="button" onClick={() => setConfirmArchive(dept.id)} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Archive"><Archive className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppPageLayout>
  );
}
