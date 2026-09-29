/**
 * Resolves an image path from the backend into a fully qualified browser URL.
 * Handles:
 * - Full URLs (http://, https://, blob:, data:)
 * - Windows backslashes (normalized to forward slashes)
 * - Dummy Swagger "string" placeholders (returns empty string)
 * - Relative backend paths (using Vite proxy or apiOrigin)
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

  // Extract relative path if it contains /images/ or /uploads/ so it routes through the proxy
  const imgIndex = normalized.indexOf("/images/");
  if (imgIndex !== -1) {
    return normalized.substring(imgIndex);
  }
  const uploadIndex = normalized.indexOf("/uploads/");
  if (uploadIndex !== -1) {
    return normalized.substring(uploadIndex);
  }

  // If other external absolute URL
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};



