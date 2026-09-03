export function positiveInteger(value, fallback, maximum = 100) {
  const parsed = Number.parseInt(value, 10);
 
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
 
  return Math.min(parsed, maximum);
}
 
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
 
export function normalizeCreatorProfile(input = {}) {
  const specialties = Array.isArray(input.specialties)
    ? input.specialties
    : String(input.specialties || "").split(",");
 
  return {
    bio: String(input.bio || "").trim().slice(0, 500),
    website: String(input.website || "").trim().slice(0, 300),
    location: String(input.location || "").trim().slice(0, 120),
    specialties: specialties
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 8),
  };
}
 
export function isHttpsUrl(value) {
  if (!value) {
    return true;
  }
 
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
