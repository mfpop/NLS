import { useQuery, useMutation } from "@apollo/client/react";
import { useCallback, useState } from "react";
import {
  COMPANY_QUERY,
  UPDATE_COMPANY_MUTATION,
  CREATE_COMPANY_MUTATION,
  DELETE_COMPANY_MUTATION,
} from "@/graphql/companyQueries";

export interface CompanyData {
  id: string;
  code: string;
  name: string;
  legalName: string;
  description: string;
  industryType: string;
  industryTypeId: string | null;
  status: string;
  statusId: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  countryId: string | null;
  phone: string;
  email: string;
  website: string;
  operatingSince: string;
  manufacturingFocus: string;
  productLines: string;
  productLineRefs: Array<{ id: string; name: string; code: string; isActive: boolean }>;
  leanMethodology: string;
  leanMethodologyRefs: Array<{ id: string; name: string; code: string; isActive: boolean }>;
  defaultTimezone: string;
  defaultTimezoneId: string | null;
  defaultLanguage: string;
  defaultLanguageId: string | null;
  defaultCalendar: string;
  defaultCalendarId: string | null;
  defaultShiftModel: string;
  defaultShiftModelId: string | null;
  weekStartDay: string;
  weekStartDayId: string | null;
  adminName: string;
  adminRole: string;
  zipcode: string;
  createdAt: string;
  updatedAt: string;
}

export type CompanyFormData = {
  name: string;
  code: string;
  legalName: string;
  industryType: string;
  status: string;
  operatingSince: string;
  productLines: string;
  leanMethodology: string;
  description: string;
  defaultTimezone: string;
  defaultLanguage: string;
  defaultCalendar: string;
  defaultShiftModel: string;
  weekStartDay: string;
  phone: string;
  email: string;
  website: string;
  adminName: string;
  adminRole: string;
  address: string;
  zipcode: string;
  city: string;
  state: string;
  country: string;
  statusId: string;
  industryTypeId: string;
  defaultTimezoneId: string;
  defaultLanguageId: string;
  defaultCalendarId: string;
  defaultShiftModelId: string;
  weekStartDayId: string;
  countryId: string;
  cityId: string;
  stateId: string;
  productLineIds: string[];
  leanMethodologyIds: string[];
};

export const EMPTY_COMPANY_FORM: CompanyFormData = {
  name: "", code: "", legalName: "", industryType: "", status: "active", operatingSince: "",
  productLines: "", leanMethodology: "", description: "",
  defaultTimezone: "", defaultLanguage: "", defaultCalendar: "", defaultShiftModel: "", weekStartDay: "",
  phone: "", email: "", website: "", adminName: "", adminRole: "",
  address: "", zipcode: "", city: "", state: "", country: "",
  statusId: "", industryTypeId: "", defaultTimezoneId: "", defaultLanguageId: "",
  defaultCalendarId: "", defaultShiftModelId: "", weekStartDayId: "", countryId: "",
  cityId: "", stateId: "",
  productLineIds: [], leanMethodologyIds: [],
};

export function companyToForm(company: CompanyData | null): CompanyFormData {
  if (!company) return { ...EMPTY_COMPANY_FORM };
  return {
    name: company.name || "",
    code: company.code || "",
    legalName: company.legalName || "",
    industryType: company.industryType || "",
    status: company.status || "active",
    statusId: company.statusId || "",
    industryTypeId: company.industryTypeId || "",
    operatingSince: company.operatingSince || "",
    productLines: company.productLines || "",
    productLineIds: company.productLineRefs?.map((r) => r.id) || [],
    leanMethodology: company.leanMethodology || "",
    leanMethodologyIds: company.leanMethodologyRefs?.map((r) => r.id) || [],
    description: company.description || "",
    defaultTimezone: company.defaultTimezone || "",
    defaultTimezoneId: company.defaultTimezoneId || "",
    defaultLanguage: company.defaultLanguage || "",
    defaultLanguageId: company.defaultLanguageId || "",
    defaultCalendar: company.defaultCalendar || "",
    defaultCalendarId: company.defaultCalendarId || "",
    defaultShiftModel: company.defaultShiftModel || "",
    defaultShiftModelId: company.defaultShiftModelId || "",
    weekStartDay: company.weekStartDay || "",
    weekStartDayId: company.weekStartDayId || "",
    phone: company.phone || "",
    email: company.email || "",
    website: company.website || "",
    adminName: company.adminName || "",
    adminRole: company.adminRole || "",
    address: company.address || "",
    zipcode: company.zipcode || "",
    city: company.city || "",
    state: company.state || "",
    country: company.country || "",
    countryId: company.countryId || "",
    cityId: "",
    stateId: "",
  };
}

