import { buildChecklist, DOC_META, statusClassName } from "./documentationMeta";
import type { DocumentationContent, DocumentationFile } from "./documentationTypes";

interface DocumentInspectorProps {
  files: DocumentationFile[];
  document: DocumentationContent | null;
  onSelectRelated: (name: string) => void;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

export function DocumentInspector({ document, files, onSelectRelated }: DocumentInspectorProps) {
  const canonicalCount = files.filter((file) => file.status === "Canonical").length;
  const needsReviewCount = files.filter((file) => file.status === "Needs Review").length;
  const deprecatedCount = files.filter((file) => file.status === "Deprecated").length;

  const lastUpdatedDoc = files
    .filter((item) => item.lastModified)
    .sort((a, b) => {
      const aValue = new Date(a.lastModified ?? 0).getTime();
      const bValue = new Date(b.lastModified ?? 0).getTime();
      return bValue - aValue;
    })[0];

  const checklist = document ? buildChecklist(document.name, document.content) : [];
  const meta = document ? DOC_META[document.name] : null;

  return (
    <aside className="docs-panel docs-panel--inspector" aria-label="Document Intelligence">
      <div className="docs-panel__header">
        <h2>Document Intelligence</h2>
      </div>

      <section className="docs-health">
        <h3>Documentation Health</h3>
        <p>Canonical docs: {canonicalCount}</p>
        <p>Needs Review: {needsReviewCount}</p>
        <p>Deprecated: {deprecatedCount}</p>
        <p>Last updated doc: {lastUpdatedDoc?.name ?? "Unknown"}</p>
      </section>

      {!document ? (
        <p className="docs-empty">Select a document to inspect.</p>
      ) : (
        <>
          <section className="docs-section">
            <h3>Purpose</h3>
            <p>{document.purpose}</p>
          </section>

          <section className="docs-section">
            <h3>Governance Role</h3>
            <p>{meta?.governanceRole ?? "Reference"}</p>
            <p>
              Owner / category: <strong>{document.category}</strong>
            </p>
            <p>
              Status: <span className={statusClassName(document.status)}>{document.status}</span>
            </p>
            <p>Architecture risk level: {document.status === "Canonical" ? "Low" : "Medium"}</p>
            <p>Last updated: {formatDate(document.lastModified)}</p>
          </section>

          <section className="docs-section">
            <h3>Related Documents</h3>
            {document.relatedDocs.length === 0 ? (
              <p className="docs-muted">No related documents listed.</p>
            ) : (
              <div className="docs-related-list">
                {document.relatedDocs.map((name) => (
                  <button key={name} type="button" className="docs-link-button" onClick={() => onSelectRelated(name)}>
                    {name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="docs-section">
            <h3>Validation Checklist</h3>
            <ul className="docs-checklist">
              {checklist.map((item) => (
                <li key={item.label} className={item.passed ? "pass" : "warn"}>
                  <span>{item.passed ? "✓" : "!"}</span> {item.label}
                </li>
              ))}
            </ul>
          </section>

          <section className="docs-section">
            <h3>Suggested Maintenance</h3>
            <ul className="docs-maintenance-list">
              <li>Keep README short and onboarding-focused.</li>
              <li>Avoid duplicating constitutional laws across files.</li>
              <li>Update implementation specs when entities or contracts change.</li>
              <li>Update modelfiles only when constitution and governance rules change.</li>
            </ul>
          </section>
        </>
      )}
    </aside>
  );
}
