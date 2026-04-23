import { env } from "~/env";
import { getUser } from "~/lib/supabase/server";

export const ADMIN_EMAIL = env.ADMIN_EMAIL;

export function isAdmin(email: string | undefined | null): boolean {
  return !!email && email === ADMIN_EMAIL;
}

/**
 * Server-only helper. Returns the authenticated user and whether they are an
 * admin in a single call — use this in API routes instead of calling getUser()
 * and isAdmin() separately.
 */
export async function getAuthContext() {
  const user = await getUser();
  return { user, admin: isAdmin(user?.email) };
}
