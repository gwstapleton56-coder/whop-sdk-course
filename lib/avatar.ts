export function normalizeWhopAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;

  // Whop sometimes returns a proxied default avatar URL like:
  // https://img-v2-prod.whop.com/.../plain/https://content.whop.com/default_avatars/...
  // Strip the proxy so the browser fetches the original default avatar directly.
  const plainMarker = "/plain/";
  const markerIndex = avatarUrl.indexOf(plainMarker);

  if (markerIndex >= 0) {
    const candidate = avatarUrl.slice(markerIndex + plainMarker.length);
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return candidate;
    }
  }

  return avatarUrl;
}

