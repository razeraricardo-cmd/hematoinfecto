import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { antibioticsApi, buildUrl } from "@shared/routes";
import type { Antibiotic, InsertAntibiotic, Patient } from "@shared/schema";
import { getAuthHeaders } from "./use-auth";

type ActiveATBEntry = {
  antibiotic: Antibiotic;
  patient: Patient;
  currentDay: number;
};

export function useAntibiotics(patientId: number) {
  return useQuery<Antibiotic[]>({
    queryKey: ["antibiotics", patientId],
    queryFn: async () => {
      const res = await fetch(buildUrl(antibioticsApi.list.path, { patientId }));
      if (!res.ok) throw new Error("Failed to fetch antibiotics");
      return res.json();
    },
    enabled: !!patientId,
  });
}

export function useActiveAntibiotics() {
  return useQuery<ActiveATBEntry[]>({
    queryKey: ["antibiotics", "active"],
    queryFn: async () => {
      const res = await fetch(antibioticsApi.active.path);
      if (!res.ok) throw new Error("Failed to fetch active antibiotics");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useCreateAntibiotic() {
  const queryClient = useQueryClient();

  return useMutation<Antibiotic, Error, InsertAntibiotic>({
    mutationFn: async (data) => {
      const res = await fetch(antibioticsApi.create.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create antibiotic");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["antibiotics"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateAntibiotic() {
  const queryClient = useQueryClient();

  return useMutation<Antibiotic, Error, { id: number; data: Partial<InsertAntibiotic> }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(buildUrl(antibioticsApi.update.path, { id }), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update antibiotic");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["antibiotics"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useStopAntibiotic() {
  const queryClient = useQueryClient();

  return useMutation<Antibiotic, Error, { id: number; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      const res = await fetch(buildUrl(antibioticsApi.stop.path, { id }), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to stop antibiotic");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["antibiotics"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// Helper to calculate ATB day
export function calculateATBDay(startDate: Date | string): number {
  const now = new Date();
  const start = new Date(startDate);
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
