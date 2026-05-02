import type { ChecklistItem, DocumentationMeta } from "./documentationTypes";

export const DOC_META: Record<string, DocumentationMeta> = {
  "README.md": {
    category: "Entry Point",
    status: "Canonical",
    purpose: "Project entry point for developers.",
    relatedDocs: ["DOMAIN_HANDBOOK.md", "DOMAIN_SPEC.md"],
    governanceRole: "Entry point",
  },
  "DOMAIN_CONSTITUTION.md": {
    category: "Domain Authority",
    status: "Canonical",
    purpose: "Human-facing non-negotiable domain laws.",
    relatedDocs: ["Modelfile-architect.md", "DOMAIN_SPEC.md"],
    governanceRole: "Human law",
  },
  "Modelfile-architect.md": {
    category: "Domain Authority",
    status: "Canonical",
    purpose: "AI architect enforcement policy for domain invariants.",
    relatedDocs: ["DOMAIN_CONSTITUTION.md", "DOMAIN_SPEC.md"],
    governanceRole: "AI enforcement",
  },
  "DOMAIN_HANDBOOK.md": {
    category: "Domain Understanding",
    status: "Reference",
    purpose: "Human explanation of factory flow and domain concepts.",
    relatedDocs: ["DOMAIN_SPEC.md", "DOMAIN_GLOSSARY.md"],
    governanceRole: "Conceptual guide",
  },
  "DOMAIN_GLOSSARY.md": {
    category: "Domain Understanding",
    status: "Draft",
    purpose: "Domain vocabulary and term alignment.",
    relatedDocs: ["DOMAIN_HANDBOOK.md", "DOMAIN_SPEC.md"],
    governanceRole: "Conceptual guide",
  },
  "DOMAIN_SPEC.md": {
    category: "Implementation Spec",
    status: "Reference",
    purpose: "Code-level domain implementation reference.",
    relatedDocs: ["DOMAIN_CONSTITUTION.md", "DOMAIN_HANDBOOK.md"],
    governanceRole: "Code-level spec",
  },
  "Backend_Refactor_Spec.md": {
    category: "Implementation Spec",
    status: "Needs Review",
    purpose: "Backend implementation target constraints.",
    relatedDocs: ["DOMAIN_SPEC.md", "ARCHITECTURE.md"],
    governanceRole: "Code-level spec",
  },
  "API_GUIDE.md": {
    category: "Implementation Spec",
    status: "Reference",
    purpose: "API and integration usage guide.",
    relatedDocs: ["DOMAIN_SPEC.md", "ARCHITECTURE.md"],
    governanceRole: "API guide",
  },
  "DOMAIN_SERVICES_GUIDE.md": {
    category: "Implementation Spec",
    status: "Draft",
    purpose: "Domain service boundary and signature guidance.",
    relatedDocs: ["DOMAIN_SPEC.md", "EVENT_SOURCING_GUIDE.md"],
    governanceRole: "Code-level spec",
  },
  "EVENT_SOURCING_GUIDE.md": {
    category: "Implementation Spec",
    status: "Reference",
    purpose: "Event sourcing constraints and usage guidance.",
    relatedDocs: ["DOMAIN_EVENTS_REFERENCE.md", "DOMAIN_SPEC.md"],
    governanceRole: "Code-level spec",
  },
  "KPI_ENGINE_GUIDE.md": {
    category: "Implementation Spec",
    status: "Reference",
    purpose: "KPI engine design and traceability rules.",
    relatedDocs: ["DOMAIN_CONSTITUTION.md", "EVENT_SOURCING_GUIDE.md"],
    governanceRole: "Code-level spec",
  },
  "ARCHITECTURE.md": {
    category: "Architecture",
    status: "Reference",
    purpose: "System architecture boundaries and layering.",
    relatedDocs: ["DIAGRAMS.md", "DOMAIN_SPEC.md"],
    governanceRole: "Architecture guide",
  },
  "DIAGRAMS.md": {
    category: "Architecture",
    status: "Draft",
    purpose: "Architecture and flow diagram references.",
    relatedDocs: ["ARCHITECTURE.md", "VSM_DIAGRAMS_ADVANCED.md"],
    governanceRole: "Architecture guide",
  },
  "VSM_DIAGRAMS_ADVANCED.md": {
    category: "Architecture",
    status: "Draft",
    purpose: "Advanced VSM diagram library.",
    relatedDocs: ["DIAGRAMS.md", "VSM_GLOSSARY.md"],
    governanceRole: "Architecture guide",
  },
  "VSM_GLOSSARY.md": {
    category: "Lean / VSM",
    status: "Draft",
    purpose: "Lean and VSM term glossary.",
    relatedDocs: ["DOMAIN_GLOSSARY.md", "VSM_DIAGRAMS_ADVANCED.md"],
    governanceRole: "Conceptual guide",
  },
  "DOMAIN_EVENTS_REFERENCE.md": {
    category: "Lean / VSM",
    status: "Draft",
    purpose: "Domain event catalog reference.",
    relatedDocs: ["EVENT_SOURCING_GUIDE.md", "DOMAIN_SPEC.md"],
    governanceRole: "Code-level spec",
  },
  "CONTRIBUTING.md": {
    category: "Contribution / Onboarding",
    status: "Draft",
    purpose: "Contribution standards and workflow.",
    relatedDocs: ["DEVELOPER_ONBOARDING.md", "README.md"],
    governanceRole: "Contribution guide",
  },
  "DEVELOPER_ONBOARDING.md": {
    category: "Contribution / Onboarding",
    status: "Draft",
    purpose: "Developer onboarding and setup guide.",
    relatedDocs: ["README.md", "CONTRIBUTING.md"],
    governanceRole: "Onboarding guide",
  },
  "Modelfile-coder.md": {
    category: "Local AI / Modelfiles",
    status: "Needs Review",
    purpose: "Local AI coder profile instructions.",
    relatedDocs: ["Modelfile-architect.md", "ollama-coder.md"],
    governanceRole: "AI profile",
  },
  "ollama-architect.md": {
    category: "Local AI / Modelfiles",
    status: "Needs Review",
    purpose: "Ollama architect profile instructions.",
    relatedDocs: ["Modelfile-architect.md", "ollama-coder.md"],
    governanceRole: "AI profile",
  },
  "ollama-coder.md": {
    category: "Local AI / Modelfiles",
    status: "Needs Review",
    purpose: "Ollama coder profile instructions.",
    relatedDocs: ["Modelfile-coder.md", "ollama-architect.md"],
    governanceRole: "AI profile",
  },
};

