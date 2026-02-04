import { useMutation } from "@tanstack/react-query";
import { searchApi } from "@shared/routes";
import type { Patient } from "@shared/schema";

export type AdvancedSearchParams = {
  query?: string;
  colonization?: string[];
  unit?: string[];
  hasActiveATB?: boolean;
  hasPendingCultures?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export function useAdvancedSearch() {
  return useMutation<Patient[], Error, AdvancedSearchParams>({
    mutationFn: async (params) => {
      const res = await fetch(searchApi.advanced.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Search failed");
      }

      return res.json();
    },
  });
}
