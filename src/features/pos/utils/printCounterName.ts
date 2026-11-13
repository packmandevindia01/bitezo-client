/**
 * The counter printed on KOT / guest / settle receipts. Every print used to send the fixed text "Main".
 * - A saved order: the counter that made it, as the server returns it (`counterName`, e.g. "Counter1").
 * - Otherwise (new order / settle on this device): this device's counter, saved at system registration
 *   (localStorage "systemCounterName").
 * "" when neither is known (the receipt then shows an empty Counter value rather than an invented one).
 */
export const printCounterName = (master?: Record<string, any> | null): string => {
  const saved = master?.counterName ?? master?.CounterName ?? master?.counter ?? "";
  if (typeof saved === "string" && saved.trim()) return saved.trim();
  try {
    return (localStorage.getItem("systemCounterName") || localStorage.getItem("counterName") || "").trim();
  } catch {
    return "";
  }
};
