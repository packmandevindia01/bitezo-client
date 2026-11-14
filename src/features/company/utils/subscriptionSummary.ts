import type { SubscriptionData } from "../types";

export type SubscriptionState = "active" | "expiring" | "expired";

export interface SubscriptionSummary {
  state: SubscriptionState;
  startLabel: string; // "16 Oct 2026", or "" when the backend sends no real date
  expiryLabel: string;
  totalDays: number; // start → expiry, 0 when either date is missing
  usedDays: number;
  daysLeft: number;
  percentLeft: number; // 0..100
}

/** A subscription with this many days left (or fewer) shows as "Expiring soon" (same 7 days as the top banner). */
export const EXPIRING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (raw?: string | null): Date | null => {
  if (!raw || raw.startsWith("0001")) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) || d.getFullYear() <= 2000 ? null : d;
};

export const formatSubscriptionDate = (raw?: string | null): string => {
  const d = parseDate(raw);
  return d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
};

/** Help → Subscription: turns /company/subscription-data into what the page shows. */
export const summarizeSubscription = (data: SubscriptionData): SubscriptionSummary => {
  const start = parseDate(data.startAt);
  const expiry = parseDate(data.expiresAt);
  const isExpired = Boolean(data.isExpired);
  const daysLeft = isExpired ? 0 : Math.max(0, Number(data.daysLeft) || 0);
  const totalDays = start && expiry && expiry > start ? Math.round((expiry.getTime() - start.getTime()) / DAY_MS) : 0;
  const usedDays = totalDays ? Math.min(totalDays, Math.max(0, totalDays - daysLeft)) : 0;
  const percentLeft = totalDays ? Math.min(100, Math.max(0, (daysLeft / totalDays) * 100)) : isExpired ? 0 : 100;
  // daysLeft 0 with no expiry date is how the backend sends "no end date" (the banner treats it as active too).
  const expiringSoon = daysLeft <= EXPIRING_DAYS && (daysLeft > 0 || expiry !== null);
  const state: SubscriptionState = isExpired ? "expired" : expiringSoon ? "expiring" : "active";
  return {
    state,
    startLabel: formatSubscriptionDate(data.startAt),
    expiryLabel: formatSubscriptionDate(data.expiresAt),
    totalDays,
    usedDays,
    daysLeft,
    percentLeft,
  };
};
