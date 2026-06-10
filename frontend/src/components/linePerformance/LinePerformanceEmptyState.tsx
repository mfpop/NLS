import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message?: string;
}

export function LinePerformanceEmptyState({ message = "No performance records found for the selected line/shift." }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}
