"use client";

import { create } from "zustand";

import type { User } from "@/types/api";

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setTokens: (access, refresh) => {
    window.localStorage.setItem("hsk_access_token", access);
    window.localStorage.setItem("hsk_refresh_token", refresh);
  },
  logout: () => {
    window.localStorage.removeItem("hsk_access_token");
    window.localStorage.removeItem("hsk_refresh_token");
    set({ user: null });
  },
  hydrate: () => set({ hydrated: true }),
}));
