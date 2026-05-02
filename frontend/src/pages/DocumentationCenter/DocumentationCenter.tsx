import { useDocumentTitle } from "@/hooks";
import { useDocumentation } from "@/hooks/useDocumentation";
import { APP_NAME } from "@/config";
import { DocumentInspector } from "./DocumentInspector";
import { DocumentLibrary } from "./DocumentLibrary";
import { MarkdownReader } from "./MarkdownReader";

export function DocumentationCenter() {
  useDocumentTitle(`${APP_NAME} · Documentation Center`);

  const {
    categories,
    categoryFilter,
    fileError,
    filesError,
    filesLoading,
    filteredFiles,
    isFileLoading,
    searchTerm,
    selectedContent,
    selectedName,
    setCategoryFilter,
    setSearchTerm,
    setSelectedName,
    setStatusFilter,
    statusFilter,
    files,
  } = useDocumentation();

  const hasAnyDocs = files.length > 0;

  return (
    <section className="docs-page" aria-label="Documentation Center">
      <DocumentLibrary
        categories={categories}
        categoryFilter={categoryFilter}
        files={filteredFiles}
        onCategoryChange={setCategoryFilter}
        onSearchChange={setSearchTerm}
        onSelect={setSelectedName}
        onStatusChange={setStatusFilter}
        searchTerm={searchTerm}
        selectedName={selectedName}
        statusFilter={statusFilter}
      />

      {filesLoading ? (
        <section className="docs-panel docs-panel--reader">
          <div className="docs-empty">Loading documentation index...</div>
        </section>
      ) : filesError ? (
        <section className="docs-panel docs-panel--reader">
          <div className="docs-empty">Document library could not be loaded.</div>
        </section>
      ) : !hasAnyDocs ? (
        <section className="docs-panel docs-panel--reader">
          <div className="docs-empty">No markdown documents found.</div>
        </section>
      ) : fileError ? (
        <section className="docs-panel docs-panel--reader">
          <div className="docs-empty">Document could not be loaded.</div>
        </section>
      ) : isFileLoading && !selectedContent ? (
        <section className="docs-panel docs-panel--reader">
          <div className="docs-empty">Loading selected document...</div>
        </section>
      ) : (
        <MarkdownReader document={selectedContent} onSelectRelated={setSelectedName} />
      )}

      <DocumentInspector document={selectedContent} files={files} onSelectRelated={setSelectedName} />
    </section>
  );
}
