import type { DocumentationFile, StatusFilter } from "./documentationTypes";
import { STATUS_FILTERS, statusClassName } from "./documentationMeta";

interface DocumentLibraryProps {
  files: DocumentationFile[];
  categories: string[];
  selectedName: string | null;
  searchTerm: string;
  statusFilter: StatusFilter;
  categoryFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onCategoryChange: (value: string) => void;
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
  categories,
  categoryFilter,
  files,
  onCategoryChange,
  onSearchChange,
  onSelect,
  onStatusChange,
  searchTerm,
  selectedName,
  statusFilter,
}: DocumentLibraryProps) {
  return (
    <section className="docs-panel docs-panel--library" aria-label="Document Library">
      <div className="docs-panel__header">
        <h2>Document Library</h2>
      </div>
      <div className="docs-library-controls">
        <input
          className="docs-input"
          type="search"
          placeholder="Search by file, category, purpose..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <select
          className="docs-select"
          value={categoryFilter}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          className="docs-select"
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="docs-library-list" role="list">
        {files.length === 0 ? (
          <p className="docs-muted">No markdown documents found.</p>
        ) : (
          files.map((file) => {
            const selected = file.name === selectedName;

            return (
              <button
                key={file.name}
                type="button"
                className={`docs-file-row${selected ? " docs-file-row--selected" : ""}`}
                onClick={() => onSelect(file.name)}
                role="listitem"
              >
                <div className="docs-file-row__title">
                  <span className="docs-file-row__icon" aria-hidden="true">
                    📄
                  </span>
                  <span>{file.name}</span>
                </div>
                <div className="docs-file-row__meta">
                  <span>{file.category}</span>
                  <span>{file.sizeKb.toFixed(1)} KB</span>
                  <span>{formatDate(file.lastModified)}</span>
                </div>
                <span className={statusClassName(file.status)}>{file.status}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
