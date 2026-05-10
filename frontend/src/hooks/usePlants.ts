import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useCallback } from "react";
import {
  PLANTS_QUERY,
  CREATE_PLANT_MUTATION,
  UPDATE_PLANT_MUTATION,
  ARCHIVE_PLANT_MUTATION,
} from "@/graphql/plantQueries";
import type {
  Plant,
  PlantInput,
  PlantsQueryData,
  PlantsQueryVars,
  CreatePlantData,
  CreatePlantVars,
  UpdatePlantData,
  UpdatePlantVars,
} from "@/types/plant";



/* ── Timezone options for the form ── */

export const TIMEZONE_OPTIONS = [
  { value: "America/Anchorage", label: "(UTC-09:00) America/Anchorage" },
  { value: "America/Cancun", label: "(UTC-05:00) America/Cancun" },
  { value: "America/Chicago", label: "(UTC-06:00) America/Chicago" },
  { value: "America/Chihuahua", label: "(UTC-06:00) America/Chihuahua" },
  { value: "America/Denver", label: "(UTC-07:00) America/Denver" },
  { value: "America/Detroit", label: "(UTC-05:00) America/Detroit" },
  { value: "America/Hermosillo", label: "(UTC-07:00) America/Hermosillo" },
  { value: "America/Los_Angeles", label: "(UTC-08:00) America/Los_Angeles" },
  { value: "America/Mazatlan", label: "(UTC-07:00) America/Mazatlan" },
  { value: "America/Mexico_City", label: "(UTC-06:00) America/Mexico_City" },
  { value: "America/Monterrey", label: "(UTC-06:00) America/Monterrey" },
  { value: "America/New_York", label: "(UTC-05:00) America/New_York" },
  { value: "America/Phoenix", label: "(UTC-07:00) America/Phoenix" },
  { value: "America/Tijuana", label: "(UTC-08:00) America/Tijuana" },
  { value: "Asia/Dubai", label: "(UTC+04:00) Asia/Dubai" },
  { value: "Asia/Shanghai", label: "(UTC+08:00) Asia/Shanghai" },
  { value: "Asia/Tokyo", label: "(UTC+09:00) Asia/Tokyo" },
  { value: "Australia/Sydney", label: "(UTC+11:00) Australia/Sydney" },
  { value: "Europe/Berlin", label: "(UTC+01:00) Europe/Berlin" },
  { value: "Europe/Bucharest", label: "(UTC+02:00) Europe/Bucharest" },
  { value: "Europe/London", label: "(UTC+00:00) Europe/London" },
  { value: "Pacific/Honolulu", label: "(UTC-10:00) Pacific/Honolulu" },
  { value: "Etc/UTC", label: "(UTC+00:00) UTC" },
];

/* ── Default form data ── */

export const EMPTY_FORM = {
  name: "",
  code: "",
  status: "active",
  building: "",
  address: "",
  city: "",
  state: "",
  country: "",
  zipcode: "",
  timezone: "America/New_York (EST)",
  latitude: "",
  longitude: "",
  plantType: "",
  operatingSince: "",
  managerPhone: "",
  defaultCalendar: "",
  defaultShiftModel: "",
  weekStartDay: "",
  defaultSchedule: "",
  manufacturingFocus: "",
  managerName: "",
  managerEmail: "",
  description: "",
};

/* ── Inline validation ── */

export function validatePlantForm(form: typeof EMPTY_FORM, plants: Plant[], editingId?: string | null): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Plant name is required";
  if (!form.code.trim()) errors.code = "Plant code is required";
  if (form.code.trim()) {
    const duplicate = plants.find((p) => p.code.toLowerCase() === form.code.trim().toLowerCase() && p.id !== editingId);
    if (duplicate) errors.code = `Code "${form.code}" is already in use by ${duplicate.name}`;
  }
  if (form.managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.managerEmail)) {
    errors.managerEmail = "Invalid email format";
  }
  return errors;
}

/* ── Check if form has changes from original ── */

export function hasFormChanges(form: typeof EMPTY_FORM, original?: Plant): boolean {
  if (!original) return true;
  return (
    form.name !== original.name ||
    form.code !== original.code ||
    form.status !== original.status ||
    form.building !== (original.building || "") ||
    form.address !== (original.address || "") ||
    form.timezone !== (original.timezone || "") ||
    form.managerName !== (original.managerName || "") ||
    form.managerEmail !== (original.managerEmail || "") ||
    form.description !== (original.description || "")
  );
}

/* ── Hook ── */

export function usePlants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* ── Attempt GraphQL query, fall back to mock data ── */
  const { data: gqlData, loading: gqlLoading, refetch } = useQuery<PlantsQueryData, PlantsQueryVars>(
    PLANTS_QUERY,
    { variables: { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const plants = gqlData?.plants ?? [];

  /* ── Mutations ── */
  const [createMutation, createState] = useMutation<CreatePlantData, CreatePlantVars>(CREATE_PLANT_MUTATION);
  const [updateMutation, updateState] = useMutation<UpdatePlantData, UpdatePlantVars>(UPDATE_PLANT_MUTATION);
  const [archiveMutation] = useMutation<any, { id: string }>(ARCHIVE_PLANT_MUTATION);

  const saveLoading = createState.loading || updateState.loading;

  /* ── CRUD helpers ── */

  const savePlant = useCallback(async (form: typeof EMPTY_FORM, editingId?: string | null): Promise<{ ok: boolean; errors?: Record<string, string> }> => {
    const validation = validatePlantForm(form, gqlData?.plants ?? [], editingId);
    if (Object.keys(validation).length > 0) return { ok: false, errors: validation };

    try {
      const input: PlantInput = {
        name: form.name,
        code: form.code,
        status: form.status,
        building: form.building || undefined,
        address: form.address || undefined,
        timezone: form.timezone || undefined,
        managerName: form.managerName || undefined,
        managerEmail: form.managerEmail || undefined,
        description: form.description || undefined,
      };

      if (editingId) {
        const { data } = await updateMutation({ variables: { id: editingId, input } });
        if (data?.updatePlant?.errors?.length) {
          const fieldErrors: Record<string, string> = {};
          data.updatePlant.errors.forEach((e) => { fieldErrors[e.field] = e.message; });
          return { ok: false, errors: fieldErrors };
        }
      } else {
        const { data } = await createMutation({ variables: { input } });
        if (data?.createPlant?.errors?.length) {
          const fieldErrors: Record<string, string> = {};
          data.createPlant.errors.forEach((e) => { fieldErrors[e.field] = e.message; });
          return { ok: false, errors: fieldErrors };
        }
      }
      await refetch();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save plant. Please try again.";
      return { ok: false, errors: { _form: message } };
    }
  }, [createMutation, updateMutation, refetch, gqlData]);

  const archivePlant = useCallback(async (id: string): Promise<{ success: boolean; inUse: boolean; message: string }> => {
    try {
      const { data } = await archiveMutation({ variables: { id } });
      if (data?.archivePlant?.ok) {
        await refetch();
        return { success: true, inUse: false, message: "Plant archived." };
      }
      const err = data?.archivePlant?.errors?.[0];
      return { success: false, inUse: false, message: err?.message || "Failed to archive plant." };
    } catch {
      return { success: false, inUse: false, message: "Failed to archive plant." };
    }
  }, [archiveMutation, refetch]);

  const loading = gqlLoading;

  return {
    plants,
    loading,
    saveLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    savePlant,
    archivePlant,
    refetch,
  };
}
