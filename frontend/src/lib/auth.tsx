"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  /** true until the first /auth/me check finishes */
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** re-check the session (e.g. after a 401 from another call) */
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch (e) {
      // 401 = signed out; any other error (backend down) is treated as signed out too, without crashing the page
      if (!(e instanceof ApiError)) console.error(e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refresh,
      setUser,
      login: async (email, password) => {
        const u = await api.login(email, password);
        setUser(u);
        return u;
      },
      signup: async (name, email, password) => {
        const u = await api.signup(name, email, password);
        setUser(u);
        return u;
      },
      logout: async () => {
        try {
          await api.logout();
        } finally {
          setUser(null);
        }
      },
    }),
    [user, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
