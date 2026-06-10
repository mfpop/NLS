import { Inbox } from "lucide-react";

interface Props {
  message?: string;
}

export function LiveShopfloorEmptyState({ message = "No active shopfloor events for the selected line." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}
