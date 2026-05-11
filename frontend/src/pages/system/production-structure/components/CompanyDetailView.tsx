import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Pencil, Check, X, Trash2, RefreshCw, Globe, Phone, MapPin, Info, Factory, TrendingUpDown, Layers, Component, Dumbbell, Calendar } from "lucide-react";
import { CompanyOverview } from "./CompanyOverview";
import { useQuery, useMutation } from "@apollo/client/react";
import { COMPANY_QUERY, UPDATE_COMPANY_MUTATION } from "@/graphql/companyQueries";
import { usePlants } from "@/hooks/usePlants";
import { useNavigate } from "react-router-dom";
import { ReferenceSelect, ReferenceMultiSelect } from "./ReferenceSelect";

export type CompanyFormData = {
  name: string; code: string; legalName: string; industryType: string; status: string; operatingSince: string;
  manufacturingFocus: string; productLines: string; leanMethodology: string;
  description: string; defaultTimezone: string; defaultLanguage: string;
  defaultCalendar: string; defaultShiftModel: string; weekStartDay: string;
  phone: string; email: string; website: string; adminName: string; adminRole: string;
  address: string; zipcode: string; city: string; state: string; country: string;
  /* Reference IDs */
  statusId: string; industryTypeId: string; defaultTimezoneId: string;
  defaultLanguageId: string; defaultCalendarId: string; defaultShiftModelId: string;
  weekStartDayId: string;
  manufacturingFocusIds: string[];
  productLineIds: string[];
  leanMethodologyIds: string[];
};

function Pill({ label }: { label: string }) {
  return <span className="inline-block rounded-full border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">{label}</span>;
}

