import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
