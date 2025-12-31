export function isOwnerUserId(userId: string) {
  const raw = process.env.OWNER_WHOPO_IDS || "";
  const allowed = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return allowed.includes(userId);
}



