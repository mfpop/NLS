import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { IMPORT_JOBS_QUERY } from "@/graphql/erpDataJobQueries";
import { CREATE_IMPORT_JOB, ATTACH_IMPORT_FILE, TRANSITION_IMPORT_JOB } from "@/graphql/erpDataJobMutations";

export interface ImportJob {
  id: string; sourceConfigId: string; sourceConfigName: string; domain: string;
  fileName: string; filePath: string; fileSize?: number | null; fileHash?: string | null;
  startedAt: string; completedAt?: string | null;
  status: string; recordsProcessed: number; recordsCreated: number; recordsUpdated: number;
  recordsFailed: number; errorSummary?: string | null; triggeredBy?: string | null; createdAt: string;
}
export interface ImportSource { id: string; name: string; domain: string; sourceType: string; isActive: boolean; }

export interface ImportJobMutationResult {
  ok: boolean;
  job: ImportJob | null;
  errorCode: string | null;
  message: string | null;
  existingJobId: string | null;
  sourceConfigId: string | null;
  fileName: string | null;
}

function normalizeImportJobPayload(payload?: ImportJobMutationResult | null): ImportJobMutationResult {
  return {
    ok: Boolean(payload?.ok),
    job: payload?.job ?? null,
    errorCode: payload?.errorCode ?? null,
    message: payload?.message ?? null,
    existingJobId: payload?.existingJobId ?? null,
    sourceConfigId: payload?.sourceConfigId ?? null,
    fileName: payload?.fileName ?? null,
  };
}

interface UseImportJobsReturn {
  jobs: ImportJob[];
  sources: ImportSource[];
  loading: boolean;
  refetch: () => void;
  createJob: (sourceId: string, fileName?: string, fileHash?: string) => Promise<ImportJobMutationResult>;
  attachFile: (jobId: string, fileName: string, filePath: string, fileSize?: number, fileHash?: string) => Promise<ImportJobMutationResult>;
  transitionJob: (action: string, jobId: string) => Promise<boolean>;
  isCreating: boolean;
  isAttaching: boolean;
  actionLoading: string | null;
  actionError: string | null;
  clearActionError: () => void;
}

export function useImportJobs(sourceFilter?: string, statusFilter?: string, showAll?: boolean): UseImportJobsReturn {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{
    importJobs: { items: ImportJob[] };
    importSourceConfigs: { items: ImportSource[] };
  }>(IMPORT_JOBS_QUERY, {
    variables: { sourceId: sourceFilter || null, status: statusFilter || null, limit: showAll ? null : 50 },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [createMutation] = useMutation<{ createImportJob: ImportJobMutationResult }>(CREATE_IMPORT_JOB);
  const [attachMutation] = useMutation<{ attachImportFile: ImportJobMutationResult }>(ATTACH_IMPORT_FILE);
  const [transitionMutation] = useMutation<{
    transitionImportJob: { ok: boolean; message?: string | null; errors?: Array<{ field?: string | null; code: string; message: string }> | null };
  }>(TRANSITION_IMPORT_JOB);

  const createJob = useCallback(async (sourceId: string, fileName?: string, fileHash?: string): Promise<ImportJobMutationResult> => {
    setActionLoading("CREATE");
    setActionError(null);
    try {
      const result = await createMutation({ variables: { sourceId, fileName: fileName ?? null, fileHash: fileHash ?? null } });
      const payload = normalizeImportJobPayload(result.data?.createImportJob);
      return payload;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Create failed");
      return { ok: false, job: null, errorCode: null, message: err instanceof Error ? err.message : "Create failed", existingJobId: null, sourceConfigId: null, fileName: null };
    } finally {
      setActionLoading(null);
    }
  }, [createMutation]);

  const attachFile = useCallback(async (
    jobId: string, fileName: string, filePath: string, fileSize?: number, fileHash?: string
  ): Promise<ImportJobMutationResult> => {
    setActionLoading("ATTACH");
    setActionError(null);
    try {
      const result = await attachMutation({
        variables: { jobId, input: { fileName, filePath, fileSize: fileSize ?? null, fileHash: fileHash ?? null } },
      });
      const payload = normalizeImportJobPayload(result.data?.attachImportFile);
      if (!payload.ok) {
        setActionError(payload.message ?? "Failed to attach file");
        return payload;
      }
      return payload;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Attach failed");
      return { ok: false, job: null, errorCode: null, message: err instanceof Error ? err.message : "Attach failed", existingJobId: null, sourceConfigId: null, fileName: null };
    } finally {
      setActionLoading(null);
    }
  }, [attachMutation]);

  const transitionJob = useCallback(async (action: string, jobId: string): Promise<boolean> => {
    setActionLoading(action);
    setActionError(null);
    try {
      const result = await transitionMutation({ variables: { action, jobId } });
      const payload = result.data?.transitionImportJob;
      if (!payload?.ok) {
        setActionError(payload?.errors?.[0]?.message ?? payload?.message ?? "Action failed");
        return false;
      }
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
      return false;
    } finally {
      setActionLoading(null);
    }
  }, [transitionMutation]);

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    jobs: data?.importJobs?.items ?? [],
    sources: data?.importSourceConfigs?.items ?? [],
    loading,
    refetch,
    createJob,
    attachFile,
    transitionJob,
    isCreating: actionLoading === "CREATE",
    isAttaching: actionLoading === "ATTACH",
    actionLoading,
    actionError,
    clearActionError,
  };
}
