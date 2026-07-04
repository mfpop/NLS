import { useState, useRef, useEffect, useCallback } from "react";
import { Check, X } from "lucide-react";

interface BaseProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  label?: string;
}

interface TextProps extends BaseProps {
  type?: "text";
  placeholder?: string;
}

interface TextareaProps extends BaseProps {
  type: "textarea";
  placeholder?: string;
}

interface SelectProps extends BaseProps {
  type: "select";
  options: { value: string; label: string }[];
}

type InlineEditProps = TextProps | TextareaProps | SelectProps;

export function InlineEditField(props: InlineEditProps) {
  const { value, onSave, className = "", label } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing, value]);

  const hSave = useCallback(() => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  }, [draft, value, onSave]);

  const hCancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const hKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && props.type !== "textarea") { e.preventDefault(); hSave(); }
    if (e.key === "Escape") { hCancel(); }
  }, [hSave, hCancel, props.type]);

  if (editing) {
    const inputCls = "h-7 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none focus:border-primary rounded";
    const textareaCls = "w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 py-1 text-xs outline-none focus:border-primary resize-none rounded";
    const selectCls = "h-7 w-full bg-background/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700/30 px-2 text-xs outline-none focus:border-primary rounded cursor-pointer";

    return (
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          {props.type === "textarea" ? (
            <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={hKeyDown} rows={2} className={textareaCls} />
          ) : props.type === "select" ? (
            <select ref={inputRef as React.RefObject<HTMLSelectElement>} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={hKeyDown} className={selectCls}>
              {props.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={hKeyDown} className={inputCls} placeholder={(props as TextProps).placeholder} />
          )}
        </div>
        <div className="flex shrink-0 gap-0.5 pt-0.5">
          <button onClick={hSave} className="flex h-5 w-5 items-center justify-center rounded text-success hover:bg-success/10 dark:hover:bg-green-950/30"><Check className="h-3 w-3 stroke-current" /></button>
          <button onClick={hCancel} className="flex h-5 w-5 items-center justify-center rounded text-danger hover:bg-danger/10 dark:hover:bg-red-950/30"><X className="h-3 w-3 stroke-current" /></button>
        </div>
      </div>
    );
  }

  const displayValue = props.type === "select"
    ? (props as SelectProps).options.find((o) => o.value === value)?.label || value
    : value || "—";

  return (
    <button onClick={() => setEditing(true)} className={`group cursor-pointer text-left transition-all hover:bg-background/40 dark:hover:bg-slate-800/40 rounded px-1 -mx-1 ${className}`} title={label ? `Edit ${label}` : "Click to edit"}>
      <span className="text-foreground font-medium group-hover:underline group-hover:decoration-dotted group-hover:decoration-muted-foreground/40">{displayValue}</span>
    </button>
  );
}
