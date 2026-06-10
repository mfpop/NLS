import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function LiveShopfloorErrorState({ message = "Failed to load live shopfloor data.", onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
        <AlertCircle className="h-6 w-6 text-danger" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 h-8 px-3 rounded text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}
