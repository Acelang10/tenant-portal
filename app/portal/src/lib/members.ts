import "server-only";
import { redirect } from "next/navigation";
import { apiFetch, type TenantRole } from "./api";
import { getSessionToken } from "./session";

// TODO: add the remaining fields the members page needs
export type Member = {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
};

export async function getMembers(tenantId: string): Promise<Member[]> {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }
  return fetchMembers(token, tenantId);
}

// Cached per token and tenant so switching tenants stays instant (see AGENTS.md)
async function fetchMembers(token: string, tenantId: string): Promise<Member[]> {
  "use cache";
  const response = await apiFetch("/members", { token, tenantId });
  if (!response.ok) {
    throw new Error(`Failed to load members (${response.status})`);
  }
  return response.json();
}