function buildCompanyInput(form: CompanyFormData) {
  return {
    code: form.code || undefined,
    name: form.name || undefined,
    legalName: form.legalName || undefined,
    description: form.description || undefined,
    industryType: form.industryType || undefined,
    industryTypeId: form.industryTypeId || undefined,
    status: form.status || undefined,
    statusId: form.statusId || undefined,
    address: form.address || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    country: form.country || undefined,
    countryId: form.countryId || undefined,
    phone: form.phone || undefined,
    email: form.email || undefined,
    website: form.website || undefined,
    operatingSince: form.operatingSince || undefined,
    productLines: form.productLines || undefined,
    productLineIds: form.productLineIds.length > 0 ? form.productLineIds : undefined,
    leanMethodology: form.leanMethodology || undefined,
    leanMethodologyIds: form.leanMethodologyIds.length > 0 ? form.leanMethodologyIds : undefined,
    defaultTimezone: form.defaultTimezone || undefined,
    defaultTimezoneId: form.defaultTimezoneId || undefined,
    defaultLanguage: form.defaultLanguage || undefined,
    defaultLanguageId: form.defaultLanguageId || undefined,
    defaultCalendar: form.defaultCalendar || undefined,
    defaultCalendarId: form.defaultCalendarId || undefined,
    defaultShiftModel: form.defaultShiftModel || undefined,
    defaultShiftModelId: form.defaultShiftModelId || undefined,
    weekStartDay: form.weekStartDay || undefined,
    weekStartDayId: form.weekStartDayId || undefined,
    adminName: form.adminName || undefined,
    adminRole: form.adminRole || undefined,
    zipcode: form.zipcode || undefined,
  };
}

export function validateCompanyForm(form: CompanyFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Company name is required";
  if (!form.code.trim()) errors.code = "Company code is required";
  if (!form.statusId.trim()) errors.statusId = "Status is required";
  if (!form.defaultTimezoneId.trim()) errors.defaultTimezoneId = "Default timezone is required";
  if (!form.defaultCalendarId.trim()) errors.defaultCalendarId = "Working calendar is required";
  if (!form.defaultShiftModelId.trim()) errors.defaultShiftModelId = "Shift model is required";
  if (!form.weekStartDayId.trim()) errors.weekStartDayId = "Week start day is required";
  if (!form.countryId.trim()) errors.countryId = "Country is required";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Invalid email format";
  if (form.website && !/^https?:\/\/.+/.test(form.website)) errors.website = "Website must be a valid URL (http://...)";
  if (form.operatingSince && !/^\d{4}-\d{2}-\d{2}$/.test(form.operatingSince)) errors.operatingSince = "Use YYYY-MM-DD format";
  if (form.zipcode && form.zipcode.length > 20) errors.zipcode = "Max 20 characters";
  if (form.phone && !/^[\d\s+\-()]+$/.test(form.phone)) errors.phone = "Invalid characters in phone number";
  return errors;
}

export function hasCompanyChanges(form: CompanyFormData, initial: CompanyFormData): boolean {
  return JSON.stringify(form) !== JSON.stringify(initial);
}
export const isDirty = hasCompanyChanges;

export function mapCompanyFormToMutation(form: CompanyFormData): Record<string, any> {
  return buildCompanyInput(form);
}
export const mapCompanyDbToForm = resolveCompanyForm;

export function resolveSelectedReference(valueId: string | undefined, options: Array<{ id: string; name: string }>): { id: string; label: string } | null {
  if (!valueId) return null;
  const found = options.find((o) => o.id === valueId);
  return found ? { id: found.id, label: found.name } : null;
}

export function resolveReferenceLabel(valueId: string | undefined | null, options: Array<{ id: string; name: string }>): string {
  if (!valueId) return "";
  const found = options.find((o) => o.id === valueId);
  return found?.name ?? "";
}

