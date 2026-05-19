export type DocumentRevisionStatus = "active" | "draft" | "pending" | "obsolete";

export type ManufacturingLinkType =
  | "ProductionLine"
  | "RoutingStep"
  | "ResourceGroup"
  | "Resource"
  | "MaterialBin"
  | "Plant"
  | "Department";

export interface ManufacturingLink {
  type: ManufacturingLinkType;
  id: string;
  label: string;
  href: string;
}

export interface KnowledgeDocument {
  id: string;
  category: string;
  title: string;
  owner: string;
  revision: string;
  status: DocumentRevisionStatus;
  effectiveDate: string;
  visualSummary: string;
  workSequence: string[];
  safetyQualityNotes: string[];
  links: ManufacturingLink[];
}

export interface KnowledgeModuleConfig {
  moduleKey: string;
  title: string;
  subtitle: string;
  categories: string[];
  allowedLinkTypes: ManufacturingLinkType[];
  showOperationalYamazumiLink?: boolean;
}
