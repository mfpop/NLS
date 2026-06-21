import { BookMarked, ChevronDown, ChevronRight, FileText, BookOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks";
import { useDocumentation } from "@/hooks/useDocumentation";
import { APP_NAME } from "@/config";
import { ToolbarSearch, ToolbarDropdown } from "@/components/shared/Toolbar";
import { MarkdownReader } from "./MarkdownReader";
import type { DocumentationFile } from "./documentationTypes";
import { useReadingPreferences, READING_THEME_STYLES } from "@/stores/readingPreferences";

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

  const { readingTheme } = useReadingPreferences();
  const themeStyle = READING_THEME_STYLES[readingTheme];

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [readProgress, setReadProgress] = useState(0);
  const [showTocPanel, setShowTocPanel] = useState(false);

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

  const navListRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const [leftPct] = useState(20);

  const navShadows = useScrollableShadow(navListRef);

  const progressPercent = Math.round(readProgress * 100);

  // Progress bar colors per theme
  const progressBg = readingTheme === "dark" ? "bg-[#2a2c38]" : readingTheme === "sepia" ? "bg-[#e8d5a8]" : "bg-gray-200";
  const progressFill = readingTheme === "sepia" ? "bg-[#8b6914]" : readingTheme === "dark" ? "bg-[#5ea6f0]" : "bg-primary";

  // Find currently selected file metadata
  const selectedFileMeta = useMemo(() => {
    if (!selectedName) return null;
    return filteredFiles.find((f) => f.name === selectedName) ?? null;
  }, [selectedName, filteredFiles]);

  return (
    <div className={`flex h-full flex-col overflow-hidden`}>
      {/* ── Header ── */}
      <header className={`flex items-center gap-3 h-12 shrink-0 px-4 border-b ${themeStyle.border} ${themeStyle.navBg}`}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${themeStyle.border} bg-primary/10 text-primary`}>
          <BookMarked className="h-4 w-4 stroke-current" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={`text-sm font-bold ${themeStyle.text}`}>Reader</h1>
          <p className={`text-[10px] truncate ${themeStyle.muted}`}>
            {selectedFileMeta?.name?.replace(/\.md$/i, "") || "Documentation Center"}
          </p>
        </div>
      </header>

      {/* ── Body: Two-column layout ── */}
      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Kindle Library Navigation */}
        <div
          className={`flex flex-col border-r ${themeStyle.border} ${themeStyle.navBg}`}
          style={{ flex: "0 0 auto", width: `${leftPct}%`, minWidth: 200, maxWidth: 280 }}
        >
          {/* Library search header */}
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${themeStyle.border}`}>
            <BookOpen className="h-3.5 w-3.5 stroke-current text-muted-foreground" />
            <ToolbarSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search library..." />
          </div>

          {/* Category filter */}
          <div className={`px-2 py-1.5 border-b ${themeStyle.border}`}>
            <ToolbarDropdown value={categoryFilter} onChange={setCategoryFilter}
              options={categories.map((cat) => ({ value: cat, label: cat === "All" ? "All Categories" : cat }))}
              className="w-full" />
          </div>

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
                <div className="space-y-0.5">
                  {groups.map((group) => {
                    const isExpanded = expandedCategories.has(group.category);
                    return (
                      <div key={group.category}>
                        <button
                          type="button"
                          onClick={() => toggleCategory(group.category)}
                          className={`flex items-center gap-1 w-full h-7 px-2 rounded text-[10px] font-semibold tracking-wide uppercase transition-colors ${themeStyle.muted} hover:bg-muted/60`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 shrink-0 stroke-current" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0 stroke-current" />
                          )}
                          <span className="truncate">{group.category}</span>
                          <span className={`ml-auto text-[9px] font-mono ${themeStyle.muted}`}>{group.files.length}</span>
                        </button>
                        {isExpanded && (
                          <div className="ml-1">
                            {group.files.map((file) => {
                              const isSelected = file.name === selectedName;
                              return (
                                <button
                                  key={file.name}
                                  type="button"
                                  onClick={() => setSelectedName(file.name)}
                                  className={`flex items-center gap-1.5 w-full h-7 px-2.5 rounded text-[11px] transition-colors ${
                                    isSelected
                                      ? `${themeStyle.accent} font-semibold bg-primary/10`
                                      : `${themeStyle.muted} hover:bg-muted/40 hover:text-foreground`
                                  }`}
                                >
                                  <FileText className="h-3 w-3 shrink-0 stroke-current" />
                                  <span className="truncate">{file.name.replace(/\.md$/i, "")}</span>
                                  <span className={`ml-auto text-[9px] opacity-50 font-mono ${themeStyle.muted}`}>
                                    {file.sizeKb.toFixed(0)}k
                                  </span>
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
        </div>

        {/* Right: Kindle Reader View */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${themeStyle.bg}`}>
          {filesError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <p className="text-sm font-semibold text-muted-foreground">Unable to load documentation</p>
                <p className="text-xs text-muted-foreground mt-1">The documentation index could not be loaded.</p>
              </div>
            </div>
          ) : !selectedName && filteredFiles.length > 0 ? (
            <div className={`flex items-center justify-center h-full ${themeStyle.bg}`}>
              <div className={`text-center px-6 ${themeStyle.text}`}>
                <p className="text-sm font-semibold">No document selected</p>
                <p className="text-xs mt-1 opacity-70">Choose a document from the library.</p>
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
            <div className={`flex items-center justify-center h-full ${themeStyle.bg}`}>
              <div className={`text-center px-6 ${themeStyle.text}`}>
                <p className="text-sm font-semibold">Loading document...</p>
              </div>
            </div>
          ) : selectedContent ? (
            <>
              <MarkdownReader
                document={selectedContent}
                hideHeader
                hideControls
                hideProgressBar
                findPanelOpen={showTocPanel}
                onCloseFindPanel={() => setShowTocPanel(false)}
                onProgress={setReadProgress}
              />
              {/* Kindle-style progress bar */}
              <div className={`shrink-0 flex items-center h-8 gap-3 border-t ${themeStyle.border} ${themeStyle.navBg} px-4`}>
                <div className={`flex-1 h-1 rounded-full overflow-hidden ${progressBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${progressFill}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className={`text-[10px] font-mono min-w-[3ch] text-right ${themeStyle.muted}`}>
                  {progressPercent}%
                </span>
                {selectedFileMeta && (
                  <span className={`text-[10px] hidden sm:inline truncate ${themeStyle.muted}`}>
                    {selectedFileMeta.name.replace(/\.md$/i, "")}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className={`flex items-center justify-center h-full ${themeStyle.bg}`}>
              <div className={`text-center px-6 ${themeStyle.text}`}>
                <BookMarked className="h-10 w-10 mx-auto mb-3 stroke-current opacity-40" />
                <p className="text-base font-semibold">Documentation Reader</p>
                <p className={`text-xs mt-1 opacity-60 ${themeStyle.muted}`}>
                  Select a document from the library to begin reading.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
