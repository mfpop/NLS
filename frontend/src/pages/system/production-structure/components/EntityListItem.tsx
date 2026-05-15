import type { ReactNode } from "react";

interface EntityListItemProps {
  name: string;
  code?: string | null;
  meta: string;
  icon: ReactNode;
  selected: boolean;
  status?: string;
  onClick: () => void;
  accentColor: "violet" | "teal" | "amber" | "rose" | "slate";
  issueTags?: ReactNode;
}

const ACCENT: Record<string, { border: string; bg: string; text: string; activeBg: string; hoverBg: string }> = {
  violet: {
    border: "border-l-violet-500 dark:border-l-violet-400",
    bg: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
    text: "text-violet-800 dark:text-violet-300",
    activeBg: "bg-linear-to-r from-violet-50 to-white dark:from-violet-900/15 dark:to-slate-900",
    hoverBg: "group-hover:bg-violet-50 group-hover:text-violet-500",
  },
  teal: {
    border: "border-l-teal-500 dark:border-l-teal-400",
    bg: "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400",
    text: "text-teal-800 dark:text-teal-300",
    activeBg: "bg-linear-to-r from-teal-50 to-white dark:from-teal-900/15 dark:to-slate-900",
    hoverBg: "group-hover:bg-teal-50 group-hover:text-teal-500",
  },
  amber: {
    border: "border-l-amber-500 dark:border-l-amber-400",
    bg: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    text: "text-amber-800 dark:text-amber-300",
    activeBg: "bg-linear-to-r from-amber-50 to-white dark:from-amber-900/15 dark:to-slate-900",
    hoverBg: "group-hover:bg-amber-50 group-hover:text-amber-500",
  },
  rose: {
    border: "border-l-rose-500 dark:border-l-rose-400",
    bg: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
    text: "text-rose-800 dark:text-rose-300",
    activeBg: "bg-linear-to-r from-rose-50 to-white dark:from-rose-900/15 dark:to-slate-900",
    hoverBg: "group-hover:bg-rose-50 group-hover:text-rose-500",
  },
  slate: {
    border: "border-l-slate-500 dark:border-l-slate-400",
    bg: "bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300",
    text: "text-slate-800 dark:text-slate-300",
    activeBg: "bg-linear-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900",
    hoverBg: "group-hover:bg-slate-200 group-hover:text-slate-500 dark:group-hover:bg-slate-700",
  },
};

export function EntityListItem({ name, code, meta, icon, selected, status, onClick, accentColor, issueTags }: EntityListItemProps) {
  const a = ACCENT[accentColor];
  const isActive = status !== "inactive";
  return (
    <div onClick={onClick}
      className={`group flex items-center gap-2 px-3 cursor-pointer transition-all duration-150 h-12 ${
        selected ? a.activeBg + " border-l-[3px] " + a.border : "hover:bg-slate-50 dark:hover:bg-slate-800/30 border-l-[3px] border-l-transparent"
      }`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${selected ? a.bg : "bg-slate-50 text-slate-400 " + a.hoverBg + " dark:bg-slate-800 dark:text-slate-500"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className={`text-[14px] font-semibold truncate ${selected ? a.text : "text-slate-800 dark:text-slate-200"}`}>{name}</span>
          {code && <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">{code}</span>}
          {issueTags}
        </div>
        <div className="mt-px truncate text-[12px] text-slate-400 dark:text-slate-500" title={meta}>
          {meta}
        </div>
      </div>
      <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
    </div>
  );
}
