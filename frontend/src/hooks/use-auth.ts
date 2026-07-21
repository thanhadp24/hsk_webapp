"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { authApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, setUser, hydrate, logout } = useAuthStore();
  const hasToken =
    typeof window !== "undefined" && Boolean(window.localStorage.getItem("hsk_access_token"));

  const query = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: hasToken,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
    hydrate();
  }, [hydrate, query.data, setUser]);

  useEffect(() => {
    if (query.isError) {
      logout();
      hydrate();
    }
  }, [hydrate, logout, query.isError]);

  return { user, isLoading: query.isLoading && hasToken };
}
