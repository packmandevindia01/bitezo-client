/**
 * The API can answer HTTP 200 with { isSuccess: false } (e.g. validation failed). Treated as data,
 * that reads as an empty report: "No records found" instead of the real error.
 */
export const assertReportSuccess = (body: unknown): void => {
  const b = body as { isSuccess?: boolean; message?: string; errors?: { message?: string }[] } | null | undefined;
  if (b?.isSuccess !== false) return;
  throw new Error(b.errors?.[0]?.message || b.message || "The report could not be loaded");
};
