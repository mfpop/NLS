import { Check, ChevronDown, ChevronUp, Copy, Search } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { DiagramRenderer } from "./DiagramRenderer";
import type { DocumentationContent } from "./documentationTypes";

interface MarkdownReaderProps {
  document: DocumentationContent | null;
  findQuery?: string;
  onFindQueryChange?: (value: string) => void;
  findActiveIndex?: number;
  onFindActiveIndexChange?: (index: number) => void;
  onFindMatchCountChange?: (count: number) => void;
}

interface SectionHeading {
  id: string;
  level: number;
  text: string;
}

interface MarkdownRuntime {
  ReactMarkdown: (props: Record<string, unknown>) => ReactNode;
  remarkGfm: unknown;
  rehypeHighlight: unknown;
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
  return value
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "section";
}

function displayDocumentTitle(name: string): string {
  return name.replace(/\.md$/i, "");
}

function formatDate(value?: string | null): string {
  if (!value) return "Unknown";
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString();
  } catch { return "Unknown"; }
}

const CORE_CONCEPT_PATTERN = /(Execution Truth Engine|Flow Truth Engine|Decision Engine)/g;

function pillClassForConcept(value: string): string {
  if (value === "Execution Truth Engine") return "bg-info/15 text-info";
  if (value === "Flow Truth Engine") return "bg-accent/15 text-accent";
  return "bg-warning/15 text-warning";
}

function renderWithCoreConceptPills(text: string): ReactNode[] {
  return text.split(CORE_CONCEPT_PATTERN).map((segment, index) => {
    if (/^(Execution Truth Engine|Flow Truth Engine|Decision Engine)$/.test(segment)) {
      return (
        <span key={`pill-${segment}-${index}`} className={`inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-bold tracking-wide ${pillClassForConcept(segment)}`}>
          {segment}
        </span>
      );
    }
    return segment;
  });
}

