import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertEvolution } from "@shared/schema";

export function useEvolutions(patientId: number) {
  return useQuery({
    queryKey: [api.evolutions.list.path, patientId],
    queryFn: async () => {
      const url = buildUrl(api.evolutions.list.path, { patientId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch evolutions");
      return api.evolutions.list.responses[200].parse(await res.json());
    },
    enabled: !!patientId,
  });
}

export function useCreateEvolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertEvolution & { rawInput?: string }) => {
      const res = await fetch(api.evolutions.create.path, {
        method: api.evolutions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.evolutions.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create evolution");
      }
      return api.evolutions.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: [api.evolutions.list.path, variables.patientId] 
      });
    },
  });
}

export function useGenerateEvolution() {
  return useMutation({
    mutationFn: async (data: { patientId?: number; rawInput: string; previousEvolutionId?: number; includeImpression?: boolean; includeSuggestions?: boolean }) => {
      const res = await fetch(api.evolutions.generate.path, {
        method: api.evolutions.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.evolutions.generate.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to generate evolution");
      }
      return api.evolutions.generate.responses[200].parse(await res.json());
    },
  });
}

export function useExportEvolution() {
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.evolutions.export.path, { id });
      const res = await fetch(url, { 
        method: api.evolutions.export.method,
        credentials: "include" 
      });
      
      if (!res.ok) throw new Error("Failed to export evolution");
      return await res.blob();
    },
  });
}
