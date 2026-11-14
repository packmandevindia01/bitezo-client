/**
 * Phase 2b — the HTTP client gets its token refresher from outside (setTokenRefresher).
 * A 401 must call the refresher once and retry the request with the new token.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import http, { setTokenRefresher } from "@shared/api/http";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

type FakeWindow = { dispatchEvent: () => boolean; location: { pathname: string; replace: () => void } };
const unauthorized = (config: InternalAxiosRequestConfig) =>
  Object.assign(new Error("Unauthorized"), { config, response: { status: 401, data: {}, headers: {}, config } });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("systemType", "pos");
  localStorage.setItem("accessToken", "old-token");
  localStorage.setItem("refreshToken", "refresh-1");
  localStorage.setItem("userId", "1");
  const g = globalThis as unknown as { window?: FakeWindow };
  g.window = { dispatchEvent: () => true, location: { pathname: "/pos", replace: vi.fn() } };
});

describe("token refresh through the registered refresher", () => {
  it("401 → refresher(old, refresh, pos) → retried with the new token, tokens stored", async () => {
    const refresher = vi.fn(async () => ({ accessToken: "new-token", refreshToken: "refresh-2" }));
    setTokenRefresher(refresher);
    const seenAuth: string[] = [];
    const adapter: AxiosAdapter = async (config) => {
      const auth = String(config.headers?.get?.("Authorization") ?? config.headers?.Authorization ?? "");
      seenAuth.push(auth);
      if (auth === "Bearer old-token") throw unauthorized(config);
      return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
    };
    const res = await http.get("/orders/test", { adapter });
    expect(res.data).toEqual({ ok: true });
    expect(refresher).toHaveBeenCalledWith("old-token", "refresh-1", false);
    expect(seenAuth).toEqual(["Bearer old-token", "Bearer new-token"]);
    expect(localStorage.getItem("accessToken")).toBe("new-token");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-2");
  });

  it("no refresher registered → clean logout (tokens cleared), no crash", async () => {
    setTokenRefresher(null);
    const adapter: AxiosAdapter = async (config) => { throw unauthorized(config); };
    await expect(http.get("/orders/test", { adapter })).rejects.toBeTruthy();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
});

// 2026-11-14: /company/subscription-data went out without the Bearer token (all /company/* were treated as onboarding),
// got 401 and logged the Back Office user out when opening Help → Subscription.
describe("company subscription calls carry the login token", () => {
  const seen = async (url: string) => {
    let auth = "";
    const adapter: AxiosAdapter = async (config) => {
      auth = String(config.headers?.get?.("Authorization") ?? config.headers?.Authorization ?? "");
      return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
    };
    await http.get(url, { adapter });
    return auth;
  };

  it("subscription-data and subscription-status send Bearer; onboarding masterload does not", async () => {
    expect(await seen("/company/subscription-data")).toBe("Bearer old-token");
    expect(await seen("/company/subscription-status")).toBe("Bearer old-token");
    expect(await seen("/company/masterload")).toBe("");
  });
});
