import { useQuery, useMutation } from "@apollo/client/react";
import { useState, useCallback } from "react";
import { DEPARTMENTS_QUERY } from "@/graphql/manufacturingQueries";
import { ASSIGN_DEPARTMENT_TO_LINES_MUTATION, CREATE_DEPARTMENT_MUTATION, DELETE_DEPARTMENT_MUTATION, UPDATE_DEPARTMENT_MUTATION } from "@/graphql/departmentMutations";

export interface PersonRef {
  id: string;
  name: string;
}

export interface DepartmentProductionLine {
  id: string;
  name: string;
  code: string;
  plantName: string;
  status?: string;
}

export interface DepartmentResourceGroup {
  id: string;
  name: string;
  code: string;
  status: string;
  resourceCount: number;
}

export interface DepartmentNode {
  id: string; name: string; code: string; description?: string; status: "active" | "inactive" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  statusId?: string; manager: string; managerRef?: PersonRef | null; supervisor?: PersonRef | null; supervisorName?: string;
  employees: number; employeeCount: number;
  productionLineCount: number; productionLines: DepartmentProductionLine[];
  groupCount: number; groupName?: string; resourceGroupCount: number; resourceCount: number; resourceGroups: DepartmentResourceGroup[];
  createdAt?: string; updatedAt?: string;
}

interface DepartmentsQueryData { departments: DepartmentNode[]; }

export const EMPTY_DEPT_FORM = { name: "", code: "", status: "active" as const, description: "", manager: "", employees: 0 };

export function useDepartments(productionLineId?: string | null) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, loading, error, refetch } = useQuery<DepartmentsQueryData>(DEPARTMENTS_QUERY, {
    variables: {
      productionLineId: productionLineId || undefined,
      search: search || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [createMutation] = useMutation<{ createDepartment: { ok: boolean; department?: DepartmentNode; errors?: { field?: string | null; message: string }[] } }>(CREATE_DEPARTMENT_MUTATION);
  const [updateMutation] = useMutation<{ updateDepartment: { ok: boolean; department?: DepartmentNode; errors?: { field?: string | null; message: string }[] } }>(UPDATE_DEPARTMENT_MUTATION);
  const [deleteMutation] = useMutation<{ deleteDepartment: { success: boolean; inUse: boolean; message: string } }>(DELETE_DEPARTMENT_MUTATION);
  const [assignLinesMutation] = useMutation<{ assignDepartmentToProductionLines: { ok: boolean; department?: DepartmentNode; errors?: { field?: string | null; message: string }[] } }>(ASSIGN_DEPARTMENT_TO_LINES_MUTATION);

  const departments: DepartmentNode[] = (data?.departments ?? []).map((d) => ({
    ...d,
    status: (d.status || "active").toLowerCase() as DepartmentNode["status"],
    productionLines: d.productionLines ?? [],
    productionLineCount: d.productionLineCount ?? d.productionLines?.length ?? 0,
    resourceGroups: d.resourceGroups ?? [],
    resourceGroupCount: d.resourceGroupCount ?? d.groupCount ?? d.resourceGroups?.length ?? 0,
    resourceCount: d.resourceCount ?? 0,
    employeeCount: d.employeeCount ?? d.employees ?? 0,
  }));

  const saveDepartment = useCallback(
    async (form: Record<string, any>, editingId?: string | null) => {
      const input = {
        name: form.name,
        code: form.code?.toUpperCase(),
        status: (form.status || "active").toUpperCase(),
        statusId: form.statusId || null,
        description: form.description || "",
        manager: form.manager || "",
        supervisor: form.supervisor || "",
      };
      try {
        if (editingId) {
          const { data: res } = await updateMutation({ variables: { id: editingId, input } });
          if (!res?.updateDepartment?.ok || res?.updateDepartment?.errors?.length) {
            const errs: Record<string, string> = {};
            res?.updateDepartment?.errors?.forEach((e: { field?: string | null; message: string }) => {
              errs[e.field || "_form"] = e.message;
            });
            return { ok: false, errors: errs };
          }
          await refetch();
          return { ok: true, department: res.updateDepartment.department };
        } else {
          const { data: res } = await createMutation({ variables: { input } });
          if (!res?.createDepartment?.ok || res?.createDepartment?.errors?.length) {
            const errs: Record<string, string> = {};
            res?.createDepartment?.errors?.forEach((e: { field?: string | null; message: string }) => {
              errs[e.field || "_form"] = e.message;
            });
            return { ok: false, errors: errs };
          }
          await refetch();
          return { ok: true, department: res.createDepartment.department };
        }
      } catch {
        return { ok: false, errors: { _form: "Failed to save department." } };
      }
    },
    [createMutation, updateMutation, refetch]
  );

  const assignDepartmentToLines = useCallback(
    async (departmentId: string, productionLineIds: string[]) => {
      try {
        const { data: res } = await assignLinesMutation({ variables: { input: { departmentId, productionLineIds } } });
        if (!res?.assignDepartmentToProductionLines?.ok || res?.assignDepartmentToProductionLines?.errors?.length) {
          const errs: Record<string, string> = {};
          res?.assignDepartmentToProductionLines?.errors?.forEach((e: { field?: string | null; message: string }) => {
            errs[e.field || "_form"] = e.message;
          });
          return { ok: false, errors: errs };
        }
        await refetch();
        return { ok: true, department: res.assignDepartmentToProductionLines.department };
      } catch {
        return { ok: false, errors: { productionLineIds: "Failed to update production line links." } };
      }
    },
    [assignLinesMutation, refetch]
  );

  const deleteDepartment = useCallback(
    async (id: string) => {
      try {
        const { data: res } = await deleteMutation({ variables: { id } });
        if (res?.deleteDepartment) {
          if (res.deleteDepartment.success) {
            await refetch();
            return { success: true };
          } else {
            return { success: false, message: res.deleteDepartment.message };
          }
        }
      } catch {
        return { success: false, message: "Failed to delete department." };
      }
    },
    [deleteMutation, refetch]
  );

  return {
    departments,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    saveDepartment,
    assignDepartmentToLines,
    deleteDepartment,
    refetch,
    EMPTY_DEPT_FORM,
  };
}
