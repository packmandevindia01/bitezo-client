import { useQuery } from "@tanstack/react-query";
import { fetchSubscriptionStatus } from "../services/companyApi";
import type { SubscriptionStatusData } from "../types";

export interface SubscriptionStatusInfo {
  data: SubscriptionStatusData | null;
  isLoading: boolean;
  isError: boolean;
  isExpired: boolean;
  daysLeft: number;
  expiresAt: string;
  formattedExpiresAt: string;
  statusMessage: string;
  shortMessage: string;
  badgeLabel: string;
  statusVariant: "danger" | "warning" | "info" | "success";
  shouldShowBanner: boolean;
  refetch: () => void;
}

export const useSubscriptionStatus = (): SubscriptionStatusInfo => {
  const hasToken = Boolean(
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("backoffice_accessToken") ||
    localStorage.getItem("backoffice_accessToken")
  );

  const { data, isLoading, isError, refetch } = useQuery<SubscriptionStatusData | null>({
    queryKey: ["companySubscriptionStatus"],
    queryFn: fetchSubscriptionStatus,
    enabled: hasToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });

  const isExpired = Boolean(data?.isExpired);
  const daysLeft = typeof data?.daysLeft === "number" ? data.daysLeft : 0;
  const expiresAt = data?.expiresAt || "";

  const isValidExpiryDate = Boolean(
    expiresAt &&
    !expiresAt.startsWith("0001") &&
    !isNaN(new Date(expiresAt).getTime()) &&
    new Date(expiresAt).getFullYear() > 2000
  );

  const formattedExpiresAt = isValidExpiryDate
    ? new Date(expiresAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  let statusVariant: "danger" | "warning" | "info" | "success" = "success";
  let statusMessage = "Subscription Active";
  let shortMessage = "Active";
  let badgeLabel = "Active";
  let shouldShowBanner = false;

  if (isExpired) {
    statusVariant = "danger";
    statusMessage = formattedExpiresAt
      ? `Subscription expired on ${formattedExpiresAt}. Please renew immediately.`
      : "Your subscription has expired. Please renew immediately to avoid service interruption.";
    shortMessage = "Expired";
    badgeLabel = "Expired";
    shouldShowBanner = true;
  } else if (daysLeft > 0 && daysLeft <= 7) {
    statusVariant = "warning";
    statusMessage = `Subscription expiring in ${daysLeft} day${daysLeft === 1 ? "" : "s"}${
      formattedExpiresAt ? ` (${formattedExpiresAt})` : ""
    }. Please renew soon.`;
    shortMessage = `${daysLeft}d left`;
    badgeLabel = `${daysLeft}d left`;
    shouldShowBanner = true;
  } else if (daysLeft > 7 && daysLeft <= 15) {
    statusVariant = "warning";
    statusMessage = `Subscription expiring in ${daysLeft} days${
      formattedExpiresAt ? ` (${formattedExpiresAt})` : ""
    }.`;
    shortMessage = `${daysLeft}d left`;
    badgeLabel = `${daysLeft}d left`;
    shouldShowBanner = true;
  } else if (daysLeft > 15 && daysLeft <= 30) {
    statusVariant = "info";
    statusMessage = `Subscription active: ${daysLeft} days remaining${
      formattedExpiresAt ? ` (${formattedExpiresAt})` : ""
    }.`;
    shortMessage = `${daysLeft}d left`;
    badgeLabel = `${daysLeft}d left`;
    shouldShowBanner = false;
  } else if (daysLeft > 30) {
    statusVariant = "success";
    statusMessage = `Subscription active: ${daysLeft} days remaining${
      formattedExpiresAt ? ` (until ${formattedExpiresAt})` : ""
    }.`;
    shortMessage = `${daysLeft}d left`;
    badgeLabel = "Active";
    shouldShowBanner = false;
  } else if (isValidExpiryDate) {
    statusVariant = "success";
    statusMessage = `Subscription active until ${formattedExpiresAt}.`;
    shortMessage = formattedExpiresAt;
    badgeLabel = "Active";
    shouldShowBanner = false;
  } else {
    // Default active (e.g. daysLeft: 0, expiresAt: 0001-01-01)
    statusVariant = "success";
    statusMessage = "Subscription Active";
    shortMessage = "Active";
    badgeLabel = "Active";
    shouldShowBanner = false;
  }

  return {
    data: data ?? null,
    isLoading,
    isError,
    isExpired,
    daysLeft,
    expiresAt,
    formattedExpiresAt,
    statusMessage,
    shortMessage,
    badgeLabel,
    statusVariant,
    shouldShowBanner,
    refetch,
  };
};
