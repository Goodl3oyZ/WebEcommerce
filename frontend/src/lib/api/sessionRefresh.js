import axios from "axios";

// Endpoints whose 401 means "wrong credentials", not "session expired".
const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh-token",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

// Pages that need a login; anywhere else an expired session just signs out quietly.
const PROTECTED_PAGES = ["/profile", "/orders", "/admin", "/checkout"];

let pendingRefresh = null;

const isAuthEndpoint = (url = "") => AUTH_ENDPOINTS.some((path) => url.includes(path));

/** One refresh at a time, shared by concurrent 401s (the server rotates refresh tokens). */
export const refreshSession = (baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api") => {
  pendingRefresh ??= axios
    .post(`${baseURL}/auth/refresh-token`, {}, { withCredentials: true })
    .finally(() => {
      pendingRefresh = null;
    });
  return pendingRefresh;
};

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

/** Forget the signed-in user everywhere (AuthContext listens) and leave pages that need a login. */
export function handleSessionExpired() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("user");
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  const { pathname, search } = window.location;
  if (PROTECTED_PAGES.some((page) => pathname.startsWith(page))) {
    window.location.href = `/auth/login?expired=1&redirect=${encodeURIComponent(pathname + search)}`;
  }
}

/**
 * On a 401 from a normal API call: refresh the session once and retry the
 * request. If the refresh fails the user is signed out locally.
 * Returns the retried response, or null when the error should propagate.
 */
export async function retryWithRefresh(instance, error) {
  const request = error.config;
  if (error.response?.status !== 401 || !request || request._retry || isAuthEndpoint(request.url)) {
    return null;
  }
  request._retry = true;
  try {
    await refreshSession(instance.defaults.baseURL);
  } catch {
    handleSessionExpired();
    return null;
  }
  return instance(request);
}
