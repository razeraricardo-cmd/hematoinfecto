import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@shared/routes";
import type { Alert, Patient, Antibiotic } from "@shared/schema";

type DashboardStats = {
  totalPatients: number;
  activePatients: number;
  neutropenicPatients: number;
  colonizedPatients: number;
  pendingCultures: number;
  activeAntibiotics: number;
  atbReviewsToday: number;
  byUnit: Record<string, number>;
  byColonization: Record<string, number>;
  recentAlerts: Alert[];
};

type ATBTimelineEntry = {
  patient: Patient;
  antibiotics: {
    antibiotic: Antibiotic;
    currentDay: number;
    reviewDates: { day: number; date: string; isPast: boolean }[];
  }[];
};

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await fetch(dashboardApi.stats.path);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useATBTimeline() {
  return useQuery<ATBTimelineEntry[]>({
    queryKey: ["dashboard", "atb-timeline"],
    queryFn: async () => {
      const res = await fetch(dashboardApi.atbTimeline.path);
      if (!res.ok) throw new Error("Failed to fetch ATB timeline");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