export function normalizeMultiSelectRelations(relations: Array<{ id: string }> | undefined | null): string[] {
  return relations?.map((r) => r.id) ?? [];
}

export function renderDisplayValue(val: string | undefined | null, fallback = "\u2014"): string {
  if (!val || val === "null" || val === "undefined") return fallback;
  return val;
}

export function resolveCompanyForm(
  company: CompanyData | null,
  findIdByText: (categoryCode: string, text: string) => string,
): CompanyFormData {
  const base = companyToForm(company);
  if (!company) return base;

  const resolve = (cat: string, id: string | null | undefined, text: string): string => {
    if (!text) return id || "";
    const textId = findIdByText(cat, text);
    if (textId) return textId;
    return id || "";
  };

  return {
    ...base,
    industryTypeId: resolve("industry_type", company.industryTypeId, company.industryType),
    defaultLanguageId: resolve("language_locale", company.defaultLanguageId, company.defaultLanguage),
    defaultCalendarId: resolve("calendar", company.defaultCalendarId, company.defaultCalendar),
    defaultShiftModelId: resolve("shift_model", company.defaultShiftModelId, company.defaultShiftModel),
    weekStartDayId: resolve("week_start_day", company.weekStartDayId, company.weekStartDay),
    countryId: resolve("country", company.countryId, company.country),
    stateId: findIdByText("state", company.state) || "",
    cityId: findIdByText("city", company.city) || "",
    defaultTimezoneId: resolve("timezone", company.defaultTimezoneId, company.defaultTimezone),
  };
}

interface CompanyMutationResult {
  ok: boolean;
  company?: CompanyData;
  errors?: Array<{ field: string; code: string; message: string }>;
}

interface CompanyQueryResult {
  company: CompanyData | null;
}

type CompanyInputRecord = ReturnType<typeof buildCompanyInput>;

export function useCompany() {
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useQuery<CompanyQueryResult>(COMPANY_QUERY, {
    fetchPolicy: "network-only",
  });

  const company: CompanyData | null = data?.company ?? null;

  const [updateMutation] = useMutation<{ updateCompany: CompanyMutationResult }, { input: CompanyInputRecord }>(UPDATE_COMPANY_MUTATION);
  const [createMutation] = useMutation<{ createCompany: CompanyMutationResult }, { input: CompanyInputRecord }>(CREATE_COMPANY_MUTATION);
  const [deleteMutation] = useMutation<{ deleteCompany: { ok: boolean; errors?: Array<{ field: string; message: string }> } }, object>(DELETE_COMPANY_MUTATION);

  const saveCompany = useCallback(async (
    form: CompanyFormData,
    isNew: boolean,
  ): Promise<{ ok: boolean; errors?: Record<string, string>; company?: CompanyData }> => {
    const validation = validateCompanyForm(form);
    if (Object.keys(validation).length > 0) return { ok: false, errors: validation };

    setSaving(true);
    try {
      const input = buildCompanyInput(form);
      let response: CompanyMutationResult | undefined;
      if (isNew) {
        const result = await createMutation({ variables: { input } });
        response = result.data?.createCompany;
      } else {
        const result = await updateMutation({ variables: { input } });
        response = result.data?.updateCompany;
      }

      if (response?.errors?.length) {
        const fieldErrors: Record<string, string> = {};
        for (const e of response.errors) {
          fieldErrors[e.field] = e.message;
        }
        return { ok: false, errors: fieldErrors };
      }

      await refetch();
      return { ok: true, company: response?.company };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save company";
      return { ok: false, errors: { _form: message } };
    } finally {
      setSaving(false);
    }
  }, [createMutation, updateMutation, refetch]);

  const deleteCompany = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    setSaving(true);
    try {
      const { data } = await deleteMutation();
      const response = data?.deleteCompany;
      if (response?.ok) {
        await refetch();
        return { ok: true };
      }
      return { ok: false, message: response?.errors?.[0]?.message || "Failed to delete company" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete company";
      return { ok: false, message };
    } finally {
      setSaving(false);
    }
  }, [deleteMutation, refetch]);

  return {
    company,
    loading,
    error,
    saving,
    refetch,
    saveCompany,
    deleteCompany,
  };
}
