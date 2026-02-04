import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { culturesApi, buildUrl } from "@shared/routes";
import type { Culture, InsertCulture, Patient } from "@shared/schema";
import { getAuthHeaders } from "./use-auth";

type CultureWithPatient = Culture & { patient: Patient };

export function useCultures(patientId: number) {
  return useQuery<Culture[]>({
    queryKey: ["cultures", patientId],
    queryFn: async () => {
      const res = await fetch(buildUrl(culturesApi.list.path, { patientId }));
      if (!res.ok) throw new Error("Failed to fetch cultures");
      return res.json();
    },
    enabled: !!patientId,
  });
}

export function usePendingCultures() {
  return useQuery<CultureWithPatient[]>({
    queryKey: ["cultures", "pending"],
    queryFn: async () => {
      const res = await fetch(culturesApi.pending.path);
      if (!res.ok) throw new Error("Failed to fetch pending cultures");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useCreateCulture() {
  const queryClient = useQueryClient();

  return useMutation<Culture, Error, InsertCulture>({
    mutationFn: async (data) => {
      const res = await fetch(culturesApi.create.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create culture");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cultures"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateCulture() {
  const queryClient = useQueryClient();

  return useMutation<Culture, Error, { id: number; data: Partial<InsertCulture> }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(buildUrl(culturesApi.update.path, { id }), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update culture");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cultures"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateCultureResult() {
  const queryClient = useQueryClient();

  return useMutation<Culture, Error, {
    id: number;
    status: "negative" | "positive" | "contaminated";
    organism?: string;
    antibiogram?: Record<string, string>;
    positivityTime?: string;
  }>({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(buildUrl(culturesApi.updateResult.path, { id }), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update culture result");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cultures"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
