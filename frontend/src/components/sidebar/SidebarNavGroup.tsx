import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SidebarNavItem } from "./SidebarNavItem";
import type { NavEntry } from "./navigationConfig";
import { isPathActive } from "./navigationConfig";

export function SidebarNavGroup({ id, label, icon: Icon, items, pathname, openSection, onToggle, onNavigate }: {
  id: string; label: string; icon: LucideIcon; items: NavEntry[]; pathname: string;
  openSection: string | null; onToggle: (id: string) => void; onNavigate?: () => void;
}) {
  const isOpen = openSection === id;

  const hasActiveChild = items.some((item) => {
    if (item.type === "item") return isPathActive(pathname, item.to);
    return item.items?.some((c) => c.type === "item" && isPathActive(pathname, c.to));
  });

  return (
    <div>
      <button type="button" onClick={() => onToggle(id)}
        className={`flex items-center gap-2.5 w-full h-9 px-3 text-xs font-medium transition-colors outline-none focus:outline-none ${
          hasActiveChild ? "text-slate-600 dark:text-slate-400 bg-slate-200/30 dark:bg-slate-800/40" : "text-slate-500 dark:text-slate-400"
        } hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40`}
      >
        <Icon className="h-[18px] w-[18px] stroke-current shrink-0" />
        <span className="truncate flex-1 text-left text-[15px]">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 stroke-current transition-transform duration-150 ${isOpen ? "rotate-0" : "-rotate-90"}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-150 ${isOpen ? "max-h-[1000px]" : "max-h-0"}`}>
        <div className="py-0.5 space-y-0.5">
          {items.map((item, i) => (
            <NavEntryRow key={i} entry={item} depth={1} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavEntryRow({ entry, depth = 0, pathname, onNavigate }: {
  entry: NavEntry; depth?: number; pathname: string; onNavigate?: () => void;
}) {
  const hasActive = entry.type === "group" && entry.items.some((c) => c.type === "item" && isPathActive(pathname, c.to));
  const [userOpen, setUserOpen] = useState(false);
  const isOpen = userOpen || hasActive;

  if (entry.type === "item") {
    return <SidebarNavItem to={entry.to} icon={entry.icon} label={entry.label} depth={depth} onNavigate={onNavigate} />;
  }

  return (
    <div>
      <button type="button" onClick={() => setUserOpen(!userOpen)}
        className="flex items-center gap-2.5 w-full h-8 pr-3 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-l-[3px] border-transparent outline-none focus:outline-none"
        style={{ paddingLeft: 28 + depth * 12 }}
      >
        <ChevronRight className={`h-3 w-3 stroke-current shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
        <span className="truncate flex-1 text-left">{entry.label}</span>
      </button>
      <div className={`overflow-hidden transition-all duration-150 ${isOpen ? "max-h-[1000px]" : "max-h-0"}`}>
        <div className="space-y-0.5">
          {entry.items.map((child, i) => (
            <NavEntryRow key={i} entry={child} depth={depth + 1} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
}
