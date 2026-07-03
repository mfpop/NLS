import { createContext, useContext, type ReactNode } from "react";

export interface ToolbarConfig {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  rightActions?: ReactNode;
  leftSlot?: ReactNode;
  leftWidthClass?: string;
}

export interface ToolbarContextType {
  setToolbar: (config: ToolbarConfig | null) => void;
  setFooter: (content: ReactNode | null) => void;
}

export const ToolbarContext = createContext<ToolbarContextType>({
  setToolbar: () => {},
  setFooter: () => {},
});

export function useToolbar() {
  return useContext(ToolbarContext);
}
