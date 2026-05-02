export type DocumentationStatus =
  | "Canonical"
  | "Reference"
  | "Draft"
  | "Deprecated"
  | "Needs Review";

export interface DocumentationFile {
  name: string;
  path: string;
  category: string;
  status: DocumentationStatus;
  sizeKb: number;
  lastModified?: string | null;
  purpose?: string | null;
  relatedDocs: string[];
}

export interface DocumentationContent extends DocumentationFile {
  content: string;
  headings: string[];
}

export interface DocumentationFileQueryData {
  documentationFile: DocumentationContent;
}

export interface DocumentationFileQueryVars {
  name: string;
}

export interface DocumentationFilesQueryData {
  documentationFiles: DocumentationFile[];
}

export interface ChecklistItem {
  label: string;
  passed: boolean;
}

export interface DocumentationMeta {
  category: string;
  status: DocumentationStatus;
  purpose: string;
  relatedDocs: string[];
  governanceRole: string;
}

export type StatusFilter = DocumentationStatus | "All";
