// @vitest-environment jsdom
/** Help → Subscription (2026-11-14): GET /company/subscription-data shown as a page; Help lists Subscription before About Us. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { summarizeSubscription } from "../features/company/utils/subscriptionSummary";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));

import SubscriptionPage from "../features/company/pages/SubscriptionPage";
import NavHelpGroup from "../components/layout/sidebar/NavHelpGroup";

const SAMPLE = { startAt: "2026-10-16T00:00:00", isExpired: false, daysLeft: 2, expiresAt: "2026-11-16T00:00:00" };

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <SubscriptionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const text = (id: string) => document.getElementById(id)?.textContent?.replace(/\s+/g, " ").trim();

describe("summarizeSubscription", () => {
  it("the backend sample: 31-day plan, 2 days left, expiring soon", () => {
    const s = summarizeSubscription(SAMPLE);
    expect(s).toMatchObject({ state: "expiring", startLabel: "16 Oct 2026", expiryLabel: "16 Nov 2026", totalDays: 31, usedDays: 29, daysLeft: 2 });
    expect(Math.round(s.percentLeft)).toBe(6);
  });

  it("more than 7 days left is active", () => {
    expect(summarizeSubscription({ ...SAMPLE, daysLeft: 20 }).state).toBe("active");
  });

  it("expired shows 0 days left even if the backend still sends a number", () => {
    expect(summarizeSubscription({ ...SAMPLE, isExpired: true, daysLeft: 3 })).toMatchObject({ state: "expired", daysLeft: 0, usedDays: 31, percentLeft: 0 });
  });

  it("no real dates (0001) and 0 days left is active with no period", () => {
    const s = summarizeSubscription({ startAt: "0001-01-01T00:00:00", isExpired: false, daysLeft: 0, expiresAt: "0001-01-01T00:00:00" });
    expect(s).toMatchObject({ state: "active", startLabel: "", expiryLabel: "", totalDays: 0, percentLeft: 100 });
  });
});

describe("Subscription page", () => {
  beforeEach(() => http.get.mockReset());

  it("loads /company/subscription-data and shows status, dates, period and days left", async () => {
    http.get.mockResolvedValue({ data: { isSuccess: true, data: SAMPLE } });
    renderPage();
    await waitFor(() => expect(text("sub-status")).toBe("Expiring soon"));
    expect(http.get).toHaveBeenCalledWith("/company/subscription-data");
    expect(text("sub-days-left")).toBe("2");
    expect(text("sub-start")).toBe("16 Oct 2026");
    expect(text("sub-expiry")).toBe("16 Nov 2026");
    expect(text("sub-period")).toBe("31 days");
    expect(text("sub-remaining")).toBe("2 days");
    expect(screen.getByText("Valid until 16 Nov 2026")).toBeTruthy();
    expect(screen.getByText(/of 31 days used/)).toBeTruthy();
  });

  it("Refresh sits in the header next to the status and loads the details again", async () => {
    http.get.mockResolvedValue({ data: { isSuccess: true, data: SAMPLE } });
    renderPage();
    await waitFor(() => expect(text("sub-status")).toBe("Expiring soon"));
    const refresh = screen.getByRole("button", { name: /Refresh/ });
    expect(refresh.parentElement?.contains(document.getElementById("sub-status"))).toBe(true);
    http.get.mockResolvedValue({ data: { isSuccess: true, data: { ...SAMPLE, daysLeft: 1 } } });
    fireEvent.click(refresh);
    await waitFor(() => expect(text("sub-days-left")).toBe("1"));
  });

  it("an expired subscription says Expired", async () => {
    http.get.mockResolvedValue({ data: { isSuccess: true, data: { ...SAMPLE, isExpired: true, daysLeft: 0 } } });
    renderPage();
    await waitFor(() => expect(text("sub-status")).toBe("Expired"));
    expect(screen.getByText("Expired on 16 Nov 2026")).toBeTruthy();
  });

  it("a failed call shows an error with Try again, which loads it again", async () => {
    http.get.mockRejectedValue(new Error("403")); // every try fails (the page retries once)
    renderPage();
    expect(await screen.findByText("Could not load the subscription details", {}, { timeout: 4000 })).toBeTruthy();
    http.get.mockResolvedValue({ data: { isSuccess: true, data: SAMPLE } });
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    await waitFor(() => expect(text("sub-status")).toBe("Expiring soon"));
  });
});

describe("Help menu order", () => {
  it("Subscription comes first, then About Us", () => {
    const navigate = vi.fn();
    render(<NavHelpGroup navigate={navigate} onClose={vi.fn()} itemClassName="" />);
    const items = Array.from(document.querySelectorAll("span")).map((s) => s.textContent).filter((t) => t === "Subscription" || t === "About Us");
    expect(items).toEqual(["Subscription", "About Us"]);
    fireEvent.click(screen.getByText("Subscription"));
    expect(navigate).toHaveBeenCalledWith("/dashboard/subscription");
  });
});
