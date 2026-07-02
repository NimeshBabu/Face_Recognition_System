import axios from "axios";
import { clearAuthSession, loadAuthSession } from "./authStorage";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const normalizePrefix = (rawPrefix: string): string => {
  const trimmed = rawPrefix.trim();

  if (!trimmed) {
    return "";
  }

  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
};

export const API_PREFIX = normalizePrefix(import.meta.env.VITE_API_PREFIX ?? "");

const withPrefix = (path: string): string => `${API_BASE_URL}${API_PREFIX}${path}`;

export const API_PATHS = {
  user: withPrefix("/user"),
  police: withPrefix("/police"),
  admin: withPrefix("/admin"),
  match: withPrefix("/match"),
} as const;

export const api = axios.create({
  timeout: 20000,
});

// ─── Request: attach JWT token ────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const session = loadAuthSession();

  if (session?.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${session.token}`;
  }

  return config;
});

// ─── Response: handle auth errors globally ───────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Only 401 Unauthorized means the token itself is invalid/expired.
    // 403 Forbidden means the token is valid but the action isn't permitted —
    // that should surface as an error message, not force a logout.
    if (status === 401 ) {
      const session = loadAuthSession();
      const role = session?.role;

      // Clear the stale session
      clearAuthSession();

      // Redirect to the matching login page
      const loginPath =
        role === "police"
          ? "/police/auth"
          : role === "admin"
            ? "/admin/auth"
            : "/user/auth";

      // Use replace so the dashboard isn't in browser history
      window.location.replace(loginPath);

      // Return a never-resolving promise so callers don't process the error
      return new Promise(() => {});
    }

    return Promise.reject(error);
  },
);
