import { Search, X } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onEnter?: () => void;
}

export function SearchInput({ value, onChange, placeholder = "Search", className = "", onEnter }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onEnter?.(); if (e.key === "Escape") { (e.target as HTMLInputElement).blur(); onChange(""); } }}
        placeholder={placeholder}
        className={`peer h-7 w-full rounded border pl-3 pr-8 text-xs outline-none transition-all ${theme.input} hover:border-slate-400 dark:hover:border-slate-500 focus:border-emerald-500 focus:border-b-2 focus:ring-0 dark:focus:border-emerald-400`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 transition-colors ${theme.iconSubtle} peer-focus:text-slate-600 dark:peer-focus:text-slate-300 ${theme.link}`}
        >
          <X className="h-3.5 w-3.5 stroke-current" />
        </button>
      ) : (
        <Search className={`pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-current transition-colors ${theme.iconSubtle} peer-focus:text-slate-600 dark:peer-focus:text-slate-300`} />
      )}
    </div>
  );
}
