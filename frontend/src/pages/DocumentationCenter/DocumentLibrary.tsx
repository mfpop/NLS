import { FileText } from "lucide-react";
import type { DocumentationFile } from "./documentationTypes";
import { statusClassName } from "./documentationMeta";

interface DocumentLibraryProps {
  files: DocumentationFile[];
  selectedName: string | null;
  onSelect: (name: string) => void;
}

function formatDate(iso?: string | null): string {
  if (!iso) {
    return "Unknown";
  }

  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) {
    return "Unknown";
  }

  return value.toLocaleDateString();
}

export function DocumentLibrary({
  files,
  onSelect,
  selectedName,
}: DocumentLibraryProps) {
  return (
    <section className="doc-library" aria-label="Document Library">
      <div className="doc-library__header">
        <div className="min-w-0">
          <p className="doc-library__eyebrow">Library</p>
          <h2 className="doc-library__title">Document Library</h2>
          <p className="doc-library__subtitle">Pick a governed document from the indexed library.</p>
        </div>
        <span className="doc-library__count">
          {files.length}
        </span>
      </div>

      <div className="doc-library__list" role="list">
        {files.length === 0 ? (
          <div className="doc-empty-state">
            No matching documents were found for the current filters.
          </div>
        ) : (
          files.map((file) => {
            const selected = file.name === selectedName;
            const rowClass = "doc-library__row " + (selected ? "doc-library__row--selected" : "");

            return (
              <button
                key={file.name}
                type="button"
                className={rowClass}
                onClick={() => onSelect(file.name)}
                role="listitem"
              >
                <div className="doc-library__row-main">
                  <span className="doc-library__icon">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="doc-library__copy">
                    <div className="doc-library__row-head">
                      <span className="doc-library__name">{file.name}</span>
                      <span className={statusClassName(file.status)}>{file.status}</span>
                    </div>
                    <p className="doc-library__purpose">{file.purpose ?? "No purpose metadata available."}</p>
                    <div className="doc-library__meta">
                      <span>{file.category}</span>
                      <span>{file.sizeKb.toFixed(1)} KB</span>
                      <span>{formatDate(file.lastModified)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
