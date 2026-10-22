import "server-only";
import { redirect } from "next/navigation";
import { apiFetch, readApiError, type TenantRole } from "./api";
import { getSessionToken } from "./session";

export type AccountStatus = "ACTIVE" | "SUSPENDED";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
  status: AccountStatus;
};

export type MembersResult =
  | { ok: true; members: Member[] }
  | { ok: false; status: number; message: string };

/**
 * Loads the active tenant's members. The API decides whether the user may see
 * them, so a 403 is returned as a result for the page to show, not thrown.
 */
export async function getMembers(tenantId: string): Promise<MembersResult> {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  // Not cached: who may see this list, and the roles in it, can change at any time
  let response: Response;
  try {
    response = await apiFetch("/members", { token, tenantId });
  } catch {
    return { ok: false, status: 0, message: "Can't reach the API. Is it running?" };
  }

  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await readApiError(response),
    };
  }
  return { ok: true, members: await response.json() };
}
