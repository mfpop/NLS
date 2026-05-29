import { ChevronDown, ChevronUp, List, Minus, Monitor, Moon, Plus, Search, Sun, Type, X } from "lucide-react";
import { forwardRef, type ReactNode, useEffect, useImperativeHandle, useRef, useState } from "react";
import { DiagramRenderer } from "./DiagramRenderer";
import type { DocumentationContent } from "./documentationTypes";
import { useReadingPreferences, READING_THEME_STYLES } from "@/stores/readingPreferences";
import type { FontSize, ReadingTheme } from "@/stores/readingPreferences";

export interface MarkdownReaderHandle {
  copyCurrentSection: () => string;
}

interface MarkdownReaderProps {
  document: DocumentationContent | null;
  findQuery?: string;
  onFindQueryChange?: (value: string) => void;
  findActiveIndex?: number;
  onFindActiveIndexChange?: (index: number) => void;
  onFindMatchCountChange?: (count: number) => void;
  /** Hide the document metadata header bar when layout manages its own header */
  hideHeader?: boolean;
  /** Show the find-in-page overlay panel */
  findPanelOpen?: boolean;
  /** Called when the find panel should close (backdrop click or close button) */
  onCloseFindPanel?: () => void;
  /** Called when scroll position changes, with progress 0-1 */
  onProgress?: (progress: number) => void;
  /** Hide the Kindle controls bar (theme, font, TOC) */
  hideControls?: boolean;
  /** Hide the bottom progress bar */
  hideProgressBar?: boolean;
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

/** Complete static prose class for each font size preset */
function proseBaseClass(fontSize: FontSize): string {
  switch (fontSize) {
    case "sm": return "prose prose-sm";
    case "base": return "prose prose-base";
    case "lg": return "prose prose-lg";
    case "xl": return "prose prose-xl";
  }
}

/** Paragraph/lists text size + line height classes */
function textBodyClass(fontSize: FontSize): string {
  switch (fontSize) {
    case "sm": return "text-[13px] leading-6";
    case "base": return "text-[15px] leading-7";
    case "lg": return "text-[17px] leading-8";
    case "xl": return "text-[19px] leading-9";
  }
}

/** Code font size class */
function codeSizeClass(fontSize: FontSize): string {
  switch (fontSize) {
    case "sm": return "text-[12px]";
    case "base": return "text-[13px]";
    case "lg": return "text-[14px]";
    case "xl": return "text-[15px]";
  }
}

/** Font family per reading theme */
function fontFamilyForTheme(theme: ReadingTheme): string {
  switch (theme) {
    case "sepia": return "'Palatino', 'Georgia', 'Cambria', 'Book Antiqua', serif";
    default: return "'Inter', 'Segoe UI', system-ui, sans-serif";
  }
}

const READING_THEMES: Array<{ key: ReadingTheme; icon: typeof Sun; label: string }> = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "sepia", icon: Monitor, label: "Sepia" },
  { key: "dark", icon: Moon, label: "Dark" },
];

const FONT_SIZES: FontSize[] = ["sm", "base", "lg", "xl"];