export function MarkdownReader({ document, findQuery, onFindQueryChange, findActiveIndex, onFindActiveIndexChange, findMatchCount }: MarkdownReaderProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const readerScrollRef = useRef<HTMLDivElement | null>(null);
  const matchesRef = useRef<HTMLElement[]>([]);
  const headingIdCountRef = useRef<Map<string, number>>(new Map());
  const [runtime, setRuntime] = useState<MarkdownRuntime | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalMatchCount, setInternalMatchCount] = useState(0);
  const [internalActiveMatchIndex, setInternalActiveMatchIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sectionHeadings, setSectionHeadings] = useState<SectionHeading[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  const searchQuery = onFindQueryChange ? findQuery ?? "" : internalSearchQuery;
  const setSearchQuery = onFindQueryChange ? (v: string) => onFindQueryChange(v) : setInternalSearchQuery;
  const activeMatchIndex = onFindActiveIndexChange ? findActiveIndex ?? 0 : internalActiveMatchIndex;
  const setActiveMatchIndex = onFindActiveIndexChange ? (v: number) => onFindActiveIndexChange(v) : setInternalActiveMatchIndex;
  const matchCount = onFindQueryChange ? internalMatchCount : internalMatchCount;
  const setMatchCount = onFindQueryChange ? (v: number) => { setInternalMatchCount(v); onFindMatchCountChange?.(v); } : setInternalMatchCount;

  useEffect(() => {
    setSearchQuery(""); setMatchCount(0); setActiveMatchIndex(0);
    setCopied(false); setSectionHeadings([]); setActiveHeadingId(null);
    headingIdCountRef.current = new Map();
  }, [document?.name]);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    async function loadRuntime() {
      const [reactMarkdownModule, remarkGfmModule, rehypeHighlightModule] = await Promise.all([
        import("react-markdown"), import("remark-gfm"), import("rehype-highlight"),
      ]);
      if (cancelled) return;
      setRuntime({
        ReactMarkdown: reactMarkdownModule.default as (props: Record<string, unknown>) => ReactNode,
        remarkGfm: remarkGfmModule.default,
        rehypeHighlight: rehypeHighlightModule.default,
      });
    }
    void loadRuntime();
    return () => { cancelled = true; };
  }, [document]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const headingNodes = Array.from(root.querySelectorAll("h1, h2, h3")) as HTMLElement[];
    const headings: SectionHeading[] = [];
    for (const node of headingNodes) {
      const text = (node.textContent ?? "").trim();
      const id = node.id;
      if (!text || !id) continue;
      headings.push({ id, level: Number(node.tagName[1]), text });
    }
    const visible = headings.filter((h) => h.level >= 2);
    setSectionHeadings(visible);
    setActiveHeadingId(visible[0]?.id ?? null);
  }, [document?.content]);

  useEffect(() => {
    const root = contentRef.current;
    const sc = readerScrollRef.current;
    if (!root || !sc || sectionHeadings.length === 0) return;
    const elements = sectionHeadings
      .map((h) => root.querySelector(`#${CSS.escape(h.id)}`) as HTMLElement | null)
      .filter((n): n is HTMLElement => Boolean(n));
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveHeadingId(visible[0].target.id);
      },
      { root: sc, rootMargin: "-20% 0px -65% 0px", threshold: [0, 1] }
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sectionHeadings]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const clearHighlights = () => {
      const marks = Array.from(root.querySelectorAll("mark.reader-find-match"));
      for (const mark of marks) {
        const parent = mark.parentNode;
        if (!parent) continue;
        parent.replaceChild(window.document.createTextNode(mark.textContent ?? ""), mark);
        parent.normalize();
      }
      matchesRef.current = [];
      setMatchCount(0); setActiveMatchIndex(0);
    };
    clearHighlights();
    const term = searchQuery.trim();
    if (!term) return;
    const regex = new RegExp(escapeRegExp(term), "gi");
    const walker = window.document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node: Node) {
        const value = node.nodeValue ?? "";
        if (!value.trim()) return NodeFilter.FILTER_REJECT;
        const parentElement = node.parentElement;
        if (!parentElement || parentElement.closest("code, pre, script, style, mark")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) { textNodes.push(current as Text); current = walker.nextNode(); }
    for (const textNode of textNodes) {
      const original = textNode.nodeValue ?? "";
      regex.lastIndex = 0;
      if (!regex.test(original)) continue;
      regex.lastIndex = 0;
      const fragment = window.document.createDocumentFragment();
      let lastIndex = 0;
      let match = regex.exec(original);
      while (match) {
        const start = match.index;
        const matched = match[0] ?? "";
        if (start > lastIndex) fragment.appendChild(window.document.createTextNode(original.slice(lastIndex, start)));
        const mark = window.document.createElement("mark");
        mark.className = "reader-find-match";
        mark.textContent = matched;
        fragment.appendChild(mark);
        lastIndex = start + matched.length;
        match = regex.exec(original);
      }
      if (lastIndex < original.length) fragment.appendChild(window.document.createTextNode(original.slice(lastIndex)));
      const parent = textNode.parentNode;
      if (parent) parent.replaceChild(fragment, textNode);
    }
    matchesRef.current = Array.from(root.querySelectorAll("mark.reader-find-match"));
    setMatchCount(matchesRef.current.length);
    setActiveMatchIndex(0);
  }, [document?.content, searchQuery]);

  useEffect(() => {
    const matches = matchesRef.current;
    for (const match of matches) match.classList.remove("reader-find-match--active");
    if (matches.length === 0) return;
    const clamped = ((activeMatchIndex % matches.length) + matches.length) % matches.length;
    const active = matches[clamped];
    active.classList.add("reader-find-match--active");
    active.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchIndex, matchCount]);

  const copyDocument = async () => {
    if (!document) return;
    try {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch { setCopied(false); }
  };

  const scrollToSection = (id: string) => {
    const root = contentRef.current;
    if (!root) return;
    const target = window.document.getElementById(id);
    if (!target || !root.contains(target)) return;
    setActiveHeadingId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nextHeadingId = (text: string): string => {
    const base = slugify(text);
    const count = headingIdCountRef.current.get(base) ?? 0;
    headingIdCountRef.current.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">Select a document to read.</p>
      </div>
    );
  }

  if (!runtime) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center h-12 shrink-0 border-b border-border bg-muted/40 px-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{displayDocumentTitle(document.name)}</h2>
            <p className="text-[11px] text-muted-foreground truncate">{document.purpose ?? document.path}</p>
          </div>
        </div>
        <div className="flex items-center justify-center flex-1">
          <p className="text-xs text-muted-foreground">Loading renderer...</p>
        </div>
      </div>
    );
  }

  const ReactMarkdown = runtime.ReactMarkdown;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Document metadata header */}
      <div className="flex items-center gap-3 h-12 shrink-0 border-b border-border bg-muted/40 px-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{displayDocumentTitle(document.name)}</h2>
            <span className={`rounded-full px-1.5 py-px text-[9px] font-semibold tracking-wide ${
              document.status === "Canonical" ? "bg-success/10 text-success border border-success/20" :
              document.status === "Reference" ? "bg-info/15 text-info border border-info/20" :
              document.status === "Needs Review" ? "bg-warning/15 text-warning border border-warning/25" :
              document.status === "Draft" ? "bg-badge-neutral text-badge-neutral-foreground border border-border/60" :
              "bg-danger/10 text-danger border border-danger/20"
            }`}>
              {document.status}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span>{document.category}</span>
            {document.lastModified && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>Updated {formatDate(document.lastModified)}</span>
              </>
            )}
            <span className="text-muted-foreground/40">·</span>
            <span>{document.sizeKb.toFixed(1)} KB</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find in page..."
              className="h-7 w-40 rounded border border-border bg-card pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-border-strong focus:ring-1 focus:ring-ring/30 transition-colors"
            />
          </div>
          <button type="button" onClick={() => setActiveMatchIndex((i) => i - 1)} disabled={matchCount === 0}
            className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none">
            <ChevronUp className="h-3.5 w-3.5 stroke-current" />
          </button>
          <button type="button" onClick={() => setActiveMatchIndex((i) => i + 1)} disabled={matchCount === 0}
            className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none">
            <ChevronDown className="h-3.5 w-3.5 stroke-current" />
          </button>
          {matchCount > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono min-w-[3ch] text-center">
              {((activeMatchIndex % matchCount) + matchCount) % matchCount + 1}/{matchCount}
            </span>
          )}
          <span className="h-4 w-px bg-border/40 mx-0.5" />
          <button type="button" onClick={copyDocument}
            className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            {copied ? <Check className="h-3 w-3 stroke-current" /> : <Copy className="h-3 w-3 stroke-current" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Content area with ToC sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div ref={readerScrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-6">
            <div ref={contentRef} className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:scroll-mt-16 prose-h1:text-lg prose-h1:font-bold prose-h1:text-foreground prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-4
              prose-h2:text-base prose-h2:font-semibold prose-h2:text-foreground prose-h2:mt-6 prose-h2:mb-2
              prose-h3:text-sm prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-4 prose-h3:mb-1
              prose-p:text-[13px] prose-p:leading-relaxed prose-p:text-foreground/85 prose-p:mb-3
              prose-li:text-[13px] prose-li:text-foreground/85
              prose-code:text-[12px] prose-code:bg-muted prose-code:px-1 prose-code:py-px prose-code:rounded prose-code:font-mono
              prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-md
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-ul:my-2 prose-ol:my-2
              prose-table:text-[12px] prose-table:border-collapse
              prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-th:text-[11px] prose-th:font-semibold prose-th:text-foreground
              prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-1.5
              prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground
              prose-hr:border-border">
              <ReactMarkdown
                remarkPlugins={[runtime.remarkGfm]}
                rehypePlugins={[runtime.rehypeHighlight]}
                components={{
                  code(params: any) {
                    const { className, children, ...props } = params;
                    const language = className?.replace("language-", "") ?? "";
                    const raw = String(children).replace(/\n$/, "");
                    if (language === "mermaid") {
                      return <DiagramRenderer chart={raw} />;
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1(params: any) {
                    const { children, ...props } = params;
                    const text = extractTextContent(children).trim();
                    return <h1 id={nextHeadingId(text)} className="scroll-mt-16" {...props}>{children}</h1>;
                  },
                  h2(params: any) {
                    const { children, ...props } = params;
                    const text = extractTextContent(children).trim();
                    return <h2 id={nextHeadingId(text)} className="scroll-mt-16" {...props}>{children}</h2>;
                  },
                  h3(params: any) {
                    const { children, ...props } = params;
                    const text = extractTextContent(children).trim();
                    return <h3 id={nextHeadingId(text)} className="scroll-mt-16" {...props}>{children}</h3>;
                  },
                  p(params: any) {
                    const { children, ...props } = params;
                    const raw = extractTextContent(children).trim();
                    const flowLine = raw.match(/^([A-Za-z][A-Za-z0-9\s_-]{1,40})(\s*(->|→|=>)\s*[A-Za-z][A-Za-z0-9\s_-]{1,40})+$/);
                    if (flowLine) {
                      const segments = raw.split(/(\s*(?:->|=>|→)\s*)/g);
                      return (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground my-2" {...props}>
                          {segments.map((seg, i) =>
                            /(->|=>|→)/.test(seg)
                              ? <span key={`sep-${i}`} className="text-primary font-bold">{seg}</span>
                              : <span key={`seg-${i}`}>{seg}</span>
                          )}
                        </div>
                      );
                    }
                    if (CORE_CONCEPT_PATTERN.test(raw)) {
                      CORE_CONCEPT_PATTERN.lastIndex = 0;
                      return <p className="text-[13px] leading-relaxed text-foreground/85 mb-3" {...props}>{renderWithCoreConceptPills(raw)}</p>;
                    }
                    return <p className="text-[13px] leading-relaxed text-foreground/85 mb-3" {...props}>{children}</p>;
                  },
                  li(params: any) {
                    const { children, ...props } = params;
                    const raw = extractTextContent(children).trim();
                    if (CORE_CONCEPT_PATTERN.test(raw)) {
                      CORE_CONCEPT_PATTERN.lastIndex = 0;
                      return <li {...props}>{renderWithCoreConceptPills(raw)}</li>;
                    }
                    return <li className="text-[13px] text-foreground/85" {...props}>{children}</li>;
                  },
                }}
              >
                {document.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* ToC sidebar */}
        {sectionHeadings.length > 0 && (
          <nav className="hidden xl:block w-52 shrink-0 border-l border-border overflow-y-auto py-4 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">On this page</p>
            {sectionHeadings.slice(0, 16).map((heading) => (
              <button
                key={heading.id}
                type="button"
                onClick={() => scrollToSection(heading.id)}
                className={`block w-full text-left truncate rounded px-2 py-1 text-[11px] transition-colors ${
                  heading.level === 2 ? "" : "pl-5"
                } ${
                  activeHeadingId === heading.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {heading.text}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
