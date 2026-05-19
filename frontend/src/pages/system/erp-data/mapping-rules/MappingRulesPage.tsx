import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Route, Search, Plus, RefreshCw, Pencil, Trash2, Save, X, ArrowRight } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";

const MAPPING_RULES_QUERY = gql`
  query MappingRules($domain: String, $activeOnly: Boolean) {
    mappingRules(domain: $domain, activeOnly: $activeOnly) {
      id domain sourceField destinationField transformRule isRequired isActive createdAt
    }
    importSourceConfigs(isActive: true) {
      id name domain
    }
  }
`;

const CREATE_MAPPING_RULE = gql`
  mutation CreateMappingRule($input: MappingRuleInput!) {
    createMappingRule(input: $input) {
      ok rule { id domain sourceField destinationField transformRule isRequired }
      errors { field code message }
    }
  }
`;

const UPDATE_MAPPING_RULE = gql`
  mutation UpdateMappingRule($id: String!, $input: MappingRuleInput!) {
    updateMappingRule(id: $id, input: $input) {
      ok rule { id domain sourceField destinationField transformRule isRequired }
      errors { field code message }
    }
  }
`;

const ARCHIVE_MAPPING_RULE = gql`
  mutation ArchiveMappingRule($id: String!) {
    archiveMappingRule(id: $id) {
      ok errors { field code message }
    }
  }
`;

const DOMAINS = ["PLANT_STRUCTURE", "MATERIALS", "BOM", "ROUTING", "SCHEDULES", "INVENTORY", "PRODUCTS"];

interface MappingRule {
  id: string; domain: string; sourceField: string; destinationField: string;
  transformRule?: string | null; isRequired: boolean; isActive: boolean; createdAt: string;
}
interface ImportSource { id: string; name: string; domain: string; }

