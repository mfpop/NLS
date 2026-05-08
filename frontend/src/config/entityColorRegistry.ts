export interface EntityColorTokens {
  bg: string;
  text: string;
  border: string;
  icon: string;
  hoverBg: string;
  selectedBg: string;
  darkBg: string;
  darkText: string;
  darkBorder: string;
  darkIcon: string;
  darkHoverBg: string;
  darkSelectedBg: string;
}

const COLOR_REGISTRY: Record<string, EntityColorTokens> = {
  emerald: {
    bg: "bg-emerald-100",
    text: "text-emerald-600",
    border: "border-emerald-400",
    icon: "text-emerald-600",
    hoverBg: "hover:bg-emerald-50",
    selectedBg: "bg-emerald-50",
    darkBg: "dark:bg-emerald-500/10",
    darkText: "dark:text-emerald-400",
    darkBorder: "dark:border-emerald-500/20",
    darkIcon: "dark:text-emerald-400",
    darkHoverBg: "dark:hover:bg-emerald-500/10",
    darkSelectedBg: "dark:bg-emerald-500/10",
  },
  blue: {
    bg: "bg-blue-100",
    text: "text-blue-600",
    border: "border-blue-400",
    icon: "text-blue-600",
    hoverBg: "hover:bg-blue-50",
    selectedBg: "bg-blue-50",
    darkBg: "dark:bg-blue-500/10",
    darkText: "dark:text-blue-400",
    darkBorder: "dark:border-blue-500/20",
    darkIcon: "dark:text-blue-400",
    darkHoverBg: "dark:hover:bg-blue-500/10",
    darkSelectedBg: "dark:bg-blue-500/10",
  },
  amber: {
    bg: "bg-transparent",
    text: "text-amber-600",
    border: "border-amber-400",
    icon: "text-amber-600",
    hoverBg: "hover:bg-amber-50",
    selectedBg: "bg-amber-50",
    darkBg: "",
    darkText: "dark:text-amber-400",
    darkBorder: "dark:border-amber-500/20",
    darkIcon: "dark:text-amber-400",
    darkHoverBg: "dark:hover:bg-amber-500/10",
    darkSelectedBg: "dark:bg-amber-500/10",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-600",
    border: "border-purple-400",
    icon: "text-purple-600",
    hoverBg: "hover:bg-purple-50",
    selectedBg: "bg-purple-50",
    darkBg: "dark:bg-purple-500/10",
    darkText: "dark:text-purple-400",
    darkBorder: "dark:border-purple-500/20",
    darkIcon: "dark:text-purple-400",
    darkHoverBg: "dark:hover:bg-purple-500/10",
    darkSelectedBg: "dark:bg-purple-500/10",
  },
  rose: {
    bg: "bg-rose-100",
    text: "text-rose-600",
    border: "border-rose-400",
    icon: "text-rose-600",
    hoverBg: "hover:bg-rose-50",
    selectedBg: "bg-rose-50",
    darkBg: "dark:bg-rose-500/10",
    darkText: "dark:text-rose-400",
    darkBorder: "dark:border-rose-500/20",
    darkIcon: "dark:text-rose-400",
    darkHoverBg: "dark:hover:bg-rose-500/10",
    darkSelectedBg: "dark:bg-rose-500/10",
  },
  gray: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-400",
    icon: "text-gray-600",
    hoverBg: "hover:bg-gray-50",
    selectedBg: "bg-gray-50",
    darkBg: "dark:bg-gray-500/10",
    darkText: "dark:text-gray-400",
    darkBorder: "dark:border-gray-500/20",
    darkIcon: "dark:text-gray-400",
    darkHoverBg: "dark:hover:bg-gray-500/10",
    darkSelectedBg: "dark:bg-gray-500/10",
  },
  slate: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-400",
    icon: "text-slate-600",
    hoverBg: "hover:bg-slate-50",
    selectedBg: "bg-slate-50",
    darkBg: "dark:bg-slate-500/10",
    darkText: "dark:text-slate-400",
    darkBorder: "dark:border-slate-500/20",
    darkIcon: "dark:text-slate-400",
    darkHoverBg: "dark:hover:bg-slate-500/10",
    darkSelectedBg: "dark:bg-slate-500/10",
  },
  indigo: {
    bg: "bg-indigo-100",
    text: "text-indigo-600",
    border: "border-indigo-400",
    icon: "text-indigo-600",
    hoverBg: "hover:bg-indigo-50",
    selectedBg: "bg-indigo-50",
    darkBg: "dark:bg-indigo-500/10",
    darkText: "dark:text-indigo-400",
    darkBorder: "dark:border-indigo-500/20",
    darkIcon: "dark:text-indigo-400",
    darkHoverBg: "dark:hover:bg-indigo-500/10",
    darkSelectedBg: "dark:bg-indigo-500/10",
  },
  zinc: {
    bg: "bg-zinc-100",
    text: "text-zinc-600",
    border: "border-zinc-400",
    icon: "text-zinc-600",
    hoverBg: "hover:bg-zinc-50",
    selectedBg: "bg-zinc-50",
    darkBg: "dark:bg-zinc-500/10",
    darkText: "dark:text-zinc-400",
    darkBorder: "dark:border-zinc-500/20",
    darkIcon: "dark:text-zinc-400",
    darkHoverBg: "dark:hover:bg-zinc-500/10",
    darkSelectedBg: "dark:bg-zinc-500/10",
  },
  cyan: {
    bg: "bg-cyan-100",
    text: "text-cyan-600",
    border: "border-cyan-400",
    icon: "text-cyan-600",
    hoverBg: "hover:bg-cyan-50",
    selectedBg: "bg-cyan-50",
    darkBg: "dark:bg-cyan-500/10",
    darkText: "dark:text-cyan-400",
    darkBorder: "dark:border-cyan-500/20",
    darkIcon: "dark:text-cyan-400",
    darkHoverBg: "dark:hover:bg-cyan-500/10",
    darkSelectedBg: "dark:bg-cyan-500/10",
  },
  violet: {
    bg: "bg-violet-100",
    text: "text-violet-600",
    border: "border-violet-400",
    icon: "text-violet-600",
    hoverBg: "hover:bg-violet-50",
    selectedBg: "bg-violet-50",
    darkBg: "dark:bg-violet-500/10",
    darkText: "dark:text-violet-400",
    darkBorder: "dark:border-violet-500/20",
    darkIcon: "dark:text-violet-400",
    darkHoverBg: "dark:hover:bg-violet-500/10",
    darkSelectedBg: "dark:bg-violet-500/10",
  },
  orange: {
    bg: "bg-orange-100",
    text: "text-orange-600",
    border: "border-orange-400",
    icon: "text-orange-600",
    hoverBg: "hover:bg-orange-50",
    selectedBg: "bg-orange-50",
    darkBg: "dark:bg-orange-500/10",
    darkText: "dark:text-orange-400",
    darkBorder: "dark:border-orange-500/20",
    darkIcon: "dark:text-orange-400",
    darkHoverBg: "dark:hover:bg-orange-500/10",
    darkSelectedBg: "dark:bg-orange-500/10",
  },
};

export const ALLOWED_COLOR_KEYS = Object.keys(COLOR_REGISTRY);

export function getColorTokens(key: string): EntityColorTokens {
  return COLOR_REGISTRY[key] || COLOR_REGISTRY.gray;
}

export function getColorClasses(key: string): { iconBg: string; iconText: string } {
  const t = getColorTokens(key);
  return { iconBg: `${t.bg} ${t.darkBg}`, iconText: `${t.text} ${t.darkText}` };
}

export default COLOR_REGISTRY;
