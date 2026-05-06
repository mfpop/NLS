import { useQuery, useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { PROFILE_QUERY, UPDATE_PROFILE_MUTATION } from "@/graphql/profileQueries";
import type { ProfileQueryData, ProfileMutationResult, ProfileInput } from "@/types/profile";

export function useProfile() {
  const { data, loading, error, refetch } = useQuery<ProfileQueryData>(PROFILE_QUERY, {
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  const [updateMutation, { loading: saving }] = useMutation<ProfileMutationResult>(UPDATE_PROFILE_MUTATION);

  const profile = data?.profile ?? null;

  const saveProfile = useCallback(async (input: ProfileInput): Promise<{ ok: boolean; errors?: Record<string, string> }> => {
    try {
      const { data: result } = await updateMutation({ variables: { input } });
      if (result?.updateProfile?.errors?.length) {
        const fieldErrors: Record<string, string> = {};
        result.updateProfile.errors.forEach((e) => { fieldErrors[e.field] = e.message; });
        return { ok: false, errors: fieldErrors };
      }
      await refetch();
      return { ok: true };
    } catch (err) {
      console.error("[Profile Save Error]", err);
      const message = err instanceof Error ? err.message : "Failed to save profile. Please try again.";
      return { ok: false, errors: { _form: message } };
    }
  }, [updateMutation, refetch]);

  return { profile, loading, error, saving, saveProfile, refetch };
}
