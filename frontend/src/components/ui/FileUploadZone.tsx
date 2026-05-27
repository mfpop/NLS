import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

export interface FileUploadZoneProps {
  /** Called when a file is selected or dropped */
  onFileSelect: (file: File | null) => void;
  /** Currently selected file (for controlled mode) */
  file: File | null;
  /** Accepted MIME types or file extensions */
  accept?: string;
  /** Human-readable description of accepted formats */
  acceptLabel?: string;
  /** Max file size in bytes (default 10MB) */
  maxSize?: number;
  /** Loading state — shows spinner instead of drop zone */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** File input ref for external control */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Additional class names */
  className?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".json"];
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/json",
];

function isAllowed(file: File): { ok: boolean; reason?: string } {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, reason: `Unsupported format. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }
  return { ok: true };
}

// ── Component ──────────────────────────────────────────────────────────

export function FileUploadZone({
  onFileSelect,
  file,
  accept = ".xlsx,.xls,.csv,.json",
  acceptLabel = "Excel (.xlsx, .xls), CSV, JSON",
  maxSize = 10 * 1024 * 1024, // 10 MB
  loading = false,
  error: externalError,
  inputRef: externalInputRef,
  className = "",
  disabled = false,
}: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalRef;

  const error = externalError ?? localError;

  const validateAndSet = useCallback(
    (f: File | null) => {
      setLocalError(null);
      if (!f) {
        onFileSelect(null);
        return;
      }

      // Check type
      const allowed = isAllowed(f);
      if (!allowed.ok) {
        setLocalError(allowed.reason ?? "Invalid file type.");
        onFileSelect(null);
        return;
      }

      // Check size
      if (f.size > maxSize) {
        setLocalError(`File too large (${formatSize(f.size)}). Max: ${formatSize(maxSize)}.`);
        onFileSelect(null);
        return;
      }

      onFileSelect(f);
    },
    [onFileSelect, maxSize],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) validateAndSet(dropped);
    },
    [disabled, validateAndSet],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      validateAndSet(f);
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [validateAndSet],
  );

  const handleBrowse = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled, inputRef]);

  const handleClear = useCallback(() => {
    setLocalError(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileSelect, inputRef]);

  // ── Render ──

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/30 bg-muted/20 px-6 py-8 ${className}`}
      >
        <Loader2 className="h-8 w-8 text-muted-foreground/40 animate-spin stroke-current" />
        <span className="text-[11px] text-muted-foreground">Processing file...</span>
      </div>
    );
  }

  if (file) {
    return (
      <div className={`rounded-xl border border-success/30 bg-success/5 px-4 py-3 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
            <FileSpreadsheet className="h-5 w-5 text-success stroke-current" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-foreground truncate">{file.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatSize(file.size)} · {file.type || "Unknown type"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-danger/10 hover:text-danger transition-colors disabled:pointer-events-none disabled:opacity-40"
            title="Remove file"
          >
            <X className="h-4 w-4 stroke-current" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-success">
          <CheckCircle className="h-3 w-3 stroke-current shrink-0" />
          <span>Ready to upload</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleBrowse(); }}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
          px-6 py-8 transition-all duration-200 select-none
          ${dragOver
            ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/5 scale-[1.01]"
            : "border-border/30 bg-muted/10 hover:border-border/50 hover:bg-muted/20"
          }
          ${disabled ? "pointer-events-none opacity-50" : ""}
        `}
      >
        {/* Animated drop indicator */}
        <div
          className={`
            absolute inset-0 rounded-xl border-2 border-primary/30 transition-all duration-200 pointer-events-none
            ${dragOver ? "opacity-100 scale-100" : "opacity-0 scale-95"}
          `}
        />

        <div className={`
          flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200
          ${dragOver ? "bg-primary/15 text-primary scale-110" : "bg-muted text-muted-foreground"}
        `}>
          <Upload className={`h-6 w-6 stroke-current transition-all duration-200 ${dragOver ? "translate-y-[-2px]" : ""}`} />
        </div>

        <div className="text-center space-y-1">
          <p className={`text-[13px] font-semibold transition-colors duration-200 ${dragOver ? "text-primary" : "text-foreground"}`}>
            {dragOver ? "Drop file here" : "Drag & drop file here"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            or <span className="text-primary underline underline-offset-2 hover:no-underline font-medium">browse files</span>
          </p>
          <p className="text-[9px] text-muted-foreground/60 pt-1">{acceptLabel} · Max {formatSize(maxSize)}</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-danger/5 px-3 py-2 text-[11px] text-danger border border-danger/20">
          <AlertTriangle className="h-3.5 w-3.5 stroke-current shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            className="ml-auto flex h-5 w-5 items-center justify-center rounded hover:bg-danger/10"
          >
            <X className="h-3 w-3 stroke-current" />
          </button>
        </div>
      )}
    </div>
  );
}
