/**
 * Escape text before putting it into an HTML string (print templates use template literals +
 * document.write / innerHTML). Product, customer and address names come from the DB or from
 * cashier input, so a "<" or a script tag must print as text, never run as markup.
 */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
