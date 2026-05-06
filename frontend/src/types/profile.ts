export interface WorkHistoryEntry {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface EducationEntry {
  id: string;
  degree: string;
  school: string;
  period: string;
}

export interface Profile {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  plant: string;
  department: string;
  reportsTo: string;
  language: string;
  about: string;
  createdAt: string;
  updatedAt: string;
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
}

export interface ProfileQueryData {
  profile: Profile;
}

export interface WorkHistoryInput {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface EducationInput {
  id: string;
  degree: string;
  school: string;
  period: string;
}

export interface ProfileInput {
  name: string;
  role: string;
  email: string;
  phone?: string;
  location?: string;
  plant?: string;
  department?: string;
  reportsTo?: string;
  language?: string;
  about?: string;
  workHistory?: WorkHistoryInput[];
  education?: EducationInput[];
}

export interface ProfileMutationResult {
  updateProfile: {
    profile?: Profile;
    errors?: Array<{ field: string; message: string }>;
  };
}
