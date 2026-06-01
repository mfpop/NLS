import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from "react";

interface ToolbarActions {
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeletePermanent?: () => void;
  onRefresh?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDiscardChanges?: () => void;
  hasSelected?: boolean;
  editLabel?: string;
  isDirty?: boolean;
  isValid?: boolean;
  isSaving?: boolean;
}

interface StateContextValue {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  toolbarVariant: "default" | "splitListDetail";
  setToolbarVariant: (v: "default" | "splitListDetail") => void;
  footerContent: string;
  setFooterContent: (v: string) => void;
  entityContext: string;
  setEntityContext: (v: string) => void;
  systemMessage: { message: string; type: "success" | "error" | "info" } | null;
  showSystemMessage: (message: string, type?: "success" | "error" | "info") => void;
  clearSystemMessage: () => void;
}

const StateContext = createContext<StateContextValue>({
  search: "",
  setSearch: () => {},
  statusFilter: "all",
  setStatusFilter: () => {},
  toolbarVariant: "default",
  setToolbarVariant: () => {},
  footerContent: "",
  setFooterContent: () => {},
  entityContext: "",
  setEntityContext: () => {},
  systemMessage: null,
  showSystemMessage: () => {},
  clearSystemMessage: () => {},
});

const ActionsContext = createContext<ToolbarActions>({});

const RegisterContext = createContext<(a: ToolbarActions) => void>(() => {});

function shallowEqual(a: ToolbarActions, b: ToolbarActions): boolean {
  return a.onAdd === b.onAdd
    && a.onEdit === b.onEdit
    && a.onDelete === b.onDelete
    && a.onDeletePermanent === b.onDeletePermanent
    && a.onRefresh === b.onRefresh
    && a.onSave === b.onSave
    && a.onCancel === b.onCancel
    && a.onDiscardChanges === b.onDiscardChanges
    && a.hasSelected === b.hasSelected
    && a.editLabel === b.editLabel
    && a.isDirty === b.isDirty
    && a.isValid === b.isValid
    && a.isSaving === b.isSaving;
}

export function ToolbarProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toolbarVariant, setToolbarVariant] = useState<"default" | "splitListDetail">("default");
  const [footerContent, setFooterContent] = useState("");
  const [entityContext, setEntityContext] = useState("");
  const [systemMessage, setSystemMessage] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [actions, setActions] = useState<ToolbarActions>({});
  const actionsRef = useRef<ToolbarActions>({});
  const messageTimerRef = useRef<number | null>(null);

  const registerActions = useCallback((a: ToolbarActions) => {
    if (!shallowEqual(actionsRef.current, a)) {
      actionsRef.current = a;
      setActions(a);
    }
  }, []);

  const clearSystemMessage = useCallback(() => {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
    setSystemMessage(null);
  }, []);

  const showSystemMessage = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    if (messageTimerRef.current !== null) window.clearTimeout(messageTimerRef.current);
    setSystemMessage({ message, type });
    messageTimerRef.current = window.setTimeout(() => {
      setSystemMessage(null);
      messageTimerRef.current = null;
    }, 5000);
  }, []);

  const stateValue = useMemo(() => ({
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    toolbarVariant,
    setToolbarVariant,
    footerContent,
    setFooterContent,
    entityContext,
    setEntityContext,
    systemMessage,
    showSystemMessage,
    clearSystemMessage,
  }), [search, statusFilter, toolbarVariant, footerContent, entityContext, systemMessage, showSystemMessage, clearSystemMessage]);

  return (
    <StateContext.Provider value={stateValue}>
      <RegisterContext.Provider value={registerActions}>
        <ActionsContext.Provider value={actions}>
          {children}
        </ActionsContext.Provider>
      </RegisterContext.Provider>
    </StateContext.Provider>
  );
}

export function useToolbar(): StateContextValue {
  return useContext(StateContext);
}

export function useToolbarActions(): ToolbarActions {
  return useContext(ActionsContext);
}

export function useRegisterActions(): (a: ToolbarActions) => void {
  return useContext(RegisterContext);
}
