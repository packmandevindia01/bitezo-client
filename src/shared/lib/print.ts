/**
 * Print an HTML fragment without touching the running app.
 *
 * The old report pattern replaced `document.body.innerHTML`, printed, then reloaded the whole app
 * (React lost its DOM). This renders the fragment in a hidden iframe that carries a copy of the
 * page's stylesheets (Tailwind etc.), prints it there, and removes the iframe afterwards.
 */
export const printHtmlInIframe = (html: string, title = document.title): void => {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");
  const safeTitle = title.replace(/[<>&]/g, "");

  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><base href="${document.baseURI}">${styles}</head><body>${html}</body></html>`,
  );
  doc.close();

  let printed = false;
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };

  // Wait for linked stylesheets / images; fall back after a short delay.
  if (doc.readyState === "complete") {
    setTimeout(doPrint, 250);
  } else {
    win.addEventListener("load", () => setTimeout(doPrint, 100), { once: true });
    setTimeout(doPrint, 1500);
  }
};
