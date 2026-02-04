import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { templatesApi, buildUrl } from "@shared/routes";
import type { Template, InsertTemplate } from "@shared/schema";
import { getAuthHeaders } from "./use-auth";

export function useTemplates() {
  return useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch(templatesApi.list.path);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });
}

export function useTemplate(id: number) {
  return useQuery<Template>({
    queryKey: ["templates", id],
    queryFn: async () => {
      const res = await fetch(buildUrl(templatesApi.get.path, { id }));
      if (!res.ok) throw new Error("Failed to fetch template");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation<Template, Error, InsertTemplate>({
    mutationFn: async (data) => {
      const res = await fetch(templatesApi.create.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create template");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation<Template, Error, { id: number; data: Partial<InsertTemplate> }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(buildUrl(templatesApi.update.path, { id }), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update template");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(buildUrl(templatesApi.delete.path, { id }), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete template");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
