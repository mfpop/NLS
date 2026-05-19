import type { KnowledgeModuleConfig } from "./types";

export const WORK_INSTRUCTIONS_CONFIG: KnowledgeModuleConfig = {
  moduleKey: "work-instructions",
  title: "Work Instructions",
  subtitle: "Routing and resource instructions, visual aids, setup, changeover, inspections, and tooling — linked to real process.",
  categories: [
    "Routing Instructions",
    "Resource Instructions",
    "Inspection Instructions",
    "Tooling Instructions",
    "Setup Instructions",
    "Changeover Instructions",
  ],
  allowedLinkTypes: ["ProductionLine", "RoutingStep", "ResourceGroup", "Resource"],
};

export const STANDARD_WORK_CONFIG: KnowledgeModuleConfig = {
  moduleKey: "standard-work",
  title: "Standard Work",
  subtitle: "Takt, cycle, operator sequence, WIP, line balance rules, and combination sheets — knowledge only, no operational balancing.",
  categories: [
    "Takt Standards",
    "Cycle Time Standards",
    "Standard WIP",
    "Operator Standards",
    "Line Balance Standards",
    "Yamazumi Standards",
    "Standard Work Combination Sheets",
  ],
  allowedLinkTypes: ["ProductionLine", "ResourceGroup"],
  showOperationalYamazumiLink: true,
};

export const MATERIAL_FLOW_CONFIG: KnowledgeModuleConfig = {
  moduleKey: "material-flow-standards",
  title: "Material Flow Standards",
  subtitle: "FIFO, supermarket, kanban, RM/WIP/FG, scrap, quarantine, and bin standards linked to material flow.",
  categories: ["FIFO Rules", "Supermarket Rules", "Kanban Rules", "Bin Standards", "RM/WIP/FG Flow", "Scrap Flow", "Quarantine Flow"],
  allowedLinkTypes: ["MaterialBin", "RoutingStep", "ResourceGroup", "ProductionLine"],
};

export const PROCEDURES_CONFIG: KnowledgeModuleConfig = {
  moduleKey: "procedures",
  title: "Procedures",
  subtitle: "SOPs, escalation, startup/shutdown, maintenance, and safety procedures linked to plant and department structure.",
  categories: ["SOP", "Startup/Shutdown", "Escalation", "Quality Procedures", "Maintenance Procedures", "Safety Procedures"],
  allowedLinkTypes: ["Plant", "Department", "ResourceGroup"],
};

export const DOCUMENT_CONTROL_CONFIG: KnowledgeModuleConfig = {
  moduleKey: "document-control",
  title: "Document Control",
  subtitle: "Active documents, drafts, approvals, obsolete archive, and revision tracking across Standardize.",
  categories: ["All modules"],
  allowedLinkTypes: ["ProductionLine", "RoutingStep", "ResourceGroup", "Resource", "MaterialBin", "Plant", "Department"],
};