function Stat({ icon, label, value, color, to }: { icon: React.ReactNode; label: string; value: string | number; color: string; to?: string }) {
  const navigate = useNavigate();
  const hasValue = typeof value === "number" ? value > 0 : !!value;
  return (
    <button type="button" title={hasValue ? `View ${label.toLowerCase()}` : `No ${label.toLowerCase()}`} onClick={hasValue && to ? () => navigate(to) : undefined} className={`flex items-center gap-1 rounded-lg border p-1.5 transition-colors ${hasValue ? "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer" : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 cursor-not-allowed"}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded ${hasValue ? color : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>{icon}</span>
      <div className="text-left">
        <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">{value}</div>
        <div className="text-[9px] text-slate-400 dark:text-slate-500">{label}</div>
      </div>
    </button>
  );
}

const DEFAULT_FORM: CompanyFormData = {
  name: "", code: "", legalName: "", industryType: "", status: "active", operatingSince: "",
  manufacturingFocus: "", productLines: "", leanMethodology: "",
  description: "", defaultTimezone: "", defaultLanguage: "",
  defaultCalendar: "", defaultShiftModel: "", weekStartDay: "",
  phone: "", email: "", website: "", adminName: "", adminRole: "",
  address: "", zipcode: "", city: "", state: "", country: "",
  statusId: "", industryTypeId: "", defaultTimezoneId: "",
  defaultLanguageId: "", defaultCalendarId: "", defaultShiftModelId: "",
  weekStartDayId: "",
  manufacturingFocusIds: [],
  productLineIds: [],
  leanMethodologyIds: [],
};

export function CompanyDetailView({ onSelectPlant }: { onSelectPlant?: (plantId: string) => void }) {
  const { data, refetch: refetchCompany } = useQuery<any>(COMPANY_QUERY);
  const { plants, loading: plantsLoading } = usePlants();
  const company = data?.company;
  const [readOnly, setReadOnly] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [form, setForm] = useState<CompanyFormData>(DEFAULT_FORM);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setForm({
      code: "MLC",
      name: "Maxon Lift Corp.",
      legalName: "Maxon Lift Corporation",
      industryType: "Liftgate Manufacturing",
      status: "active",
      statusId: "",
      industryTypeId: "",
      operatingSince: "1957-01-01",
      manufacturingFocus: "Lean, TPS, Kaizen, VSM",
      manufacturingFocusIds: [],
      productLines: "Light Duty, Railift, Tuk-A-Way, Slidelift, Columnlift, Gas Bottle",
      productLineIds: [],
      leanMethodology: "Lean, Six Sigma, TPS, Kaizen",
      leanMethodologyIds: [],
      description: "Since 1957, Maxon has been the leader in liftgates. Beginning with the first Tuk-A-Way, we have constantly worked to make your life easier with innovative products that offer workhorse performance, coupled with seamless support through a network of industry professionals. We are a family-owned company, the largest single-brand manufacturer of liftgates in the world.",
      defaultTimezone: "America/Los_Angeles",
      defaultTimezoneId: "",
      defaultLanguage: "English",
      defaultLanguageId: "",
      defaultCalendar: "Standard (Mon-Fri)",
      defaultCalendarId: "",
      defaultShiftModel: "Single Day Shift",
      defaultShiftModelId: "",
      weekStartDay: "Monday",
      weekStartDayId: "",
      phone: "800.227.4116",
      email: "info@maxonlift.com",
      website: "https://www.maxonlift.com",
      adminName: "Max Lugash",
      adminRole: "Founder & Inventor",
      address: "11921 Slauson Avenue", zipcode: "90670",
      city: "Santa Fe Springs", state: "CA", country: "USA",
    });
  }, [company]);

  const [updateCompany, { loading: saving }] = useMutation(UPDATE_COMPANY_MUTATION, {
    onCompleted: () => { setReadOnly(true); refetchCompany(); },
  });

  const handleSave = async () => {
    await updateCompany({ variables: { input: {
      name: form.name, code: form.code, legalName: form.legalName,
      industryType: form.industryType, status: form.status,
      statusId: form.statusId || null,
      operatingSince: form.operatingSince,
      manufacturingFocus: form.manufacturingFocus,
      productLines: form.productLines, leanMethodology: form.leanMethodology,
      description: form.description,
      defaultTimezone: form.defaultTimezone,
      defaultTimezoneId: form.defaultTimezoneId || null,
      defaultLanguage: form.defaultLanguage,
      defaultLanguageId: form.defaultLanguageId || null,
      defaultCalendar: form.defaultCalendar,
      defaultCalendarId: form.defaultCalendarId || null,
      defaultShiftModel: form.defaultShiftModel,
      defaultShiftModelId: form.defaultShiftModelId || null,
      weekStartDay: form.weekStartDay,
      weekStartDayId: form.weekStartDayId || null,
      phone: form.phone, email: form.email, website: form.website,
      adminName: form.adminName, adminRole: form.adminRole,
      address: form.address, zipcode: form.zipcode,
      city: form.city, state: form.state, country: form.country,
      manufacturingFocusIds: form.manufacturingFocusIds.length ? form.manufacturingFocusIds : null,
      productLineIds: form.productLineIds.length ? form.productLineIds : null,
      leanMethodologyIds: form.leanMethodologyIds.length ? form.leanMethodologyIds : null,
    } } });
  };

  const ro = readOnly
    ? "read-only border-0 bg-transparent px-0 text-slate-900 dark:text-slate-100 cursor-default"
    : "border border-slate-200 dark:border-slate-700 px-3 h-9 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50";
  const roTA = readOnly
    ? "read-only border-0 bg-transparent px-0 text-slate-900 dark:text-slate-100 cursor-default resize-none"
    : "border border-slate-200 dark:border-slate-700 p-2 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 resize-none";

  const counts = useMemo(() => {
    if (!plants.length) return { plants: 0, lines: 0, depts: 0, groups: 0, resources: 0, active: 0, inactive: 0 };
    let lines = 0, depts = 0, groups = 0, resources = 0, active = 0, inactive = 0;
    plants.forEach((p: any) => {
      if (p.status === "active") active++; else inactive++;
      lines += p.lineCount ?? 0;
      depts += p.departmentCount ?? 0;
      groups += p.groupCount ?? 0;
      resources += p.resourceCount ?? 0;
    });
    return { plants: plants.length, lines, depts, groups, resources, active, inactive };
  }, [plants]);

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <div className="flex items-center h-10 border-b border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900 shrink-0">
        <CompanyOverview company={{ name: form.name, code: form.code, defaultTimezone: form.defaultTimezone, phone: form.phone, email: form.email, address: form.address, logoUrl: "https://www.maxonlift.com/themes/maxon/logo.svg" } as any} />
      </div>
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 dark:border-slate-700 dark:bg-slate-800/80 font-['Segoe_UI',system-ui,sans-serif]" style={{ height: 40 }}>
        <button type="button" title="Refresh company data" onClick={() => refetchCompany()} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
          <RefreshCw className="h-3.5 w-3.5 stroke-current" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
        <button type="button" title="New company (only one company allowed)" disabled className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed">
          <Plus className="h-3.5 w-3.5 stroke-current" />
          <span className="hidden sm:inline">New</span>
        </button>
        {readOnly ? (
          <button type="button" title="Edit company" onClick={() => setReadOnly(false)} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
            <Pencil className="h-3.5 w-3.5 stroke-current" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        ) : (
          <>
            <button type="button" title="Save changes" disabled={saving} onClick={handleSave} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 transition-colors">
              <Check className="h-3.5 w-3.5 stroke-current" />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button type="button" title="Cancel editing" onClick={() => setReadOnly(true)} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 transition-colors">
              <X className="h-3.5 w-3.5 stroke-current" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          </>
        )}
        <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
        <button type="button" title={plants.length > 0 ? "Cannot delete: company has plants" : "Delete company"} disabled={plants.length > 0} className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium transition-colors ${plants.length > 0 ? "text-slate-400 dark:text-slate-500 cursor-not-allowed" : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"}`}>
          <Trash2 className="h-3.5 w-3.5 stroke-current" />
          <span className="hidden sm:inline">Delete</span>
        </button>
        <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
        <button type="button" title="More actions" disabled className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11px] font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed">
          <svg className="h-3.5 w-3.5 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          <span className="hidden sm:inline">More</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        {!company ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Info className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-current" />
              <p className="text-xs text-slate-400">No company data</p>
            </div>
          </div>
        ) : (() => {
          const c = {
            industryType: form.industryType || company.industryType || "Liftgate Manufacturing",
            defaultLanguage: form.defaultLanguage || company.defaultLanguage || "English",
            defaultCalendar: form.defaultCalendar || company.defaultCalendar || "Standard (Mon-Fri)",
            defaultShiftModel: form.defaultShiftModel || company.defaultShiftModel || "Single Day Shift",
            weekStartDay: form.weekStartDay || company.weekStartDay || "Monday",
          };
          return (
          <div className="grid grid-cols-2 gap-0 min-h-0">
            {/* ── Left column ── */}
            <div className="border-r border-slate-200 dark:border-slate-700 p-2 flex flex-col gap-3 h-full">
              {/* 1. Company Identity */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-500/10">
                    <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-current" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l-9 5h18z"/></svg>
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Company Identity</h3>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Company Name</label>
                    <input type="text" value={form.name} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Company Code</label>
                    <input type="text" value={form.code} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Legal / Display Name</label>
                    <input type="text" value={form.legalName} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Industry / Business Type</label>
                    {readOnly ? (
                      <span className="block text-[13px] text-slate-900 dark:text-slate-100">{c.industryType}</span>
                    ) : (
                      <ReferenceSelect categoryCode="industry_type" label=""
                        value={form.industryTypeId ?? ""} onChange={(v) => setForm((p) => ({ ...p, industryTypeId: v }))}
                        placeholder="Select industry..." />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Status</label>
                    {readOnly ? (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${form.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${form.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {form.status}
                      </span>
                    ) : (
                      <ReferenceSelect categoryCode="status" label=""
                        value={form.statusId ?? ""} onChange={(v) => setForm((p) => ({ ...p, statusId: v }))}
                        includeInactive placeholder="Select status..." />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Operating Since</label>
                    <input type="text" value={form.operatingSince} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, operatingSince: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                </div>
              </div>

              {/* 2. Business Profile */}
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Info className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 stroke-current" />
                  <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Business Profile</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Description</span>
                    {readOnly ? (
                      <div>
                        <p className={`text-[13px] text-slate-900 dark:text-slate-100 leading-relaxed ${!descExpanded ? "line-clamp-2" : ""}`}>{form.description}</p>
                        {(form.description?.length ?? 0) > 150 && (
                          <button type="button" onClick={() => setDescExpanded(!descExpanded)} className="text-[11px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 mt-0.5 transition-colors">
                            {descExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        className={`w-full text-[13px] outline-none transition-colors ${roTA}`}
                        maxLength={500} placeholder="Brief description of the company, core products, and operational scope." />
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Manufacturing Focus</span>
                    {readOnly ? (
                      <div className="flex flex-wrap gap-1">
                        {(form.manufacturingFocus || "").split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => <Pill key={t} label={t} />)}
                      </div>
                    ) : (
                      <ReferenceMultiSelect categoryCode="manufacturing_focus" label=""
                        values={form.manufacturingFocusIds ?? []}
                        onChange={(v) => setForm((p) => ({ ...p, manufacturingFocusIds: v }))} />
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Product Lines</span>
                    {readOnly ? (
                      <div className="flex flex-wrap gap-1">
                        {(form.productLines || "").split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => <Pill key={t} label={t} />)}
                      </div>
                    ) : (
                      <ReferenceMultiSelect categoryCode="product_line" label=""
                        values={form.productLineIds ?? []}
                        onChange={(v) => setForm((p) => ({ ...p, productLineIds: v }))} />
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Lean Methodology</span>
                    {readOnly ? (
                      <div className="flex flex-wrap gap-1">
                        {(form.leanMethodology || "").split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => <Pill key={t} label={t} />)}
                      </div>
                    ) : (
                      <ReferenceMultiSelect categoryCode="lean_methodology" label=""
                        values={form.leanMethodologyIds ?? []}
                        onChange={(v) => setForm((p) => ({ ...p, leanMethodologyIds: v }))} />
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Contact & Administration */}
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 stroke-current" />
                  <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contact & Administration</h4>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Main Phone</label>
                    <input type="text" value={form.phone} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Main Email</label>
                    <input type="text" value={form.email} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Website</label>
                    <input type="text" value={form.website} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Admin Contact</label>
                    <input type="text" value={form.adminName} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, adminName: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Contact Role</label>
                    <input type="text" value={form.adminRole} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, adminRole: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="p-2 flex flex-col gap-3">
              {/* 5. Headquarters */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-500/10">
                    <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-current" />
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Headquarters / Main Location</h3>
                </div>
                <div className="grid grid-cols-2 gap-1 mb-1.5">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Street Address</label>
                    <input type="text" value={form.address} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Zip / Postal Code</label>
                    <input type="text" value={form.zipcode} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, zipcode: e.target.value }))}
                      className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                  </div>
                  <div className="col-span-2 grid grid-cols-3 gap-1">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">City</label>
                      <input type="text" value={form.city} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">State</label>
                      <input type="text" value={form.state} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                        className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Country</label>
                      <input type="text" value={form.country} readOnly={readOnly} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                        className={`w-full text-[13px] outline-none transition-colors ${ro}`} />
                    </div>
                  </div>
                </div>
                <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-16">
                  {form.address ? (
                    <iframe title="Company location" className="w-full h-full" loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.address}, ${form.zipcode || ""}, ${form.city}, ${form.state}, ${form.country}`)}&output=embed&z=14`} />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 text-slate-400 text-xs">No address provided</div>
                  )}
                </div>
              </div>

              {/* 5. Global Operations */}
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Globe className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 stroke-current" />
                  <h4 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Global Operations</h4>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Default Timezone</label>
                    {readOnly ? (
                      <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.defaultTimezone || "\u2014"}</span>
                    ) : (
                      <ReferenceSelect categoryCode="timezone" label=""
                        value={form.defaultTimezoneId ?? ""} onChange={(v) => setForm((p) => ({ ...p, defaultTimezoneId: v }))}
                        placeholder="Select timezone..." />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Language / Locale</label>
                    {readOnly ? (
                      <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.defaultLanguage || "\u2014"}</span>
                    ) : (
                      <ReferenceSelect categoryCode="language_locale" label=""
                        value={form.defaultLanguageId ?? ""} onChange={(v) => setForm((p) => ({ ...p, defaultLanguageId: v }))}
                        placeholder="Select language..." />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Working Calendar</label>
                    {readOnly ? (
                      <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.defaultCalendar || "\u2014"}</span>
                    ) : (
                      <ReferenceSelect categoryCode="calendar" label=""
                        value={form.defaultCalendarId ?? ""} onChange={(v) => setForm((p) => ({ ...p, defaultCalendarId: v }))}
                        placeholder="Select calendar..." />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Shift Model</label>
                    {readOnly ? (
                      <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.defaultShiftModel || "\u2014"}</span>
                    ) : (
                      <ReferenceSelect categoryCode="shift_model" label=""
                        value={form.defaultShiftModelId ?? ""} onChange={(v) => setForm((p) => ({ ...p, defaultShiftModelId: v }))}
                        placeholder="Select shift model..." />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">Week Start Day</label>
                    {readOnly ? (
                      <span className="block text-[13px] text-slate-900 dark:text-slate-100">{form.weekStartDay || "\u2014"}</span>
                    ) : (
                      <ReferenceSelect categoryCode="week_start_day" label=""
                        value={form.weekStartDayId ?? ""} onChange={(v) => setForm((p) => ({ ...p, weekStartDayId: v }))}
                        placeholder="Select day..." />
                    )}
                  </div>
                </div>
              </div>

              {/* 6. Production Structure Summary */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-500/10">
                    <Factory className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-current" />
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Production Structure Summary</h3>
                </div>
                {plantsLoading ? (
                  <div className="text-xs text-slate-400 py-1">Loading counts...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-1 mb-1.5">
                      <Stat icon={<Factory className="h-3 w-3 stroke-current" />} label="Plants" value={counts.plants} color="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" />
                      <Stat icon={<TrendingUpDown className="h-3 w-3 stroke-current" />} label="Lines" value={counts.lines} color="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
                      <Stat icon={<Layers className="h-3 w-3 stroke-current" />} label="Depts" value={counts.depts} color="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" />
                      <Stat icon={<Component className="h-3 w-3 stroke-current" />} label="Groups" value={counts.groups} color="bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" />
                      <Stat icon={<Dumbbell className="h-3 w-3 stroke-current" />} label="Resources" value={counts.resources} color="bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400" />
                      <Stat icon={<Calendar className="h-3 w-3 stroke-current" />} label="Schedules" value={0} color="bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
                    </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-emerald-500" /> {counts.active} active</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" /> {counts.inactive} inactive</span>
                    </div>
                  </>
                )}
              </div>

              {/* 7. Related Plants */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-1.5">
                <div className="flex items-center gap-1 mb-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-500/10">
                    <Factory className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-current" />
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Related Plants</h3>
                </div>
                {plantsLoading ? (
                  <div className="text-xs text-slate-400 py-1">Loading plants...</div>
                ) : plants.length === 0 ? (
                  <div className="text-xs text-slate-400 py-1 text-center">No plants configured</div>
                ) : (
                  <div className="w-full text-xs">
                    <div className="flex items-center gap-1 px-2 py-0.5 border-b border-slate-100 dark:border-slate-800 text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      <span className="flex-[2] min-w-0">Name</span>
                      <span className="w-14 shrink-0 text-center hidden sm:block">Code</span>
                      <span className="w-28 shrink-0 text-center hidden sm:block">Location</span>
                      <span className="w-12 shrink-0 text-center">Status</span>
                      <span className="w-10 shrink-0 text-center">Lns</span>
                      <span className="w-6 shrink-0" />
                    </div>
                    {plants.slice(0, 3).map((plant: any) => (
                      <div key={plant.id} className="flex items-center gap-1 px-2 py-1 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer last:border-0" onClick={() => onSelectPlant?.(plant.id)}>
                        <span className="flex-[2] min-w-0 truncate font-semibold text-slate-900 dark:text-slate-100" title={plant.name}>{plant.name}</span>
                        <span className="w-14 shrink-0 text-center text-slate-500 dark:text-slate-400 font-mono hidden sm:block">{plant.code || "-"}</span>
                        <span className="w-28 shrink-0 text-left text-slate-400 dark:text-slate-500 truncate hidden sm:block" title={`${plant.city ? `${plant.city}${plant.state ? `, ${plant.state}` : ""}${plant.country ? `, ${plant.country}` : ""}` : plant.building || ""}`}>{plant.city && plant.state ? `${plant.city}, ${plant.state}${plant.country ? `, ${plant.country}` : ""}` : plant.building || plant.city || "-"}</span>
                        <span className="w-12 shrink-0 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${plant.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`} title={plant.status}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${plant.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                          </span>
                        </span>
                        <span className="w-10 shrink-0 text-center text-slate-500 dark:text-slate-400">{plant.lineCount ?? 0}</span>
                        <span className="w-6 shrink-0 flex items-center justify-center text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors">
                          <svg className="h-3.5 w-3.5 stroke-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
