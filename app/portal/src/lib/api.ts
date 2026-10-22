import "server-only";
import { redirect } from "next/navigation";
import { getSessionToken } from "./session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type TenantRole = "ADMIN" | "MEMBER";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
};

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  tenants: Tenant[];
};

/**
 * Calls the API as the signed-in user. Pass `tenantId` for tenant-scoped
 * endpoints: it's sent as `x-tenant-id`, which the API uses as the active tenant.
 */
export async function apiFetch(
  path: string,
  { token, tenantId, ...init }: RequestInit & { token: string; tenantId?: string },
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (tenantId) {
    headers.set("x-tenant-id", tenantId);
  }
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

/** The API's error message (Nest puts validation errors in an array). */
export async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    if (message) {
      return message;
    }
  } catch {
    // Not JSON; fall through to the generic message
  }
  return `Request failed (${response.status})`;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    throw new Error(`Failed to load the current user (${response.status})`);
  }
  return response.json();
}
