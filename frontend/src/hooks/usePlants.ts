import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useCallback } from "react";
import {
  PLANTS_QUERY,
  CREATE_PLANT_MUTATION,
  UPDATE_PLANT_MUTATION,
  TOGGLE_PLANT_STATUS_MUTATION,
  DELETE_PLANT_MUTATION,
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
  TogglePlantStatusData,
  TogglePlantStatusVars,
  DeletePlantData,
  DeletePlantVars,
} from "@/types/plant";

/* ── Fallback mock data when backend is not available ── */

const MOCK_PLANTS: Plant[] = [
  {
    id: "P001", code: "MP-01", name: "Main Plant", status: "active",
    building: "Building A", address: "123 Industrial Blvd, Detroit, MI 48201",
    timezone: "America/Detroit (EST)", defaultCalendarId: null, defaultScheduleId: null,
    managerName: "John Smith", managerEmail: "john.smith@leansync.com",
    description: "Primary assembly facility for cylinder and STB unit production.",
    lineCount: 3, departmentCount: 4, groupCount: 8, resourceCount: 42,
    isActive: true, createdAt: "2024-01-15T08:00:00Z", updatedAt: "2025-03-10T14:30:00Z",
  },
  {
    id: "P002", code: "SP-01", name: "Secondary Plant", status: "active",
    building: "Building B", address: "456 Manufacturing Dr, Toledo, OH 43601",
    timezone: "America/New_York (EST)", defaultCalendarId: null, defaultScheduleId: null,
    managerName: "Sarah Chen", managerEmail: "sarah.chen@leansync.com",
    description: "Harnesses and pipes fabrication supporting main plant assembly.",
    lineCount: 2, departmentCount: 3, groupCount: 5, resourceCount: 18,
    isActive: true, createdAt: "2024-02-01T09:00:00Z", updatedAt: "2025-02-20T11:00:00Z",
  },
  {
    id: "P003", code: "WP-01", name: "Warehouse Plant", status: "inactive",
    building: "Warehouse 1", address: "789 Logistics Ave, Chicago, IL 60601",
    timezone: "America/Chicago (CST)", defaultCalendarId: null, defaultScheduleId: null,
    managerName: "Mike Brown", managerEmail: "mike.brown@leansync.com",
    description: "Storage and kitting facility. Currently inactive pending reconfiguration.",
    lineCount: 1, departmentCount: 1, groupCount: 2, resourceCount: 6,
    isActive: false, createdAt: "2024-03-10T10:00:00Z", updatedAt: "2025-01-05T16:00:00Z",
  },
];

let mockNextId = 4;
let mockPlants = [...MOCK_PLANTS];

function generateMockId(): string {
  return `P${String(mockNextId++).padStart(3, "0")}`;
}

/* ── Timezone options for the form ── */

export const TIMEZONE_OPTIONS = [
  { value: "America/New_York (EST)", label: "America/New_York (EST)" },
  { value: "America/Detroit (EST)", label: "America/Detroit (EST)" },
  { value: "America/Chicago (CST)", label: "America/Chicago (CST)" },
  { value: "America/Denver (MST)", label: "America/Denver (MST)" },
  { value: "America/Los_Angeles (PST)", label: "America/Los_Angeles (PST)" },
  { value: "America/Anchorage (AKST)", label: "America/Anchorage (AKST)" },
  { value: "Pacific/Honolulu (HST)", label: "Pacific/Honolulu (HST)" },
  { value: "Europe/London (GMT)", label: "Europe/London (GMT)" },
  { value: "Europe/Berlin (CET)", label: "Europe/Berlin (CET)" },
  { value: "Europe/Bucharest (EET)", label: "Europe/Bucharest (EET)" },
  { value: "Asia/Tokyo (JST)", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai (CST)", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Dubai (GST)", label: "Asia/Dubai (GST)" },
  { value: "Australia/Sydney (AEST)", label: "Australia/Sydney (AEST)" },
];

/* ── Default form data ── */

