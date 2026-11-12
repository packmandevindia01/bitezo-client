/**
 * Menu session hours (Menu Time Settings). Times are saved as "HH:mm:ss". Same start and end = all day (the POS and,
 * per the server's current data, the backend treat 00:00–00:00 that way). An end before the start runs past midnight.
 */
export const DAY_MINUTES = 24 * 60;

/** "HH:mm[:ss]" → minutes since midnight, or null. */
export const toMinutes = (value: string | null | undefined): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/** minutes → "HH:mm:00" (what the API stores). */
export const toApiTime = (minutes: number): string => {
  const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`;
};

/** "HH:mm[:ss]" → "HH:mm" for <input type="time">. */
export const toInputTime = (value: string | null | undefined): string => {
  const m = toMinutes(value);
  return m === null ? "" : toApiTime(m).slice(0, 5);
};

/** "15:00:00" → "3:00 PM". */
export const formatTime12 = (value: string | null | undefined): string => {
  const m = toMinutes(value);
  if (m === null) return "—";
  const h = Math.floor(m / 60);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${suffix}`;
};

export const isAllDay = (start: string | null | undefined, end: string | null | undefined): boolean => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s !== null && s === e;
};

export const crossesMidnight = (start: string | null | undefined, end: string | null | undefined): boolean => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return s !== null && e !== null && e < s;
};

/** Length of the window in minutes (all day = 24 h). */
export const durationMinutes = (start: string | null | undefined, end: string | null | undefined): number => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return 0;
  if (s === e) return DAY_MINUTES;
  return e > s ? e - s : DAY_MINUTES - s + e;
};

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/** The window as pieces of one day [from, to) in minutes; a window over midnight gives two pieces. */
export const daySegments = (start: string | null | undefined, end: string | null | undefined): [number, number][] => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return [];
  if (s === e) return [[0, DAY_MINUTES]];
  return e > s ? [[s, e]] : [[s, DAY_MINUTES], [0, e]];
};

/** "6:00 AM – 11:59 PM", "12:00 PM – 3:00 AM (next day)" or "All day". */
export const formatSessionHours = (start: string | null | undefined, end: string | null | undefined): string => {
  if (toMinutes(start) === null || toMinutes(end) === null) return "—";
  if (isAllDay(start, end)) return "All day";
  return `${formatTime12(start)} – ${formatTime12(end)}${crossesMidnight(start, end) ? " (next day)" : ""}`;
};

/** Whether two windows share any time. */
export const sessionsOverlap = (a: [string, string], b: [string, string]): boolean => {
  const sa = daySegments(a[0], a[1]);
  const sb = daySegments(b[0], b[1]);
  return sa.some(([f1, t1]) => sb.some(([f2, t2]) => f1 < t2 && f2 < t1));
};

/** Common sessions, offered as one-tap presets. */
export const SESSION_PRESETS: { label: string; start: string; end: string }[] = [
  { label: "Breakfast", start: "06:00:00", end: "11:00:00" },
  { label: "Lunch", start: "12:00:00", end: "16:00:00" },
  { label: "Evening", start: "16:00:00", end: "19:00:00" },
  { label: "Dinner", start: "19:00:00", end: "23:00:00" },
];
