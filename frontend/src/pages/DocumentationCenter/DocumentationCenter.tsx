import { BookText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks";
import { useDocumentation } from "@/hooks/useDocumentation";
import { APP_NAME } from "@/config";
import { MarkdownReader } from "./MarkdownReader";
import type { DocumentationFile } from "./documentationTypes";

function panelMotion(isReady: boolean, delayMs = 0) {
  return {
    className:
      "transform-gpu transition-all duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none " +
      (isReady ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"),
    style: { transitionDelay: `${delayMs}ms` },
  };
}

const DOC_SUBMENU_RECORDS = {
  core: {
    key: "core",
    title: "Core Documentation",
    subtitle: "Architecture and domain foundation docs.",
    fileNames: ["ARCHITECTURE.md", "DOMAIN_SPEC.md", "DOMAIN_CONSTITUTION.md", "DIAGRAMS.md"],
  },
  setup: {
    key: "setup",
    title: "Setup Reference",
    subtitle: "Installation and environment reference.",
    fileNames: ["README.md"],
  },
} as const;

const CORE_DOC_SLUG_TO_FILE: Record<string, string> = {
  architecture: "ARCHITECTURE.md",
  "domain-spec": "DOMAIN_SPEC.md",
  "domain-constitution": "DOMAIN_CONSTITUTION.md",
  diagrams: "DIAGRAMS.md",
};

type DocsScope = keyof typeof DOC_SUBMENU_RECORDS;

function byName(fileName: string, files: DocumentationFile[]) {
  return files.find((file) => file.name.toLowerCase() === fileName.toLowerCase()) ?? null;
}

export function DocumentationCenter() {
  useDocumentTitle(`${APP_NAME} · Documentation Center`);
  const { pathname } = useLocation();
  const { docSlug } = useParams<{ docSlug?: string }>();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const {
    fileError,
    filesError,
    filesLoading,
    filteredFiles,
    isFileLoading,
    selectedContent,
    selectedName,
    setSelectedName,
  } = useDocumentation();

  const docsScope: DocsScope = pathname.startsWith("/docs/setup") ? "setup" : "core";
  const scopeRecord = DOC_SUBMENU_RECORDS[docsScope];
  const routeDocumentName =
    docsScope === "setup" ? "README.md" : docSlug ? CORE_DOC_SLUG_TO_FILE[docSlug.toLowerCase()] ?? null : null;

  const scopedFiles = useMemo(
    () =>
      scopeRecord.fileNames
        .map((fileName) => byName(fileName, filteredFiles))
        .filter((file): file is DocumentationFile => Boolean(file)),
    [filteredFiles, scopeRecord.fileNames]
  );

  const firstVisibleDocument = scopedFiles[0] ?? null;

  useEffect(() => {
    if (routeDocumentName && scopedFiles.some((file) => file.name === routeDocumentName) && selectedName !== routeDocumentName) {
      setSelectedName(routeDocumentName);
      return;
    }

    if (!selectedName && firstVisibleDocument) {
      setSelectedName(firstVisibleDocument.name);
      return;
    }

    if (selectedName && !filteredFiles.some((file) => file.name === selectedName) && firstVisibleDocument) {
      setSelectedName(firstVisibleDocument.name);
    }
  }, [filteredFiles, firstVisibleDocument, routeDocumentName, scopedFiles, selectedName, setSelectedName]);

  const hasAnyDocs = scopedFiles.length > 0;
  const selectedDocumentContent =
    selectedContent && scopedFiles.some((file) => file.name === selectedContent.name) ? selectedContent : null;

  return (
    <main className="documentation-center-page" aria-label="Documentation Center">
      <div className="documentation-center-shell">
      <header
        className={"doc-header h-16 " + panelMotion(isReady).className}
        style={panelMotion(isReady).style}
      >
        <div className="doc-title-group">
          <div className="doc-icon">
            <BookText className="h-4 w-4" />
          </div>
          <div>
            <h1 className="doc-header-title">Documentation Center</h1>
            <p className="doc-header-subtitle">
              {scopeRecord.title} · {scopeRecord.subtitle}
            </p>
          </div>
        </div>

      </header>

      <div className={"doc-body p-0 gap-0 " + panelMotion(isReady, 170).className} style={panelMotion(isReady, 170).style}>

        {filesLoading ? (
          <section className="reader-panel">
            <div className="empty-state">
              <div className="empty-box">
                <p className="empty-title">Loading documentation</p>
                <p className="empty-subtitle">Building the documentation reader index.</p>
              </div>
            </div>
          </section>
        ) : filesError ? (
          <section className="reader-panel">
            <div className="empty-state">
              <div className="empty-box">
                <p className="empty-title">Unable to load documentation</p>
                <p className="empty-subtitle">The documentation list could not be loaded.</p>
              </div>
            </div>
          </section>
        ) : !hasAnyDocs ? (
          <section className="reader-panel">
            <div className="empty-state">
              <div className="empty-box">
                <p className="empty-title">No documentation found</p>
                <p className="empty-subtitle">No markdown files are available for {scopeRecord.title}.</p>
              </div>
            </div>
          </section>
        ) : fileError ? (
          <section className="reader-panel">
            <div className="empty-state">
              <div className="empty-box">
                <p className="empty-title">Unable to open document</p>
                <p className="empty-subtitle">The selected document could not be loaded.</p>
              </div>
            </div>
          </section>
        ) : isFileLoading && !selectedContent ? (
          <section className="reader-panel">
            <div className="empty-state">
              <div className="empty-box">
                <p className="empty-title">Opening document</p>
                <p className="empty-subtitle">Loading selected document content.</p>
              </div>
            </div>
          </section>
        ) : selectedDocumentContent ? (
          <MarkdownReader document={selectedDocumentContent} />
        ) : (
          <section className="reader-panel">
            <div className="empty-state">
              <div className="empty-box">
                <p className="empty-title">No document selected</p>
                <p className="empty-subtitle">Choose a documentation submenu to start reading.</p>
                <button
                  type="button"
                  className="doc-control-btn mt-4"
                  onClick={() => {
                    if (firstVisibleDocument) {
                      setSelectedName(firstVisibleDocument.name);
                    }
                  }}
                  disabled={!firstVisibleDocument}
                >
                  Open first document
                </button>
              </div>
            </div>
          </section>
        )}

      </div>
      </div>
    </main>
  );
}