export const MarkdownReader = forwardRef<MarkdownReaderHandle, MarkdownReaderProps>(function MarkdownReader({
  document, findQuery, onFindQueryChange, findActiveIndex, onFindActiveIndexChange,
  onFindMatchCountChange, hideHeader = false, findPanelOpen = false, onCloseFindPanel, onProgress,
  hideControls = false, hideProgressBar = false,
}: MarkdownReaderProps, ref) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const readerScrollRef = useRef<HTMLDivElement | null>(null);
  const matchesRef = useRef<HTMLElement[]>([]);
  const headingIdCountRef = useRef<Map<string, number>>(new Map());
  const [runtime, setRuntime] = useState<MarkdownRuntime | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalMatchCount, setInternalMatchCount] = useState(0);
  const [internalActiveMatchIndex, setInternalActiveMatchIndex] = useState(0);
  const [sectionHeadings, setSectionHeadings] = useState<SectionHeading[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [internalFindPanelOpen, setInternalFindPanelOpen] = useState(false);

  const { readingTheme, setReadingTheme, fontSize, setFontSize } = useReadingPreferences();
  const themeStyle = READING_THEME_STYLES[readingTheme];

  const isFindPanelOpen = findPanelOpen !== undefined ? findPanelOpen : internalFindPanelOpen;
  const setIsFindPanelOpen = onCloseFindPanel
    ? () => onCloseFindPanel()
    : () => setInternalFindPanelOpen((v) => !v);

  const searchQuery = onFindQueryChange ? findQuery ?? "" : internalSearchQuery;
  const setSearchQuery = onFindQueryChange ? (v: string) => onFindQueryChange(v) : setInternalSearchQuery;
  const activeMatchIndex = onFindActiveIndexChange ? findActiveIndex ?? 0 : internalActiveMatchIndex;
  const setActiveMatchIndex = onFindActiveIndexChange ? (v: number | ((prev: number) => number)) => onFindActiveIndexChange(typeof v === "function" ? v(activeMatchIndex) : v) : setInternalActiveMatchIndex;
  const matchCount = onFindQueryChange ? internalMatchCount : internalMatchCount;
  const setMatchCount = onFindQueryChange ? (v: number) => { setInternalMatchCount(v); onFindMatchCountChange?.(v); } : setInternalMatchCount;

  useEffect(() => {
    setSearchQuery(""); setMatchCount(0); setActiveMatchIndex(0);
    setSectionHeadings([]); setActiveHeadingId(null);
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

  // Progress tracking
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    const sc = readerScrollRef.current;
    if (!sc) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = sc;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) { setScrollProgress(1); onProgress?.(1); return; }
      const pct = Math.min(scrollTop / maxScroll, 1);
      setScrollProgress(pct);
      onProgress?.(pct);
    };
    handleScroll();
    sc.addEventListener("scroll", handleScroll, { passive: true });
    return () => sc.removeEventListener("scroll", handleScroll);
  }, [onProgress]);

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

  useImperativeHandle(ref, () => ({
    copyCurrentSection: () => {
      const root = contentRef.current;
      if (!root || !activeHeadingId) return "";
      const heading = root.querySelector(`#${CSS.escape(activeHeadingId)}`) as HTMLElement | null;
      if (!heading) return "";
      const tag = heading.tagName;
      const level = Number(tag[1]);
      const parts: string[] = [heading.textContent ?? ""];
      let sibling = heading.nextElementSibling;
      while (sibling) {
        const st = sibling.tagName;
        if (/^H[1-3]$/.test(st) && Number(st[1]) <= level) break;
        parts.push((sibling as HTMLElement).textContent ?? "");
        sibling = sibling.nextElementSibling;
      }
      return parts.join("\n\n").trim();
    },
  }), [activeHeadingId]);

  const progressPercent = Math.round(scrollProgress * 100);

  // ── Empty state ──
  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">Select a document to read.</p>
      </div>
    );
  }

  // ── Controls bar ──
  const controlsBar = !hideControls && (
    <div className={`flex items-center h-10 shrink-0 border-b ${themeStyle.border} ${themeStyle.navBg} px-2 gap-1`}>
      {/* Document title */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {document && (
          <span className={`text-[11px] font-semibold truncate ${themeStyle.text}`}>
            {displayDocumentTitle(document.name)}
          </span>
        )}
      </div>

      {/* Find in page */}
      <button
        type="button"
        onClick={() => setIsFindPanelOpen()}
        title="Find in page"
        className={`inline-flex items-center justify-center h-7 w-7 rounded transition-colors ${
          isFindPanelOpen ? "bg-primary/15 text-primary" : `${themeStyle.muted} hover:bg-muted hover:text-foreground`
        }`}
      >
        <Search className="h-3.5 w-3.5 stroke-current" />
      </button>

      <span className={`w-px h-5 mx-0.5 ${themeStyle.border}`} />

      {/* Theme toggle */}
      {READING_THEMES.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setReadingTheme(t.key)}
          title={t.label}
          className={`inline-flex items-center justify-center h-7 w-7 rounded transition-colors ${
            readingTheme === t.key
              ? "bg-primary/15 text-primary"
              : `${themeStyle.muted} hover:bg-muted hover:text-foreground`
          }`}
        >
          <t.icon className="h-3.5 w-3.5 stroke-current" />
        </button>
      ))}

      <span className={`w-px h-5 mx-0.5 ${themeStyle.border}`} />

      {/* Font size */}
      <button
        type="button"
        onClick={() => {
          const idx = FONT_SIZES.indexOf(fontSize);
          if (idx > 0) setFontSize(FONT_SIZES[idx - 1]);
        }}
        disabled={fontSize === "sm"}
        title="Decrease font size"
        className={`inline-flex items-center justify-center h-7 w-7 rounded transition-colors disabled:opacity-30 ${themeStyle.muted} hover:bg-muted hover:text-foreground`}
      >
        <Minus className="h-3.5 w-3.5 stroke-current" />
      </button>
      <span className={`text-[10px] font-mono min-w-[2.5ch] text-center ${themeStyle.muted}`}>
        <Type className="h-3.5 w-3.5 inline stroke-current" />
      </span>
      <button
        type="button"
        onClick={() => {
          const idx = FONT_SIZES.indexOf(fontSize);
          if (idx < FONT_SIZES.length - 1) setFontSize(FONT_SIZES[idx + 1]);
        }}
        disabled={fontSize === "xl"}
        title="Increase font size"
        className={`inline-flex items-center justify-center h-7 w-7 rounded transition-colors disabled:opacity-30 ${themeStyle.muted} hover:bg-muted hover:text-foreground`}
      >
        <Plus className="h-3.5 w-3.5 stroke-current" />
      </button>

      <span className={`w-px h-5 mx-0.5 ${themeStyle.border}`} />

      {/* TOC toggle */}
      <button
        type="button"
        onClick={() => setIsFindPanelOpen()}
        title="Table of Contents"
        className={`inline-flex items-center justify-center h-7 w-7 rounded transition-colors ${
          isFindPanelOpen ? "bg-primary/15 text-primary" : `${themeStyle.muted} hover:bg-muted hover:text-foreground`
        }`}
      >
        <List className="h-3.5 w-3.5 stroke-current" />
      </button>
    </div>
  );

  // ── Loading state ──
  if (!runtime) {
    return (
      <div className={`flex flex-col h-full overflow-hidden ${themeStyle.bg} ${themeStyle.text}`}>
        {controlsBar}
        <div className="flex items-center justify-center flex-1">
          <p className="text-xs text-muted-foreground">Loading renderer...</p>
        </div>
      </div>
    );
  }

  const ReactMarkdown = runtime.ReactMarkdown;

  const proseBase = proseBaseClass(fontSize);
  const bodyClass = textBodyClass(fontSize);
  const codeSize = codeSizeClass(fontSize);
  const fontFamily = fontFamilyForTheme(readingTheme);

  // Sepia/dark theme heading/link colours applied via inline style
  const sepiaHeadingStyle = readingTheme === "sepia" ? { color: "#5f4b32" } as React.CSSProperties : undefined;
  const sepiaLinkStyle = readingTheme === "sepia" ? { color: "#8b6914" } as React.CSSProperties : undefined;
  const sepiaBlockquoteStyle = readingTheme === "sepia" ? { color: "#8b7d6b" } as React.CSSProperties : undefined;
  const darkLinkStyle = readingTheme === "dark" ? { color: "#5ea6f0" } as React.CSSProperties : undefined;

  // Progress bar colors per theme
  const progressBg = readingTheme === "dark" ? "bg-[#363848]" : readingTheme === "sepia" ? "bg-[#d4c090]" : "bg-gray-200/70";
  const progressFill = readingTheme === "sepia" ? "bg-[#6b4c0e]" : readingTheme === "dark" ? "bg-[#60a5fa]" : "bg-primary/90";

  return (
    <div className={`flex flex-col h-full overflow-hidden ${themeStyle.bg} ${themeStyle.text}`}
      style={{ fontFamily }}>
      {/* Kindle Controls Bar (always visible unless hideControls=true) */}
      {controlsBar}

      {/* Document metadata header (hidden when hideHeader=true) */}
      {!hideHeader && document && (
        <div className={`flex items-center gap-3 h-10 shrink-0 border-b ${themeStyle.border} ${themeStyle.navBg} px-5`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-1.5 py-px text-[9px] font-semibold tracking-wide ${
                document.status === "Canonical" ? "bg-success/10 text-success border border-success/20" :
                document.status === "Reference" ? "bg-info/15 text-info border border-info/20" :
                document.status === "Needs Review" ? "bg-warning/15 text-warning border border-warning/25" :
                document.status === "Draft" ? "bg-badge-neutral text-badge-neutral-foreground border border-border/60" :
                "bg-danger/10 text-danger border border-danger/20"
              }`}>
                {document.status}
              </span>
              <span className={`text-[10px] ${themeStyle.muted}`}>{document.category}</span>
              {document.lastModified && (
                <span className={`text-[10px] ${themeStyle.muted}`}>· Updated {formatDate(document.lastModified)}</span>
              )}
              <span className={`text-[10px] ${themeStyle.muted}`}>· {document.sizeKb.toFixed(1)} KB</span>
            </div>
          </div>
        </div>
      )}

      {/* Content area with overlay find/TOC panel */}
      <div className={`flex flex-1 min-h-0 overflow-hidden relative ${themeStyle.bg}`}>
        <div ref={readerScrollRef} className={`flex-1 overflow-y-auto ${themeStyle.bg}`}>
          <div className={`max-w-4xl mx-auto px-12 py-10 ${themeStyle.proseBg}`}>
            <div ref={contentRef} className={`${proseBase} max-w-none
              ${readingTheme === "dark" ? "prose-invert" : ""}
              prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h1:font-extrabold prose-h1:border-b-2 prose-h1:border-border/60 prose-h1:pb-3 prose-h1:mb-6 prose-h1:tracking-tight
              prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h2:tracking-tight
              prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3
              prose-p:mb-5
              prose-li:mb-1
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono
              prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
              prose-a:no-underline hover:prose-a:underline
              prose-strong:font-bold
              prose-ul:my-4 prose-ol:my-4
              prose-table:text-[13px] prose-table:border-collapse
              prose-th:border prose-th:border-border prose-th:bg-muted/80 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-[12px] prose-th:font-semibold
              prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2
              prose-blockquote:border-l-[3px] prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic
              prose-hr:border-border/40`}>
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
                      <code className={`${className ?? ""} ${codeSize}`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre(params: any) {
                    const { children, ...props } = params;
                    return <pre className={codeSize} {...props}>{children}</pre>;
                  },
                  h1(params: any) {
                    const { children, ...props } = params;
                    const text = extractTextContent(children).trim();
                    return <h1 id={nextHeadingId(text)} className="scroll-mt-16" style={sepiaHeadingStyle} {...props}>{children}</h1>;
                  },
                  h2(params: any) {
                    const { children, ...props } = params;
                    const text = extractTextContent(children).trim();
                    return <h2 id={nextHeadingId(text)} className="scroll-mt-16" style={sepiaHeadingStyle} {...props}>{children}</h2>;
                  },
                  h3(params: any) {
                    const { children, ...props } = params;
                    const text = extractTextContent(children).trim();
                    return <h3 id={nextHeadingId(text)} className="scroll-mt-16" style={sepiaHeadingStyle} {...props}>{children}</h3>;
                  },
                  a(params: any) {
                    const { children, ...props } = params;
                    return <a style={sepiaLinkStyle || darkLinkStyle} {...props}>{children}</a>;
                  },
                  blockquote(params: any) {
                    const { children, ...props } = params;
                    return <blockquote style={sepiaBlockquoteStyle} {...props}>{children}</blockquote>;
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
                      return <p className={`${bodyClass} mb-5`} style={readingTheme === "dark" ? { color: "#d0d0d0" } : undefined} {...props}>{renderWithCoreConceptPills(raw)}</p>;
                    }
                    return <p className={`${bodyClass} mb-5`} style={readingTheme === "dark" ? { color: "#d0d0d0" } : undefined} {...props}>{children}</p>;
                  },
                  li(params: any) {
                    const { children, ...props } = params;
                    const raw = extractTextContent(children).trim();
                    if (CORE_CONCEPT_PATTERN.test(raw)) {
                      CORE_CONCEPT_PATTERN.lastIndex = 0;
                      return <li className={bodyClass} style={readingTheme === "dark" ? { color: "#d0d0d0" } : undefined} {...props}>{renderWithCoreConceptPills(raw)}</li>;
                    }
                    return <li className={bodyClass} style={readingTheme === "dark" ? { color: "#d0d0d0" } : undefined} {...props}>{children}</li>;
                  },
                }}
              >
                {document.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Find in page + ToC overlay panel */}
        {isFindPanelOpen && (
          <>
            <div className={`absolute inset-0 z-10 ${readingTheme === "dark" ? "bg-black/30" : "bg-black/10"}`} onClick={() => setIsFindPanelOpen()} />
            <div className={`absolute right-0 top-0 bottom-0 z-20 flex flex-col w-60 border-l ${themeStyle.border} ${themeStyle.navBg}`}>
              <div className={`shrink-0 border-b ${themeStyle.border} px-3 py-2.5`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${themeStyle.muted}`}>Find in page</p>
                  <button type="button" onClick={() => setIsFindPanelOpen()}
                    className={`inline-flex items-center justify-center h-5 w-5 rounded ${themeStyle.muted} hover:bg-muted hover:text-foreground transition-colors`}>
                    <X className="h-3 w-3 stroke-current" />
                  </button>
                </div>
                <div className="relative">
                  <Search className={`absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${themeStyle.muted} pointer-events-none`} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find in page..."
                    className={`h-8 w-full rounded border ${themeStyle.border} bg-card pl-7 pr-2 text-[11px] outline-none focus:border-border-strong focus:ring-1 focus:ring-ring/30 transition-colors`}
                  />
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <button type="button" onClick={() => setActiveMatchIndex((i) => i - 1)} disabled={matchCount === 0}
                    className={`inline-flex items-center justify-center h-6 w-6 rounded ${themeStyle.muted} hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none`}>
                    <ChevronUp className="h-3 w-3 stroke-current" />
                  </button>
                  <button type="button" onClick={() => setActiveMatchIndex((i) => i + 1)} disabled={matchCount === 0}
                    className={`inline-flex items-center justify-center h-6 w-6 rounded ${themeStyle.muted} hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none`}>
                    <ChevronDown className="h-3 w-3 stroke-current" />
                  </button>
                  {matchCount > 0 && (
                    <span className={`text-[10px] font-mono min-w-[3ch] text-center ${themeStyle.muted}`}>
                      {((activeMatchIndex % matchCount) + matchCount) % matchCount + 1}/{matchCount}
                    </span>
                  )}
                </div>
              </div>
              {sectionHeadings.length > 0 && (
                <nav className="flex-1 overflow-y-auto py-3 px-3">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${themeStyle.muted}`}>On this page</p>
                  {sectionHeadings.slice(0, 24).map((heading) => (
                  <button
                    key={heading.id}
                    type="button"
                    onClick={() => scrollToSection(heading.id)}
                    className={`block w-full text-left truncate rounded px-2 py-1 text-[11px] transition-colors ${
                      heading.level === 2 ? "" : "pl-5"
                    } ${
                      activeHeadingId === heading.id
                        ? `${themeStyle.accent} font-medium bg-primary/10`
                        : `${themeStyle.muted} hover:bg-muted hover:text-foreground`
                    }`}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
              )}
            </div>
          </>
        )}
      </div>

      {/* Kindle-style progress bar */}
      {!hideProgressBar && (
        <div className={`shrink-0 flex items-center h-10 gap-3 border-t ${themeStyle.border} ${themeStyle.navBg} px-4`}>            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${progressBg}`}>
            <div
              className={`h-full rounded-full transition-all duration-200 ${progressFill}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={`text-[10px] font-mono min-w-[3ch] text-right ${themeStyle.muted}`}>
            {progressPercent}%
          </span>
          {document && (
            <span className={`text-[10px] hidden sm:inline truncate ${themeStyle.muted}`}>
              {displayDocumentTitle(document.name)}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
