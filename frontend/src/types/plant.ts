export interface Plant {
  id: string;
  code: string;
  name: string;
  status: string;
  building: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  timezone: string;
  latitude: string;
  longitude: string;
  plantType: string;
  operatingSince: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  defaultCalendar: string;
  defaultShiftModel: string;
  weekStartDay: string;
  defaultSchedule: string;
  manufacturingFocus: string;
  description: string;
  lineCount?: number;
  departmentCount?: number;
  groupCount?: number;
  resourceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlantInput {
  name: string;
  code: string;
  status: string;
  building?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  timezone?: string;
  latitude?: string;
  longitude?: string;
  plantType?: string;
  operatingSince?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  defaultCalendar?: string;
  defaultShiftModel?: string;
  weekStartDay?: string;
  defaultSchedule?: string;
  manufacturingFocus?: string;
  description?: string;
}

export interface PlantFormData {
  name: string;
  code: string;
  status: string;
  building: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  timezone: string;
  latitude: string;
  longitude: string;
  plantType: string;
  operatingSince: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  defaultCalendar: string;
  defaultShiftModel: string;
  weekStartDay: string;
  defaultSchedule: string;
  manufacturingFocus: string;
  description: string;
}

export interface PlantsQueryData {
  plants: Plant[];
}

export interface PlantQueryData {
  plant: Plant;
}

export interface PlantMutationResult {
  plant?: Plant;
  errors?: Array<{ field: string; message: string }>;
}

export interface DeletePlantResult {
  success: boolean;
  inUse: boolean;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface CreatePlantData {
  createPlant: PlantMutationResult;
}

export interface UpdatePlantData {
  updatePlant: PlantMutationResult;
}

export interface TogglePlantStatusData {
  togglePlantStatus: PlantMutationResult;
}

export interface DeletePlantData {
  deletePlant: DeletePlantResult;
}

export interface PlantsQueryVars {
  search?: string;
  status?: string;
}

export interface PlantQueryVars {
  id: string;
}

export interface CreatePlantVars {
  input: PlantInput;
}

export interface UpdatePlantVars {
  id: string;
  input: PlantInput;
}

export interface TogglePlantStatusVars {
  id: string;
}

export interface DeletePlantVars {
  id: string;
}
