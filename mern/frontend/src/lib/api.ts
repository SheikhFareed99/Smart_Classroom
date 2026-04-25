export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";
const CSRF_TOKEN_ENDPOINT = "/auth/csrf-token";

let csrfTokenCache: string | null = null;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function getCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;

  const response = await fetch(CSRF_TOKEN_ENDPOINT, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) 
  {
    throw new Error("Failed to retrieve CSRF token");
  }

  const data = (await response.json()) as { csrfToken?: string };
  if (!data.csrfToken) {
    throw new Error("Missing CSRF token in response");
  }

  csrfTokenCache = data.csrfToken;
  return csrfTokenCache;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const isSafeMethod = SAFE_METHODS.has(method);
  const requestUrl = typeof input === "string" ? input : input.toString();
  const isCsrfTokenRequest = requestUrl.includes(CSRF_TOKEN_ENDPOINT);

  const headers = new Headers(init.headers || {});

  if (!isSafeMethod && !isCsrfTokenRequest) {
    const csrfToken = await getCsrfToken();
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });

  if (response.status === 403 && !isSafeMethod) {
    csrfTokenCache = null;
  }

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
  }

  return response;
}

export function clearCsrfTokenCache() {
  csrfTokenCache = null;
}
