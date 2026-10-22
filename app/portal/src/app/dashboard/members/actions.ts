"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, readApiError, type TenantRole } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

export type UpdateRoleResult = { ok: true } | { ok: false; error: string };

// The API validates the role, the tenant membership and the admin check
export async function updateMemberRole(
  tenantId: string,
  memberId: string,
  role: TenantRole,
): Promise<UpdateRoleResult> {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  let response: Response;
  try {
    response = await apiFetch(`/members/${encodeURIComponent(memberId)}`, {
      method: "PATCH",
      token,
      tenantId,
      body: JSON.stringify({ role }),
    });
  } catch {
    return { ok: false, error: "Can't reach the API. Please try again." };
  }

  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    return { ok: false, error: await readApiError(response) };
  }

  refresh();
  return { ok: true };
}