export const STATUS_FILTERS = ["All", "Canonical", "Reference", "Draft", "Needs Review", "Deprecated"] as const;

export function statusClassName(status: string): string {
  switch (status) {
    case "Canonical":
      return "doc-status doc-status--canonical";
    case "Reference":
      return "doc-status doc-status--reference";
    case "Draft":
      return "doc-status doc-status--draft";
    case "Needs Review":
      return "doc-status doc-status--review";
    default:
      return "doc-status doc-status--deprecated";
  }
}

function includesAny(content: string, needles: string[]): boolean {
  const lower = content.toLowerCase();
  return needles.some((needle) => lower.includes(needle));
}

export function buildChecklist(documentName: string, content: string): ChecklistItem[] {
  const normalized = content.toLowerCase();

  if (documentName === "README.md") {
    return [
      { label: "No deep invariants", passed: !normalized.includes("absolute architectural laws") },
      { label: "No laws", passed: !normalized.includes("final law") },
      { label: "No failure conditions", passed: !normalized.includes("system failure conditions") },
      { label: "Has setup", passed: includesAny(content, ["## Setup", "### Backend", "### Frontend"]) },
      { label: "Has GraphQL endpoint", passed: includesAny(content, ["/graphql", "graphql endpoint"]) },
    ];
  }

  if (documentName === "DOMAIN_CONSTITUTION.md") {
    return [
      { label: "Has absolute laws", passed: includesAny(content, ["absolute architectural laws", "non-negotiable", "core invariants"]) },
      { label: "Has invariants", passed: includesAny(content, ["invariant", "invariants"]) },
      { label: "Has failure conditions", passed: includesAny(content, ["failure conditions", "invalid if"]) },
      { label: "Has KPI laws", passed: includesAny(content, ["kpi", "oee", "traceable"]) },
      { label: "Has VSM laws", passed: includesAny(content, ["vsm", "flow model", "production control"]) },
    ];
  }

  if (documentName === "DOMAIN_SPEC.md") {
    return [
      { label: "Has entities", passed: includesAny(content, ["entity", "entities", "aggregate"]) },
      { label: "Has fields", passed: includesAny(content, ["fields", "properties", "attributes"]) },
      { label: "Has relationships", passed: includesAny(content, ["relationship", "cardinality", "associations"]) },
      { label: "Has events", passed: includesAny(content, ["event", "events"]) },
      { label: "Has service signatures", passed: includesAny(content, ["service", "signature", "use case"]) },
    ];
  }

  if (documentName === "DOMAIN_HANDBOOK.md") {
    return [
      { label: "Explains concepts in human language", passed: includesAny(content, ["concept", "explain", "overview"]) },
      { label: "Explains factory flow", passed: includesAny(content, ["factory flow", "process flow", "material flow"]) },
      { label: "Explains shared resources", passed: includesAny(content, ["shared resource", "resource group"]) },
      { label: "Explains routing versioning", passed: includesAny(content, ["routing version", "versioned flow"]) },
      { label: "Explains KPI traceability", passed: includesAny(content, ["traceability", "kpi", "event"]) },
    ];
  }

  if (documentName === "Modelfile-architect.md") {
    return [
      { label: "Mirrors constitution", passed: includesAny(content, ["absolute architectural laws", "core invariants"]) },
      { label: "Enforces rejection behavior", passed: includesAny(content, ["reject", "must reject", "invalid"]) },
      { label: "Contains no app UI instructions", passed: !includesAny(content, ["button", "component", "tailwind", "css class"]) },
    ];
  }

  return [
    { label: "Document has content", passed: normalized.trim().length > 0 },
    { label: "Document has purpose metadata", passed: documentName in DOC_META },
  ];
}
