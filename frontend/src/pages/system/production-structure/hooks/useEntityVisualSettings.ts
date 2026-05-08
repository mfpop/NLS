import { useQuery, useMutation } from "@apollo/client/react";
import { useMemo, useCallback, useState, useEffect } from "react";
import {
  ENTITY_VISUAL_SETTINGS_QUERY,
  UPDATE_ENTITY_VISUAL_SETTING_MUTATION,
  RESET_ENTITY_VISUAL_SETTING_MUTATION,
  DEFAULT_SEED,
} from "../../../../graphql/entityVisualSettingsQueries";
import type { EntityVisualSetting } from "../../../../graphql/entityVisualSettingsQueries";

export function useEntityVisualSettings() {
  const [settings, setSettings] = useState<EntityVisualSetting[]>(DEFAULT_SEED);
  const [backendReady, setBackendReady] = useState(false);

  const { data, loading, error, refetch } = useQuery<{ entityVisualSettings: EntityVisualSetting[] }>(
    ENTITY_VISUAL_SETTINGS_QUERY,
    { fetchPolicy: "cache-and-network", errorPolicy: "all" }
  );

  const [updateMutation] = useMutation<{ updateEntityVisualSetting: { setting: EntityVisualSetting; errors?: { field: string; message: string }[] } }>(UPDATE_ENTITY_VISUAL_SETTING_MUTATION);
  const [resetMutation] = useMutation<{ resetEntityVisualSettingToDefault: { setting: EntityVisualSetting; errors?: { field: string; message: string }[] } }>(RESET_ENTITY_VISUAL_SETTING_MUTATION);

  useEffect(() => {
    if (data?.entityVisualSettings) {
      setSettings(data.entityVisualSettings);
      setBackendReady(true);
      localStorage.setItem("lmd-entity-visual-settings", JSON.stringify(data.entityVisualSettings));
    }
  }, [data]);

  useEffect(() => {
    if (error && !backendReady) {
      const stored = localStorage.getItem("lmd-entity-visual-settings");
      if (stored) {
        try { setSettings(JSON.parse(stored)); } catch { /* use defaults */ }
      }
    }
  }, [error, backendReady]);

  const getSetting = useCallback(
    (entityType: string): EntityVisualSetting | undefined =>
      settings.find((s) => s.entityType === entityType),
    [settings]
  );

  const updateSetting = useCallback(
    async (
      entityType: string,
      input: Partial<EntityVisualSetting>
    ): Promise<boolean> => {
      setSettings((prev) =>
        prev.map((s) => (s.entityType === entityType ? { ...s, ...input } : s))
      );
      try {
        const { data: res } = await updateMutation({
          variables: { entityType, ...input },
        });
        if (res?.updateEntityVisualSetting?.setting) {
          setSettings((prev) =>
            prev.map((s) =>
              s.entityType === entityType
                ? { ...s, ...res.updateEntityVisualSetting.setting }
                : s
            )
          );
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [updateMutation]
  );

  const resetSetting = useCallback(
    async (entityType: string): Promise<boolean> => {
      const defaultRow = DEFAULT_SEED.find((s) => s.entityType === entityType);
      if (!defaultRow) return false;
      setSettings((prev) =>
        prev.map((s) => (s.entityType === entityType ? { ...s, ...defaultRow } : s))
      );
      try {
        const { data: res } = await resetMutation({ variables: { entityType } });
        if (res?.resetEntityVisualSettingToDefault?.setting) {
          setSettings((prev) =>
            prev.map((s) =>
              s.entityType === entityType
                ? { ...s, ...res.resetEntityVisualSettingToDefault.setting }
                : s
            )
          );
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [resetMutation]
  );

  const allSettings = useMemo(() => {
    const order = ["company", "plant", "productionLine", "department", "resourceGroup", "resource"];
    const map = new Map(settings.map((s) => [s.entityType, s]));
    return order.map((et) => map.get(et) || DEFAULT_SEED.find((d) => d.entityType ===et)!).filter(Boolean);
  }, [settings]);

  return {
    settings: allSettings,
    loading,
    error,
    getSetting,
    updateSetting,
    resetSetting,
    refetch,
  };
}
