import { AlertTriangle, BadgeCheck, Clock3, ShieldCheck } from "lucide-react";
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
    <aside className="h-full" aria-label="Document Intelligence">
      <div className="insights-header">
        <p className="insights-title">Insights</p>
        <h2 className="insights-heading">Document Intelligence</h2>
        <p className="insights-subtitle">Governance signals, relationships, and quick maintenance guidance.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
      <section className="mb-3 grid grid-cols-1 gap-2" aria-label="Documentation health">
        <div className="insight-card insights-card primary canonical">
          <div className="stat-box">
            <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" />
            <span className="insight-card-title">Canonical</span>
            </div>
            <p className="insight-card-value">{canonicalCount}</p>
          </div>
        </div>
        <div className="insight-card insights-card warning">
          <div className="stat-box">
            <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            <span className="insight-card-title">Needs Review</span>
            </div>
            <p className="insight-card-value">{needsReviewCount}</p>
          </div>
        </div>
        <div className="insight-card insights-card danger">
          <div className="stat-box">
            <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="insight-card-title">Deprecated</span>
            </div>
            <p className="insight-card-value">{deprecatedCount}</p>
          </div>
        </div>
        <div className="insight-card insights-card">
          <div className="stat-box">
            <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="insight-card-title">Latest Update</span>
            </div>
            <p className="line-clamp-1 text-xs font-semibold">{lastUpdatedDoc?.name ?? "Unknown"}</p>
          </div>
        </div>
      </section>

      {!document ? (
        <p className="doc-empty-state mb-3">
          Select a document to inspect its governance role, checklist, and related references.
        </p>
      ) : (
        <>
          <section className="insight-card insights-card">
            <h3 className="insights-card-title">Purpose</h3>
            <p className="insights-card-copy">{document.purpose}</p>
          </section>

          <section className="insight-card insights-card primary canonical">
            <h3 className="insights-card-title">Governance Role</h3>
            <p className="insights-card-copy">{meta?.governanceRole ?? "Reference"}</p>
            <p className="insights-card-copy">
              Owner / category: <strong>{document.category}</strong>
            </p>
            <p className="insights-card-copy">
              Status: <span className={statusClassName(document.status)}>{document.status}</span>
            </p>
            <p className="insights-card-copy">Architecture risk level: {document.status === "Canonical" ? "Low" : "Medium"}</p>
            <p className="insights-card-copy">Last updated: {formatDate(document.lastModified)}</p>
          </section>

          <section className="insight-card insights-card">
            <h3 className="insights-card-title">Related Documents</h3>
            {document.relatedDocs.length === 0 ? (
              <p className="insights-card-copy">No related documents listed.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {document.relatedDocs.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="copy-btn copy-section-btn"
                    onClick={() => onSelectRelated(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="insight-card insights-card warning">
            <h3 className="insights-card-title">Validation Checklist</h3>
            <ul className="mt-2 space-y-1">
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className={
                    "rounded-xl px-3 py-2 text-xs font-medium " +
                    (item.passed
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400")
                  }
                >
                  <span>{item.passed ? "✓" : "!"}</span> {item.label}
                </li>
              ))}
            </ul>
          </section>

          <section className="insight-card insights-card">
            <h3 className="insights-card-title">Suggested Maintenance</h3>
            <ul className="insights-list mt-2 list-disc space-y-1 pl-5">
              <li>Keep README short and onboarding-focused.</li>
              <li>Avoid duplicating constitutional laws across files.</li>
              <li>Update implementation specs when entities or contracts change.</li>
              <li>Update modelfiles only when constitution and governance rules change.</li>
            </ul>
          </section>
        </>
      )}
      </div>
    </aside>
  );
}
