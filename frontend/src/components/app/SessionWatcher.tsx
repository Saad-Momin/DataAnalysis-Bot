"use client";

import { useEffect } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { markSessionExpired } from "./session";

/**
 * While the app shell is mounted, watch API responses. A 401 from any data call
 * (anything except the /auth/* endpoints, where 401 means "wrong password" or
 * "not signed in yet") means the session ended: re-check auth, which lets the
 * guard in the layout redirect to /login with a "session expired" notice.
 */
export default function SessionWatcher() {
  const { refresh } = useAuth();

  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);
      if (res.status === 401) {
        const input = args[0];
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith(API_URL) && !url.slice(API_URL.length).startsWith("/auth/")) {
          markSessionExpired();
          void refresh();
        }
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, [refresh]);

  return null;
}
