import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useCallback } from "react";
import { DEPARTMENTS_QUERY } from "@/graphql/manufacturingQueries";
import { CREATE_DEPARTMENT_MUTATION, UPDATE_DEPARTMENT_MUTATION, DELETE_DEPARTMENT_MUTATION } from "@/graphql/departmentMutations";

interface DepartmentNode {
  id: string; name: string; code: string; status: "active" | "inactive";
  manager: string; employees: number; groupCount: number; resourceCount: number;
  plantId?: string | null; plantName: string;
}

interface DepartmentsQueryData { departments: DepartmentNode[]; }

const EMPTY_DEPT_FORM = { name: "", code: "", status: "active" as const, manager: "", employees: 0 };

export function useDepartments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, loading, error, refetch } = useQuery<DepartmentsQueryData>(DEPARTMENTS_QUERY, {
    variables: { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [createMutation] = useMutation<{ createDepartment: { department?: DepartmentNode; errors?: { field: string; message: string }[] } }>(CREATE_DEPARTMENT_MUTATION);
  const [updateMutation] = useMutation<{ updateDepartment: { department?: DepartmentNode; errors?: { field: string; message: string }[] } }>(UPDATE_DEPARTMENT_MUTATION);
  const [deleteMutation] = useMutation<{ deleteDepartment: { success: boolean; inUse: boolean; message: string } }>(DELETE_DEPARTMENT_MUTATION);

  const departments = data?.departments ?? [];

  const saveDepartment = useCallback(async (form: Record<string, string>, editingId?: string | null) => {
    const input = { name: form.name, code: form.code, status: form.status || "active", manager: form.manager || undefined, employees: form.employees ? Number(form.employees) : undefined };
    try {
      if (editingId) {
        const { data: res } = await updateMutation({ variables: { id: editingId, input } });
        if (res?.updateDepartment?.errors?.length) {
          const errs: Record<string, string> = {};
          res.updateDepartment.errors.forEach((e: { field: string; message: string }) => { errs[e.field] = e.message; });
          return { ok: false, errors: errs };
        }
      } else {
        const { data: res } = await createMutation({ variables: { input } });
        if (res?.createDepartment?.errors?.length) {
          const errs: Record<string, string> = {};
          res.createDepartment.errors.forEach((e: { field: string; message: string }) => { errs[e.field] = e.message; });
          return { ok: false, errors: errs };
        }
      }
      await refetch();
      return { ok: true };
    } catch {
      return { ok: false, errors: { _form: "Failed to save department." } };
    }
  }, [createMutation, updateMutation, refetch]);

  const deleteDepartment = useCallback(async (id: string) => {
    try {
      const { data: res } = await deleteMutation({ variables: { id } });
      if (res?.deleteDepartment) {
        if (res.deleteDepartment.inUse) return { success: false, inUse: true, message: res.deleteDepartment.message };
        await refetch();
        return { success: true, inUse: false, message: res.deleteDepartment.message };
      }
      return { success: false, inUse: false, message: "Failed to delete." };
    } catch {
      return { success: false, inUse: false, message: "Failed to delete department." };
    }
  }, [deleteMutation, refetch]);

  return { departments, loading, error, search, setSearch, statusFilter, setStatusFilter, saveDepartment, deleteDepartment, refetch, EMPTY_DEPT_FORM };
}
