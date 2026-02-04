import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@shared/routes";

type User = {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  crm?: string;
  institution?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
};

type LoginResponse = {
  user: User;
  token: string;
};

// Store token in localStorage
const TOKEN_KEY = "hematoinfecto_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Auth headers helper
export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const token = getToken();
      if (!token) return null;

      const res = await fetch(authApi.me.path, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        removeToken();
        return null;
      }

      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, Error, { username: string; password: string }>({
    mutationFn: async (credentials) => {
      const res = await fetch(authApi.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Falha no login");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData(["currentUser"], data.user);
    },
  });
}

export function useRegister() {
  return useMutation<User, Error, {
    username: string;
    email: string;
    password: string;
    name: string;
    crm?: string;
    role?: string;
  }>({
    mutationFn: async (data) => {
      const res = await fetch(authApi.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Falha no registro");
      }

      return res.json();
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      await fetch(authApi.logout.path, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    },
    onSuccess: () => {
      removeToken();
      queryClient.setQueryData(["currentUser"], null);
      queryClient.clear();
    },
  });
}
