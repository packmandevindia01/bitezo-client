/** The client database always comes from localStorage or onboarding, never from a name written in the code. */
import { describe, it, expect } from "vitest";
import loginForm from "../features/auth/components/LoginForm.tsx?raw";

describe("login form", () => {
  it("has no fallback database name", () => {
    expect(loginForm).not.toContain("app_db");
    expect(loginForm).toContain('localStorage.getItem("tenantId") ?? ""');
  });

  it("never saves an empty database over the stored one", () => {
    expect(loginForm).toContain('if (clientDb) localStorage.setItem("tenantId", clientDb);');
  });
});
