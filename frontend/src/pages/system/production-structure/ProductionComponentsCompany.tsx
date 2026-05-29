import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useRegisterActions, useToolbar } from "./components/ToolbarContext";

const CompanyDetailView = lazy(() =>
  import("./components/CompanyDetailView").then((m) => ({ default: m.CompanyDetailView })),
);

export function ProductionComponentsCompany() {
  const registerActions = useRegisterActions();
  const { setEntityContext, setFooterContent, setToolbarVariant } = useToolbar();
  const [editing, setEditing] = useState(false);
  const [editState, setEditState] = useState({ dirty: false, valid: true, saving: false });
  const ref = useRef<{ startEditing: () => void; save: () => Promise<void>; cancel: () => void; refresh: () => Promise<void> }>(null);

  useEffect(() => {
    setEntityContext("");
    setFooterContent("Production Components / Company");
    setToolbarVariant("default");
    registerActions(editing ? {
      onSave: () => ref.current?.save(),
      onCancel: () => ref.current?.cancel(),
      editLabel: "Editing Company",
      isDirty: editState.dirty,
      isValid: editState.valid,
      isSaving: editState.saving,
    } : {
      onEdit: () => ref.current?.startEditing(),
      onRefresh: () => ref.current?.refresh(),
      hasSelected: true,
    });
    return () => {
      setEntityContext("");
      setFooterContent("");
    };
  }, [editing, editState, registerActions, setEntityContext, setFooterContent, setToolbarVariant]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">Loading company...</div>}>
        <CompanyDetailView ref={ref} simple onEditChange={setEditing} onEditStateChange={setEditState} />
      </Suspense>
    </div>
  );
}
