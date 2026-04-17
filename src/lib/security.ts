/**
 * Returns true when the request is same-origin.
 *
 * Browsers always send an `Origin` header on cross-origin POST requests. If
 * the header is absent the request is coming from a server-side context or a
 * same-origin form, which is fine. If it is present we verify the host
 * matches, blocking cross-site requests.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host") ?? "";
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
