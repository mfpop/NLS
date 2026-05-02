import { Check, ChevronDown, ChevronUp, Copy, Search } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import type { DocumentationContent } from "./documentationTypes";

interface MarkdownReaderProps {
  document: DocumentationContent | null;
}

interface MermaidBlockProps {
  chart: string;
}

interface SectionHeading {
  id: string;
  level: number;
  text: string;
}

function extractTextContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractTextContent(child)).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    const value = node as { props?: { children?: ReactNode } };
    return extractTextContent(value.props?.children ?? "");
  }

  return "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return normalized || "section";
}

function displayDocumentTitle(name: string): string {
  return name.replace(/\.md$/i, "");
}

const CORE_CONCEPT_PATTERN = /(Execution Truth Engine|Flow Truth Engine|Decision Engine)/g;

function pillClassForConcept(value: string): string {
  if (value === "Execution Truth Engine") {
    return "pill-core";
  }

  if (value === "Flow Truth Engine") {
    return "pill-secondary";
  }

  return "pill-important";
}

function renderWithCoreConceptPills(text: string): ReactNode[] {
  return text.split(CORE_CONCEPT_PATTERN).map((segment, index) => {
    if (/^(Execution Truth Engine|Flow Truth Engine|Decision Engine)$/.test(segment)) {
      return (
        <span key={`pill-${segment}-${index}`} className={`highlight-pill ${pillClassForConcept(segment)}`}>
          {segment}
        </span>
      );
    }

    return segment;
  });
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
    return <pre className="code-block">{chart}</pre>;
  }

  return <div className="mermaid-block" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function MarkdownReader({ document }: MarkdownReaderProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const readerScrollRef = useRef<HTMLDivElement | null>(null);
  const matchesRef = useRef<HTMLElement[]>([]);
  const headingIdCountRef = useRef<Map<string, number>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sectionHeadings, setSectionHeadings] = useState<SectionHeading[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery("");
    setMatchCount(0);
    setActiveMatchIndex(0);
    setCopied(false);
    setSectionHeadings([]);
    setActiveHeadingId(null);
    headingIdCountRef.current = new Map();
  }, [document?.name]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) {
      return;
    }

    const headingNodes = Array.from(root.querySelectorAll("h1, h2, h3")) as HTMLElement[];
    const headings: SectionHeading[] = [];

    for (const node of headingNodes) {
      const text = (node.textContent ?? "").trim();
      const id = node.id;
      if (!text) {
        continue;
      }

      if (!id) {
        continue;
      }

      headings.push({ id, level: Number(node.tagName[1]), text });
    }

    const visibleHeadings = headings.filter((heading) => heading.level >= 2);
    setSectionHeadings(visibleHeadings);
    setActiveHeadingId(visibleHeadings[0]?.id ?? null);
  }, [document?.content]);

  useEffect(() => {
    const root = contentRef.current;
    const scrollContainer = readerScrollRef.current;
    if (!root || !scrollContainer || sectionHeadings.length === 0) {
      return;
    }

    const headingElements = sectionHeadings
      .map((heading) => root.querySelector(`#${CSS.escape(heading.id)}`) as HTMLElement | null)
      .filter((node): node is HTMLElement => Boolean(node));

    if (headingElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      {
        root: scrollContainer,
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0, 1],
      }
    );

    for (const element of headingElements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sectionHeadings]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) {
      return;
    }

    const clearHighlights = () => {
      const marks = Array.from(root.querySelectorAll("mark.reader-find-match"));
      for (const mark of marks) {
        const parent = mark.parentNode;
        if (!parent) {
          continue;
        }
        parent.replaceChild(window.document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
      }
      matchesRef.current = [];
      setMatchCount(0);
      setActiveMatchIndex(0);
    };

    clearHighlights();
    const term = searchQuery.trim();
    if (!term) {
      return;
    }

    const regex = new RegExp(escapeRegExp(term), "gi");
    const walker = window.document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node: Node) {
        const value = node.nodeValue ?? "";
        if (!value.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        const parentElement = node.parentElement;
        if (!parentElement) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parentElement.closest("code, pre, script, style, mark")) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current as Text);
      current = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const original = textNode.nodeValue ?? "";
      regex.lastIndex = 0;
      if (!regex.test(original)) {
        continue;
      }

      regex.lastIndex = 0;
      const fragment = window.document.createDocumentFragment();
      let lastIndex = 0;
      let match = regex.exec(original);

      while (match) {
        const start = match.index;
        const matched = match[0] ?? "";

        if (start > lastIndex) {
          fragment.appendChild(window.document.createTextNode(original.slice(lastIndex, start)));
        }

        const mark = window.document.createElement("mark");
        mark.className = "reader-find-match";
        mark.textContent = matched;
        fragment.appendChild(mark);

        lastIndex = start + matched.length;
        match = regex.exec(original);
      }

      if (lastIndex < original.length) {
        fragment.appendChild(window.document.createTextNode(original.slice(lastIndex)));
      }

      const parent = textNode.parentNode;
      if (parent) {
        parent.replaceChild(fragment, textNode);
      }
    }

    matchesRef.current = Array.from(root.querySelectorAll("mark.reader-find-match"));
    setMatchCount(matchesRef.current.length);
    setActiveMatchIndex(0);
  }, [document?.content, searchQuery]);

  useEffect(() => {
    const matches = matchesRef.current;
    for (const match of matches) {
      match.classList.remove("reader-find-match--active");
    }

    if (matches.length === 0) {
      return;
    }

    const clampedIndex = ((activeMatchIndex % matches.length) + matches.length) % matches.length;
    const activeMatch = matches[clampedIndex];
    activeMatch.classList.add("reader-find-match--active");
    activeMatch.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchIndex, matchCount]);

  const copyDocument = async () => {
    if (!document) {
      return;
    }

    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const scrollToSection = (id: string) => {
    const root = contentRef.current;
    if (!root) {
      return;
    }

    const target = window.document.getElementById(id);
    if (!target || !root.contains(target)) {
      return;
    }

    setActiveHeadingId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nextHeadingId = (text: string): string => {
    const baseId = slugify(text);
    const current = headingIdCountRef.current.get(baseId) ?? 0;
    const next = current + 1;
    headingIdCountRef.current.set(baseId, next);
    return next === 1 ? baseId : `${baseId}-${next}`;
  };


  if (!document) {
    return (
      <section className="reader-panel-frame" aria-label="Markdown Reader">
        <div className="reader-toolbar">
          <p className="reader-eyebrow">Reader</p>
          <h2 className="reader-heading">Documentation Reader</h2>
        </div>
        <div className="reader-content">
          <div className="doc-empty-state">Choose a document from the left list to read it here.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="reader-panel" aria-label="Documentation Reader">
      <div className="reader-header">
        <div>
          <h2 className="reader-title">{displayDocumentTitle(document.name)}</h2>
          <p className="reader-description">{document.purpose ?? document.path}</p>
        </div>
        <div className="reader-actions">
          <button type="button" className="copy-doc-btn" onClick={copyDocument}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <label className="reader-search">
            <Search className="reader-search-icon" />
            <input
              className="reader-search-input"
              type="search"
              placeholder="Search in document..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="reader-search-nav-btn"
            onClick={() => setActiveMatchIndex((index) => index - 1)}
            disabled={matchCount === 0}
            aria-label="Previous match"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="reader-search-nav-btn"
            onClick={() => setActiveMatchIndex((index) => index + 1)}
            disabled={matchCount === 0}
            aria-label="Next match"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <span className="reader-search-count">
            {matchCount === 0 ? "0" : `${((activeMatchIndex % matchCount) + matchCount) % matchCount + 1}/${matchCount}`}
          </span>
        </div>
      </div>

      <div className="reader-content" ref={readerScrollRef}>
        <div className="reader-content-inner">
          <div className="reader-layout">
            <div className="reader-document-box" ref={contentRef}>
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
                  h1({ children, ...props }) {
                    const headingText = extractTextContent(children).trim();
                    const id = nextHeadingId(headingText);
                    return (
                      <h1 id={id} className="doc-section" {...props}>
                        {children}
                      </h1>
                    );
                  },
                  h2({ children, ...props }) {
                    const headingText = extractTextContent(children).trim();
                    const id = nextHeadingId(headingText);
                    return (
                      <h2 id={id} className="doc-section" {...props}>
                        {children}
                      </h2>
                    );
                  },
                  h3({ children, ...props }) {
                    const headingText = extractTextContent(children).trim();
                    const id = nextHeadingId(headingText);
                    return (
                      <h3 id={id} className="doc-section" {...props}>
                        {children}
                      </h3>
                    );
                  },
                  p({ children, ...props }) {
                    const raw = extractTextContent(children).trim();
                    const flowLine = raw.match(/^([A-Za-z][A-Za-z0-9\s_-]{1,40})(\s*(->|→|=>)\s*[A-Za-z][A-Za-z0-9\s_-]{1,40})+$/);
                    if (flowLine) {
                      const segments = raw.split(/(\s*(?:->|=>|→)\s*)/g);
                      return (
                        <div className="flow-line" {...props}>
                          {segments.map((segment, index) =>
                            /(->|=>|→)/.test(segment) ? <span key={`flow-sep-${index}`}>{segment}</span> : segment
                          )}
                        </div>
                      );
                    }

                    const majorSection = raw.match(
                      /^(What the system is|High-Level Architecture|High-Level Domain Model|High-Level VSM Model)\s*:\s*(.+)$/i
                    );
                    if (majorSection) {
                      return (
                        <div className="section-block card" {...props}>
                          <div className="section-title">{majorSection[1]}</div>
                          <div className="section-content">{majorSection[2]}</div>
                        </div>
                      );
                    }

                    const sectionGroup = raw.match(/^(UI|Application|Domain|Infrastructure)\s*:\s+(.+)$/i);
                    if (sectionGroup) {
                      return (
                        <div className="section-block card" {...props}>
                          <div className="section-title">{sectionGroup[1]}</div>
                          <div className="section-content">{sectionGroup[2]}</div>
                        </div>
                      );
                    }

                    const match = raw.match(/^([A-Za-z][A-Za-z0-9_.\s-]{1,48}):\s+(.+)$/);
                    if (match) {
                      return (
                        <div className="key-value" {...props}>
                          <span className="key">{match[1].trim()}</span>
                          <span className="value">{match[2].trim()}</span>
                        </div>
                      );
                    }

                    if (CORE_CONCEPT_PATTERN.test(raw)) {
                      CORE_CONCEPT_PATTERN.lastIndex = 0;
                      return <p {...props}>{renderWithCoreConceptPills(raw)}</p>;
                    }

                    return <p {...props}>{children}</p>;
                  },
                  li({ children, ...props }) {
                    const raw = extractTextContent(children).trim();
                    if (CORE_CONCEPT_PATTERN.test(raw)) {
                      CORE_CONCEPT_PATTERN.lastIndex = 0;
                      return <li {...props}>{renderWithCoreConceptPills(raw)}</li>;
                    }

                    return <li {...props}>{children}</li>;
                  },
                }}
              >
                {document.content}
              </ReactMarkdown>
            </div>

            {sectionHeadings.length > 0 ? (
              <nav className="reader-mini-nav toc" aria-label="Section anchors">
                <p className="reader-mini-nav-title">On this page</p>
                {sectionHeadings.slice(0, 12).map((heading) => (
                  <button
                    key={heading.id}
                    type="button"
                    className={
                      "reader-mini-nav-item toc-item level-" +
                      heading.level +
                      (activeHeadingId === heading.id ? " active" : "")
                    }
                    onClick={() => scrollToSection(heading.id)}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