const inputClass = `h-7 w-full rounded border border-border/30 bg-transparent pl-3 pr-7 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const buttonClass = `inline-flex items-center gap-1.5 h-8 px-2 rounded text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors`;
const formInputClass = `h-7 w-full rounded border border-border/30 bg-card px-2.5 text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/50 focus:ring-1 focus:ring-border/25`;
const formSelectClass = `h-7 w-full cursor-pointer rounded border border-border/30 bg-card px-2 text-[11px] text-foreground outline-none transition-colors focus:border-border/50 focus:ring-1 focus:ring-border/25`;

interface RuleForm {
  domain: string; sourceField: string; destinationField: string; transformRule: string; isRequired: boolean;
}

function emptyForm(): RuleForm {
  return { domain: "PLANT_STRUCTURE", sourceField: "", destinationField: "", transformRule: "", isRequired: false };
}

export function MappingRulesPage() {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ mappingRules: MappingRule[]; importSourceConfigs: ImportSource[] }>(
    MAPPING_RULES_QUERY,
    { variables: { domain: domainFilter || null }, fetchPolicy: "cache-and-network" }
  );

  const [createRule] = useMutation(CREATE_MAPPING_RULE, { refetchQueries: ["MappingRules"] });
  const [updateRule] = useMutation(UPDATE_MAPPING_RULE, { refetchQueries: ["MappingRules"] });
  const [archiveRule] = useMutation(ARCHIVE_MAPPING_RULE, { refetchQueries: ["MappingRules"] });

  const rules = data?.mappingRules ?? [];

  const filtered = useMemo(() => {
    if (!search) return rules;
    const q = search.toLowerCase();
    return rules.filter((r) =>
      r.sourceField.toLowerCase().includes(q) ||
      r.destinationField.toLowerCase().includes(q) ||
      r.domain.toLowerCase().includes(q)
    );
  }, [rules, search]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (rule: MappingRule) => {
    setEditingId(rule.id);
    setForm({
      domain: rule.domain,
      sourceField: rule.sourceField,
      destinationField: rule.destinationField,
      transformRule: rule.transformRule ?? "",
      isRequired: rule.isRequired,
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.sourceField.trim() || !form.destinationField.trim()) {
      setFormError("Source and destination fields are required");
      return;
    }
    setFormError(null);
    const input = {
      domain: form.domain,
      sourceField: form.sourceField.trim(),
      destinationField: form.destinationField.trim(),
      transformRule: form.transformRule.trim() || null,
      isRequired: form.isRequired,
    };
    try {
      if (editingId) {
        await updateRule({ variables: { id: editingId, input } });
      } else {
        await createRule({ variables: { input } });
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveRule({ variables: { id } });
    } catch {
      // ignore
    }
  };

  return (
    <AppPageLayout
      title="Mapping Rules"
      subtitle="Map ERP columns to Nexus system fields for automated data transformation."
      icon={<Route />}
      iconClass="text-teal-600"
    >
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex h-9 items-center gap-2 border-b border-border/35 bg-muted px-3 select-none">
          <div className="relative w-64">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground stroke-current pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rules..." className={inputClass} />
          </div>
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="h-7 rounded border border-border/30 bg-card px-2 text-[11px] text-muted-foreground outline-none">
            <option value="">All Domains</option>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="flex-1" />
          {showForm && (
            <>
              <button type="button" onClick={closeForm} className={buttonClass}><X className="h-4 w-4 stroke-current" /><span>Cancel</span></button>
              <button type="button" onClick={handleSave} className={buttonClass}><Save className="h-4 w-4 stroke-current" /><span>Save</span></button>
            </>
          )}
          <button type="button" onClick={openAdd} className={buttonClass}><Plus className="h-4 w-4 stroke-current" /><span>Add Rule</span></button>
          <button type="button" onClick={() => refetch()} className={buttonClass}><RefreshCw className="h-4 w-4 stroke-current" /><span>Refresh</span></button>
        </div>

        {showForm && (
          <div className="shrink-0 border-b border-border/30 bg-card px-4 py-3">
            <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-3">
              <span className="text-sm font-semibold text-foreground">{editingId ? "Edit Rule" : "Add Rule"}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Domain</label>
                <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className={formSelectClass}>
                  {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ERP Column *</label>
                  <input type="text" value={form.sourceField} onChange={(e) => setForm({ ...form, sourceField: e.target.value })} placeholder="e.g. Line Code" className={formInputClass} />
                </div>
                <ArrowRight className="h-4 w-4 stroke-current text-muted-foreground mb-2" />
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nexus Field *</label>
                  <input type="text" value={form.destinationField} onChange={(e) => setForm({ ...form, destinationField: e.target.value })} placeholder="e.g. ProductionLine.code" className={formInputClass} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transform Rule</label>
                <input type="text" value={form.transformRule} onChange={(e) => setForm({ ...form, transformRule: e.target.value })} placeholder="e.g. trim, uppercase" className={formInputClass} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="isRequired" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} className="h-4 w-4 rounded border-border/30 accent-primary" />
                <label htmlFor="isRequired" className="text-[11px] text-muted-foreground">Required field</label>
              </div>
            </div>
            {formError && <div className="mt-2 text-[11px] text-danger">{formError}</div>}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-success animate-bounce" /> Loading...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Route className="h-12 w-12 mx-auto text-teal-600/30 stroke-current" />
              <p className="mt-3 text-sm text-muted-foreground">No mapping rules defined yet.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 bg-muted/50">
                  <th className="h-8 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Domain</th>
                  <th className="h-8 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ERP Column</th>
                  <th className="h-8 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nexus Field</th>
                  <th className="h-8 px-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transform</th>
                  <th className="h-8 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Required</th>
                  <th className="h-8 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Active</th>
                  <th className="h-8 px-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rule) => (
                  <tr key={rule.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <td className="h-8 px-3"><span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{rule.domain}</span></td>
                    <td className="h-8 px-3 font-medium text-foreground">{rule.sourceField}</td>
                    <td className="h-8 px-3 text-muted-foreground">{rule.destinationField}</td>
                    <td className="h-8 px-3 text-muted-foreground">{rule.transformRule || <span className="text-muted-foreground/50">-</span>}</td>
                    <td className="h-8 px-3 text-center">{rule.isRequired ? <span className="text-danger">Yes</span> : <span className="text-muted-foreground/50">No</span>}</td>
                    <td className="h-8 px-3 text-center">{rule.isActive ? <span className="inline-block h-2 w-2 rounded-full bg-success" /> : <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />}</td>
                    <td className="h-8 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => openEdit(rule)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5 stroke-current" /></button>
                        <button type="button" onClick={() => handleArchive(rule.id)} className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors" title="Archive"><Trash2 className="h-3.5 w-3.5 stroke-current" /></button>
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
