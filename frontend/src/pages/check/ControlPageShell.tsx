import { useState, useCallback, useRef, useMemo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader, type SystemMessage } from "@/pages/shared/PageHeader";
import { Toolbar, ToolbarButton } from "@/components/shared/Toolbar";
import { RefreshCw } from "lucide-react";


export type ControlArea = "PRODUCTION" | "QUALITY" | "SAFETY" | "MATERIAL";

export type RecordType = "AUDITS" | "ISSUES" | "ACTIONS" | "DMRS" | "RMAS";

export interface ControlTabConfig {
  id: string;
  label: string;
  renderList: (selectedId: number | null, onSelect: (id: number | null) => void) => ReactNode;
  renderDetail: (id: number | null) => ReactNode;
}

interface ControlPageShellProps {
  controlArea: ControlArea;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClass: string;
  tabs: ControlTabConfig[];
  defaultTab?: string;
  renderOverview: () => ReactNode;
  renderUnifiedList?: (onSelect: (recordType: RecordType, id: number | null) => void, filterRecordType?: RecordType | null, selectedId?: number | null) => ReactNode;
  toolbarSearch?: ReactNode;
  toolbarFilters?: ((recordType: RecordType | null) => ReactNode) | ReactNode;
  toolbarActions?: ReactNode | ((recordType: RecordType | null, resetSelection: () => void, setSelection: (id: number) => void, setSelectedRecordType: (rt: RecordType) => void) => ReactNode);
  onRefresh?: () => void;
  onRecordTypeChange?: () => void;
  headerMessage?: SystemMessage | null;
  onDismissHeaderMessage?: () => void;
  headerChildren?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
}

const RECORD_TYPES: { id: RecordType; label: string }[] = [
  { id: "ISSUES", label: "Issues" },
  { id: "ACTIONS", label: "Actions" },
  { id: "AUDITS", label: "Audits" },
  { id: "DMRS", label: "DMR" },
  { id: "RMAS", label: "RMA" },
];

function RadioButton({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium transition-colors ${
        selected
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted/60"
      }`}
    >
      <span className={`h-3 w-3 rounded-full border-2 flex items-center justify-center transition-colors ${
        selected ? "border-primary" : "border-muted-foreground/40"
      }`}>
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </span>
      {label}
    </button>
  );
}

export function ControlPageShell({
  controlArea: _controlArea,
  title,
  subtitle,
  icon: Icon,
  iconClass,
  tabs,
  renderOverview,
  renderUnifiedList,
  toolbarSearch,
  toolbarFilters,
  toolbarActions,
  onRefresh,
  onRecordTypeChange,
  headerMessage,
  onDismissHeaderMessage,
  headerChildren,
  footerLeft,
  footerRight,
}: ControlPageShellProps) {
  const [selectedRecordType, setSelectedRecordType] = useState<RecordType | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const activeTab = selectedRecordType
    ? (tabs.find((t) => t.id === selectedRecordType.toLowerCase())?.id || tabs[0]?.id || "")
    : "";

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

  const handleRecordTypeClick = (rt: RecordType) => {
    setSelectedRecordType((prev) => prev === rt ? null : rt);
    setSelectedId(null);
    onRecordTypeChange?.();
  };

  const tab = tabs.find((t) => t.id === activeTab);
  const filterNode = typeof toolbarFilters === "function" ? toolbarFilters(selectedRecordType) : toolbarFilters;
  const resetSelection = useCallback(() => { setSelectedId(null); }, []);
  const setSelection = useCallback((id: number) => { setSelectedId(id); }, []);
  const actionsNode = typeof toolbarActions === "function" ? toolbarActions(selectedRecordType, resetSelection, setSelection, setSelectedRecordType) : toolbarActions;

  // Only show radio buttons for record types that have a matching tab
  const availableRecordTypes = useMemo(() =>
    RECORD_TYPES.filter((rt) => tabs.some((t) => t.id === rt.id.toLowerCase())),
    [tabs]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-0 m-0">
      <div className="print-ignore">
        <PageHeader
          icon={<Icon className="h-5 w-5 stroke-current" />}
          iconClass={iconClass}
          title={title}
          subtitle={subtitle}
          systemMessage={headerMessage}
          onDismissSystemMessage={onDismissHeaderMessage}
        >
          {headerChildren}
        </PageHeader>
      </div>
      <div className="print-ignore">
        <Toolbar
          left={toolbarSearch || <div />}
          right={
            <div className="flex items-center gap-1 px-2 w-full">
              {availableRecordTypes.map((rt) => (
                <RadioButton key={rt.id} selected={selectedRecordType === rt.id} label={rt.label} onClick={() => handleRecordTypeClick(rt.id)} />
              ))}
              <span className="mx-1 h-5 w-px shrink-0 bg-border/40" />
              {filterNode}
              <div className="flex-1" />
              {actionsNode}
              {onRefresh && (
                <>
                  <span className="mx-1 h-5 w-px shrink-0 bg-border/40" />
                  <ToolbarButton icon={RefreshCw} label="Refresh" onClick={() => { setSelectedRecordType(null); setSelectedId(null); onRefresh(); }} />
                </>
              )}
            </div>
          }
        />
      </div>
      <div ref={splitRef} className="flex flex-1 min-h-0 overflow-hidden">
        <div className="print-ignore flex flex-col min-h-0 overflow-hidden bg-card/40 border-r border-border/20" style={{ flexBasis: `${leftPct}%`, minWidth: 200 }}>
          {renderUnifiedList
            ? renderUnifiedList((rt, id) => { setSelectedRecordType(rt); setSelectedId(id); }, selectedRecordType, selectedId)
            : selectedRecordType && tab
              ? tab.renderList(selectedId, setSelectedId)
              : (
                <div className="flex flex-1 items-center justify-center text-[10px] text-muted-foreground p-4 text-center">
                  Select Audits, Issues, Actions, DMR, or RMA above.
                </div>
              )}
        </div>
        <div onMouseDown={handleSplitMouseDown}
          className="print-ignore flex shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-amber-500/10"
          style={{ width: 2 }} />
        <div className="flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden">
          {selectedId !== null && tab
            ? tab.renderDetail(selectedId)
            : renderOverview()}
        </div>
      </div>
      <div className="print-ignore shrink-0 border-t border-border bg-muted flex h-10 items-center gap-2 px-4 text-xs text-muted-foreground font-medium">
        {footerLeft || (
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-[10px]">Issues</span></span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /><span className="text-[10px]">Actions</span></span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[10px]">Audits</span></span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /><span className="text-[10px]">DMR</span></span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-500" /><span className="text-[10px]">RMA</span></span>
          </div>
        )}
        <span className="flex-1" />
        {footerRight || <span>{selectedRecordType ? selectedRecordType.charAt(0) + selectedRecordType.slice(1).toLowerCase() : "Dashboard (overview)"}</span>}
      </div>
    </div>
  );
}
