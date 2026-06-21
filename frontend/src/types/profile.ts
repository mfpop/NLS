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

export interface ProfileSkill {
  id: string;
  userProfileId: string;
  name: string;
  category: "SKILL" | "CERTIFICATION" | "LICENSE" | "TRAINING";
  level: string;
  issuer: string;
  issuedDate: string | null;
  expiresDate: string | null;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSkillInput {
  userProfileId: string;
  name: string;
  category?: string;
  level?: string;
  issuer?: string;
  issuedDate?: string | null;
  expiresDate?: string | null;
  notes?: string;
}

export interface ProfileSkillsQueryData {
  profileSkills: ProfileSkill[];
}

export interface CreateProfileSkillResult {
  createProfileSkill: {
    skill?: ProfileSkill;
    errors?: Array<{ field: string; message: string }>;
  };
}

export interface UpdateProfileSkillResult {
  updateProfileSkill: {
    skill?: ProfileSkill;
    errors?: Array<{ field: string; message: string }>;
  };
}

export interface ArchiveProfileSkillResult {
  archiveProfileSkill: {
    skill?: ProfileSkill;
    errors?: Array<{ field: string; message: string }>;
  };
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