export const EMPTY_FORM = {
  name: "",
  code: "",
  status: "active" as "active" | "inactive",
  building: "",
  address: "",
  timezone: "America/New_York (EST)",
  defaultCalendarId: "",
  defaultScheduleId: "",
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
    form.defaultCalendarId !== (original.defaultCalendarId || "") ||
    form.defaultScheduleId !== (original.defaultScheduleId || "") ||
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
  const { data: gqlData, loading: gqlLoading, error: gqlError, refetch } = useQuery<PlantsQueryData, PlantsQueryVars>(
    PLANTS_QUERY,
    { variables: { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
      fetchPolicy: "cache-and-network",
      errorPolicy: "all",
    }
  );

  const isMockFallback = !!gqlError || !gqlData;
  const plants = isMockFallback ? filterMockPlants(search, statusFilter) : (gqlData?.plants ?? []);

  /* ── Mutations ── */
  const [createMutation, createState] = useMutation<CreatePlantData, CreatePlantVars>(CREATE_PLANT_MUTATION);
  const [updateMutation, updateState] = useMutation<UpdatePlantData, UpdatePlantVars>(UPDATE_PLANT_MUTATION);
  const [toggleMutation] = useMutation<TogglePlantStatusData, TogglePlantStatusVars>(TOGGLE_PLANT_STATUS_MUTATION);
  const [deleteMutation] = useMutation<DeletePlantData, DeletePlantVars>(DELETE_PLANT_MUTATION);

  const saveLoading = createState.loading || updateState.loading;

  /* ── CRUD helpers ── */

  const savePlant = useCallback(async (form: typeof EMPTY_FORM, editingId?: string | null): Promise<{ ok: boolean; errors?: Record<string, string> }> => {
    const validation = validatePlantForm(form, isMockFallback ? mockPlants : (gqlData?.plants ?? []), editingId);
    if (Object.keys(validation).length > 0) return { ok: false, errors: validation };

    if (isMockFallback) {
      // Mock mode
      if (editingId) {
        const idx = mockPlants.findIndex((p) => p.id === editingId);
        if (idx >= 0) {
          mockPlants[idx] = {
            ...mockPlants[idx],
            name: form.name,
            code: form.code,
            status: form.status,
            building: form.building,
            address: form.address,
            timezone: form.timezone,
            defaultCalendarId: form.defaultCalendarId || null,
            defaultScheduleId: form.defaultScheduleId || null,
            managerName: form.managerName,
            managerEmail: form.managerEmail,
            description: form.description,
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        const newPlant: Plant = {
          id: generateMockId(),
          code: form.code,
          name: form.name,
          status: form.status,
          building: form.building,
          address: form.address,
          timezone: form.timezone,
          defaultCalendarId: form.defaultCalendarId || null,
          defaultScheduleId: form.defaultScheduleId || null,
          managerName: form.managerName,
          managerEmail: form.managerEmail,
          description: form.description,
          lineCount: 0,
          departmentCount: 0,
          groupCount: 0,
          resourceCount: 0,
          isActive: form.status === "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockPlants.push(newPlant);
      }
      return { ok: true };
    }

    // Apollo mode
    try {
      const input: PlantInput = {
        name: form.name,
        code: form.code,
        status: form.status,
        building: form.building || undefined,
        address: form.address || undefined,
        timezone: form.timezone || undefined,
        defaultCalendarId: form.defaultCalendarId || undefined,
        defaultScheduleId: form.defaultScheduleId || undefined,
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
    } catch {
      return { ok: false, errors: { _form: "Failed to save plant. Please try again." } };
    }
  }, [createMutation, updateMutation, refetch, isMockFallback, gqlData]);

  const toggleStatus = useCallback(async (id: string): Promise<boolean> => {
    if (isMockFallback) {
      const plant = mockPlants.find((p) => p.id === id);
      if (plant) {
        plant.status = plant.status === "active" ? "inactive" : "active";
        plant.isActive = !plant.isActive;
      }
      return true;
    }
    try {
      await toggleMutation({ variables: { id } });
      await refetch();
      return true;
    } catch {
      return false;
    }
  }, [toggleMutation, refetch, isMockFallback]);

  const deletePlant = useCallback(async (id: string): Promise<{ success: boolean; inUse: boolean; message: string }> => {
    if (isMockFallback) {
      const idx = mockPlants.findIndex((p) => p.id === id);
      if (idx >= 0) {
        const plant = mockPlants[idx];
        if (plant.lineCount > 0 || plant.departmentCount > 0 || plant.groupCount > 0 || plant.resourceCount > 0) {
          return { success: false, inUse: true, message: "Plant is in use. Disable instead." };
        }
        mockPlants.splice(idx, 1);
      }
      return { success: true, inUse: false, message: "Plant deleted." };
    }
    try {
      const { data } = await deleteMutation({ variables: { id } });
      if (data?.deletePlant) {
        if (data.deletePlant.inUse) {
          return { success: false, inUse: true, message: data.deletePlant.message || "Plant is in use. Disable instead." };
        }
        await refetch();
        return { success: data.deletePlant.success, inUse: false, message: data.deletePlant.message || "Plant deleted." };
      }
      return { success: false, inUse: false, message: "Failed to delete plant." };
    } catch {
      return { success: false, inUse: false, message: "Failed to delete plant. Please try again." };
    }
  }, [deleteMutation, refetch, isMockFallback]);

  const loading = gqlLoading && !isMockFallback;

  return {
    plants,
    loading,
    isMockFallback,
    saveLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    savePlant,
    toggleStatus,
    deletePlant,
    refetch,
  };
}

/* ── Mock filter helper ── */

function filterMockPlants(search: string, statusFilter: string): Plant[] {
  let filtered = [...mockPlants];
  if (statusFilter !== "all") {
    filtered = filtered.filter((p) => p.status === statusFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.building.toLowerCase().includes(q)
    );
  }
  return filtered;
}
