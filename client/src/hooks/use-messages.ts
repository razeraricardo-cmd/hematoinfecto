import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { PatientMessage } from "@shared/schema";

export function useMessages(patientId: number) {
  return useQuery({
    queryKey: ['/api/patients', patientId, 'messages'],
    queryFn: async () => {
      const url = buildUrl(api.messages.list.path, { patientId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return await res.json() as PatientMessage[];
    },
    enabled: !!patientId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ patientId, content }: { patientId: number; content: string }) => {
      const url = buildUrl(api.messages.send.path, { patientId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Failed to send message");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/patients', variables.patientId, 'messages'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [api.evolutions.list.path, variables.patientId] 
      });
    },
  });
}
