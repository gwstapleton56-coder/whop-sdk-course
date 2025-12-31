// lib/access.ts

// Tries a few common shapes, because Whop access payloads can vary by SDK version.
export function getRoleFromAccess(access: any): string | null {
  // Check all possible locations for role
  const role =
    access?.role ??
    access?.access?.role ??
    access?.membership?.role ??
    access?.user?.role ??
    access?.data?.role ??
    access?.accessLevel ??
    access?.access_level ?? // ✅ THIS is your case
    access?.level ??
    access?.membership?.access_level ??
    access?.membership?.accessLevel ??
    null;

  // If still null, log for debugging
  if (!role && access) {
    console.log("[getRoleFromAccess] No role found in access object:", {
      keys: Object.keys(access),
      access: JSON.stringify(access, null, 2),
    });
  }

  return typeof role === "string" ? role : null;
}

export function isCreatorOrAdmin(access: any): boolean {
  // Optional: also require has_access = true
  if (access?.has_access === false) return false;

  const role = (getRoleFromAccess(access) || "").toLowerCase();
  return ["owner", "admin", "creator", "staff", "moderator"].includes(role);
}

// Check if user is specifically the OWNER (not admin/creator)
// In Whop, the person who installs an app to their community gets "admin" role
// So we check for both "owner" and "admin" to identify the community owner
export function isOwner(access: any): boolean {
  if (access?.has_access === false) return false;
  
  const role = (getRoleFromAccess(access) || "").toLowerCase().trim();
  
  // In Whop, when you install an app to your community, you get "admin" role
  // So we treat "admin" as the owner for app installation purposes
  const isOwnerRole = role === "owner" || role === "admin";
  
  // Log for debugging (can remove after confirming)
  if (process.env.NODE_ENV !== "production") {
    console.log("[isOwner] Checking role:", {
      role,
      originalRole: getRoleFromAccess(access),
      isOwner: isOwnerRole,
    });
  }
  
  return isOwnerRole;
}
