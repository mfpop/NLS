import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import type { DocumentationContent } from "./documentationTypes";
import { statusClassName } from "./documentationMeta";

interface MarkdownReaderProps {
  document: DocumentationContent | null;
  onSelectRelated: (name: string) => void;
}

interface MermaidBlockProps {
  chart: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function extractText(children: unknown): string {
  if (typeof children === "string") {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map((child) => extractText(child)).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    const value = children as { props?: { children?: unknown } };
    return extractText(value.props?.children);
  }

  return "";
}

function MermaidBlock({ chart }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const renderResult = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(renderResult.svg);
          setHasError(false);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setSvg(null);
        }
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (hasError || !svg) {
    return <pre className="docs-code-block">{chart}</pre>;
  }

  return <div className="docs-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function copyText(value: string) {
  void navigator.clipboard.writeText(value);
}

export function MarkdownReader({ document, onSelectRelated }: MarkdownReaderProps) {
  const headingSet = useMemo(() => new Set(document?.headings ?? []), [document?.headings]);

  if (!document) {
    return (
      <section className="docs-panel docs-panel--reader" aria-label="Markdown Reader">
        <div className="docs-panel__header">
          <h2>Markdown Reader</h2>
        </div>
        <div className="docs-empty">Select a document to read.</div>
      </section>
    );
  }

  return (
    <section className="docs-panel docs-panel--reader" aria-label="Markdown Reader">
      <div className="docs-reader-header">
        <div>
          <h2>{document.name}</h2>
          <p className="docs-muted">{document.purpose}</p>
        </div>
        <div className="docs-reader-header__actions">
          <span className="doc-category-badge">{document.category}</span>
          <span className={statusClassName(document.status)}>{document.status}</span>
          <button type="button" className="docs-action" onClick={() => copyText(document.content)}>
            Copy full document
          </button>
          <button type="button" className="docs-action" onClick={() => copyText(document.path)}>
            Copy file path
          </button>
        </div>
      </div>

      <div className="docs-reader-body markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code({ className, children, ...props }) {
              const language = className?.replace("language-", "") ?? "";
              const raw = String(children).replace(/\n$/, "");
              if (language === "mermaid") {
                return <MermaidBlock chart={raw} />;
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            h1({ children }) {
              const title = extractText(children);
              const id = slugify(title);
              return (
                <h1 id={id}>
                  <a className="docs-anchor" href={`#${id}`}>
                    #
                  </a>
                  {children}
                  {headingSet.has(title) ? (
                    <button
                      type="button"
                      className="docs-section-copy"
                      onClick={() => copyText(`${title}\n\n${document.content}`)}
                    >
                      Copy section
                    </button>
                  ) : null}
                </h1>
              );
            },
            h2({ children }) {
              const title = extractText(children);
              const id = slugify(title);
              return (
                <h2 id={id}>
                  <a className="docs-anchor" href={`#${id}`}>
                    #
                  </a>
                  {children}
                  {headingSet.has(title) ? (
                    <button
                      type="button"
                      className="docs-section-copy"
                      onClick={() => copyText(`${title}\n\n${document.content}`)}
                    >
                      Copy section
                    </button>
                  ) : null}
                </h2>
              );
            },
          }}
        >
          {document.content}
        </ReactMarkdown>
      </div>

      <footer className="docs-reader-footer">
        <span>Last updated: {formatDate(document.lastModified)}</span>
        <span>Path: {document.path}</span>
        <div className="docs-related-inline">
          Related:
          {document.relatedDocs.length === 0 ? (
            <span className="docs-muted"> none</span>
          ) : (
            document.relatedDocs.map((name) => (
              <button key={name} type="button" className="docs-link-button" onClick={() => onSelectRelated(name)}>
                {name}
              </button>
            ))
          )}
        </div>
      </footer>
    </section>
  );
}
