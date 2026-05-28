import { BookMarked, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks";
import { useDocumentation } from "@/hooks/useDocumentation";
import { APP_NAME } from "@/config";
import { theme } from "@/styles/themeTokens";
import { Toolbar, ToolbarSearch, ToolbarSelect, ToolbarButton } from "@/components/shared/Toolbar";
import { MarkdownReader } from "./MarkdownReader";
import type { DocumentationFile } from "./documentationTypes";

interface CategoryGroup {
  category: string;
  files: DocumentationFile[];
}

function groupByCategory(files: DocumentationFile[]): CategoryGroup[] {
  const map = new Map<string, DocumentationFile[]>();
  for (const file of files) {
    const list = map.get(file.category) ?? [];
    list.push(file);
    map.set(file.category, list);
  }
  return Array.from(map.entries())
    .map(([category, items]) => ({ category, files: items }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function useScrollableShadow(ref: React.RefObject<HTMLDivElement | null>) {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setShowTop(el.scrollTop > 4);
      setShowBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [ref]);

  return { showTop, showBottom };
}

export function DocumentationCenter() {
  useDocumentTitle(`${APP_NAME} · Documentation Center`);
  const { docSlug } = useParams<{ docSlug?: string }>();
  const { pathname } = useLocation();

  const {
    categoryFilter,
    fileError,
    files,
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
    categories,
  } = useDocumentation();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (categories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(categories.filter((c) => c !== "All")));
    }
  }, [categories, expandedCategories.size]);

  const isSetup = pathname.startsWith("/docs/setup");
  const routeDocName = isSetup ? "README.md" : docSlug ?? null;

  const targetDoc = useMemo(() => {
    if (routeDocName && files.some((f) => f.name === routeDocName)) {
      return routeDocName;
    }
    return null;
  }, [routeDocName, files]);

  useEffect(() => {
    if (targetDoc && targetDoc !== selectedName) {
      setSelectedName(targetDoc);
    }
  }, [targetDoc, selectedName, setSelectedName]);

  useEffect(() => {
    if (!selectedName && filteredFiles.length > 0) {
      setSelectedName(filteredFiles[0].name);
    }
  }, [filteredFiles, selectedName, setSelectedName]);

  const groups = useMemo(() => groupByCategory(filteredFiles), [filteredFiles]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  const expandAll = useCallback(() => {
    setExpandedCategories(new Set(groups.map((g) => g.category)));
  }, [groups]);

  const allExpanded = groups.length > 0 && groups.every((g) => expandedCategories.has(g.category));

  const navListRef = useRef<HTMLDivElement>(null);

  const navShadows = useScrollableShadow(navListRef);

  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(20);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 10), 50));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div className={`flex h-full flex-col overflow-hidden ${theme.page}`}>
      {/* ── Header ── */}
      <header className={`flex items-center gap-3 h-16 shrink-0 px-5 border-b ${theme.header}`}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${theme.iconBoxBrand}`}>
          <BookMarked className="h-4 w-4 stroke-current" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-foreground">Documentation Center</h1>
          <p className="text-[11px] text-muted-foreground truncate">
            Centralized manuals, standards, architecture, and operational guidance.
          </p>
        </div>
      </header>

      <Toolbar className="h-10"
        left={<ToolbarSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search documentation..." />}
        right={<ToolbarSelect value={categoryFilter} onChange={setCategoryFilter} options={categories.map((cat) => ({ value: cat, label: cat === "All" ? "All Categories" : cat }))} className="w-50" />}
      />

      {/* ── Body: Two-column layout ── */}
      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Navigation Tree */}
        <div className="flex flex-col border-r border-border bg-muted/30" style={{ flex: "0 0 auto", width: `${leftPct}%`, minWidth: 180 }}>
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {navShadows.showTop && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-background/60 to-transparent z-10" />
            )}
            <div ref={navListRef} className="h-full overflow-y-auto px-1.5 py-2">
              {filesLoading ? (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                  Loading...
                </div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 px-3 text-center">
                  <FileText className="h-4 w-4 text-muted-foreground mb-1.5" />
                  <p className="text-xs text-muted-foreground">No documents found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {groups.map((group) => {
                    const isExpanded = expandedCategories.has(group.category);
                    return (
                      <div key={group.category}>
                        <button
                          type="button"
                          onClick={() => toggleCategory(group.category)}
                          className="flex items-center gap-1 w-full h-7 px-1.5 rounded text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0 stroke-current" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0 stroke-current" />
                          )}
                          <span className="truncate">{group.category}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">{group.files.length}</span>
                        </button>
                        {isExpanded && (
                          <div className="ml-1 pl-0">
                            {group.files.map((file) => {
                              const isSelected = file.name === selectedName;
                              return (
                                <button
                                  key={file.name}
                                  type="button"
                                  onClick={() => setSelectedName(file.name)}
                                  className={`flex items-center gap-1.5 w-full h-7 px-2.5 rounded text-[11px] transition-colors ${
                                    isSelected
                                      ? "bg-primary/10 text-primary font-semibold"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                >
                                  <FileText className="h-3 w-3 shrink-0 stroke-current" />
                                  <span className="truncate">{file.name.replace(/\.md$/i, "")}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {navShadows.showBottom && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-background/60 to-transparent z-10" />
            )}
          </div>
          <div className="flex items-center h-7 shrink-0 border-t border-border bg-muted px-3 text-[10px] text-muted-foreground font-mono">
            {filteredFiles.length} document{filteredFiles.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Right: Document Viewer */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {filesError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <p className="text-sm font-semibold text-muted-foreground">Unable to load documentation</p>
                <p className="text-xs text-muted-foreground mt-1">The documentation index could not be loaded.</p>
              </div>
            </div>
          ) : !selectedName && filteredFiles.length > 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <p className="text-sm font-semibold text-muted-foreground">No document selected</p>
                <p className="text-xs text-muted-foreground mt-1">Choose a document from the navigation tree.</p>
              </div>
            </div>
          ) : fileError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <p className="text-sm font-semibold text-muted-foreground">Unable to open document</p>
                <p className="text-xs text-muted-foreground mt-1">The selected document could not be loaded.</p>
              </div>
            </div>
          ) : isFileLoading && !selectedContent ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <p className="text-sm font-semibold text-muted-foreground">Loading document...</p>
              </div>
            </div>
          ) : selectedContent ? (
            <MarkdownReader document={selectedContent} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <BookMarked className="h-8 w-8 text-muted-foreground mx-auto mb-2 stroke-current" />
                <p className="text-sm font-semibold text-muted-foreground">Documentation Center</p>
                <p className="text-xs text-muted-foreground mt-1">Select a document from the left panel to begin reading.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
