"use client";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

async function rawRequest(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "include", // refresh cookie
  });
}

/** Attempts a token refresh once on 401, then retries the original request. */
export async function api<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  let res = await rawRequest(path, opts);

  if (res.status === 401 && opts.auth !== false) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await rawRequest(path, opts);
  }

  if (!res.ok) {
    let detail: unknown = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? data;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (typeof err.detail === "string") return err.detail;
    if (err.detail && typeof err.detail === "object" && "message" in err.detail) {
      return String((err.detail as { message: unknown }).message);
    }
    return "Request failed";
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

export function apiErrorCode(err: unknown): string | null {
  if (err instanceof ApiError && err.detail && typeof err.detail === "object" && "code" in err.detail) {
    return String((err.detail as { code: unknown }).code);
  }
  return null;
}
