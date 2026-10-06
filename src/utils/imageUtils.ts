import { getConfig } from "../config";

/**
 * Extracts the backend origin (protocol + host + port) from runtime config.
 * E.g., "http://192.168.1.34:8068/api/v1" -> "http://192.168.1.34:8068"
 */
const getBackendOrigin = (): string => {
  try {
    const { apiBaseUrl } = getConfig();
    if (apiBaseUrl && (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://"))) {
      const url = new URL(apiBaseUrl);
      return url.origin;
    }
  } catch {
    // fallback if invalid URL
  }
  return "";
};

/**
 * Resolves an image path from the backend into a fully qualified browser URL.
 * Handles:
 * - Full URLs (http://, https://, blob:, data:)
 * - Windows backslashes (normalized to forward slashes)
 * - Dummy Swagger "string" placeholders (returns empty string)
 * - Relative backend paths (prepends backend origin in production/IIS)
 */
export const resolveImageUrl = (path?: string | null): string => {
  if (!path || typeof path !== "string") {
    return "";
  }

  const trimmed = path.trim();
  if (
    trimmed === "" ||
    trimmed.toLowerCase() === "string" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined" ||
    trimmed.toLowerCase().endsWith("/string")
  ) {
    return "";
  }

  // Normalize backslashes to forward slashes
  const normalized = trimmed.replace(/\\/g, "/");

  // If already a blob or data URI (e.g. freshly selected file), return directly
  if (normalized.startsWith("blob:") || normalized.startsWith("data:")) {
    return normalized;
  }

  const origin = getBackendOrigin();

  // Ensure clean path starting with slash for matching
  const cleanWithSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;

  // Extract relative path if it contains /images/ or /uploads/
  const imgIndex = cleanWithSlash.indexOf("/images/");
  if (imgIndex !== -1) {
    const rel = cleanWithSlash.substring(imgIndex);
    return origin ? `${origin}${rel}` : rel;
  }

  const uploadIndex = cleanWithSlash.indexOf("/uploads/");
  if (uploadIndex !== -1) {
    const rel = cleanWithSlash.substring(uploadIndex);
    return origin ? `${origin}${rel}` : rel;
  }

  // If other external absolute URL
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  return origin ? `${origin}${cleanWithSlash}` : cleanWithSlash;
};



