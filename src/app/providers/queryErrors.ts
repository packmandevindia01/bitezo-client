/**
 * App-wide handling of failed data loads (React Query).
 *
 * Most screens (all reports except Product Transaction Log, most list pages) never read the query
 * `error`, so a failed request (403 no permission, timeout, 500) looked like "No records found".
 * The QueryCache `onError` turns every failed load into a toast. A query can opt out with
 * `meta: { silentError: true }` when it already shows the error itself.
 */
export const QUERY_ERROR_EVENT = "app:query-error";

export const describeQueryError = (err: unknown): string | null => {
  const e = err as {
    name?: string;
    code?: string;
    message?: string;
    response?: { status?: number; data?: { message?: string; title?: string } };
  };
  if (!e) return null;
  if (e.name === "CanceledError" || e.name === "AbortError" || e.code === "ERR_CANCELED") return null;
  const status = e.response?.status;
  // 401 is handled by the axios interceptor (token refresh or redirect to login).
  if (status === 401) return null;
  const detail = e.response?.data?.message || e.response?.data?.title || e.message || "Request failed";
  if (status === 403) return `No permission to load this data (403). ${detail}`;
  return status ? `Could not load data (${status}): ${detail}` : `Could not load data: ${detail}`;
};

let lastMessage = "";
let lastAt = 0;

/** Emit a toast request; identical messages within 4 s are shown once (several queries fail together). */
export const reportQueryError = (err: unknown, meta?: Record<string, unknown>) => {
  if (meta?.silentError) return;
  const message = describeQueryError(err);
  if (!message) return;
  const now = Date.now();
  if (message === lastMessage && now - lastAt < 4000) return;
  lastMessage = message;
  lastAt = now;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUERY_ERROR_EVENT, { detail: message }));
  }
};
