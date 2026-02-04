import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi, buildUrl } from "@shared/routes";
import type { Alert, InsertAlert } from "@shared/schema";
import { getAuthHeaders } from "./use-auth";

export function useAlerts() {
  return useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch(alertsApi.list.path);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
  });
}

export function useUnreadAlerts() {
  return useQuery<Alert[]>({
    queryKey: ["alerts", "unread"],
    queryFn: async () => {
      const res = await fetch(alertsApi.unread.path);
      if (!res.ok) throw new Error("Failed to fetch unread alerts");
      return res.json();
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
}

export function usePatientAlerts(patientId: number) {
  return useQuery<Alert[]>({
    queryKey: ["alerts", "patient", patientId],
    queryFn: async () => {
      const res = await fetch(buildUrl(alertsApi.byPatient.path, { patientId }));
      if (!res.ok) throw new Error("Failed to fetch patient alerts");
      return res.json();
    },
    enabled: !!patientId,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation<Alert, Error, InsertAlert>({
    mutationFn: async (data) => {
      const res = await fetch(alertsApi.create.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create alert");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation<Alert, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(buildUrl(alertsApi.markRead.path, { id }), {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to mark alert as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation<Alert, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(buildUrl(alertsApi.resolve.path, { id }), {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to resolve alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
