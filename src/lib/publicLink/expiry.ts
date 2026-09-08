export function isLinkExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}
