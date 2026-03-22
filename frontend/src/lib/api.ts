import axios from "axios";
import { loadAuthSession } from "./authStorage";

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

api.interceptors.request.use((config) => {
  const session = loadAuthSession();

  if (session?.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${session.token}`;
  }

  return config;
});
