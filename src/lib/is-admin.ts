export const ADMIN_EMAIL = "aarushgoradia18@gmail.com";

export function isAdmin(email: string | undefined | null): boolean {
  return !!email && email === ADMIN_EMAIL;
}
