// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NavHelpGroup from "../components/layout/sidebar/NavHelpGroup";
import AboutUsPage from "../features/general/aboutUs/pages/AboutUsPage";

// 2026-11-14: Back Office sidebar Help menu → About Us page with the company details.
describe("Help → About Us", () => {
  it("the Help menu's About Us item opens /dashboard/about-us and closes the sidebar", () => {
    const navigate = vi.fn();
    const onClose = vi.fn();
    render(<NavHelpGroup navigate={navigate} onClose={onClose} itemClassName="" />);
    fireEvent.click(screen.getByText("Help"));
    fireEvent.click(screen.getByText("About Us"));
    expect(navigate).toHaveBeenCalledWith("/dashboard/about-us");
    expect(onClose).toHaveBeenCalled();
  });

  it("the page shows company, version, website, email and both phones as links", () => {
    render(<AboutUsPage />);
    expect(screen.getByRole("heading", { name: "Packman Solutions" })).toBeTruthy();
    expect(screen.getByText("Version V1")).toBeTruthy();
    const href = (id: string) => document.getElementById(id)?.getAttribute("href");
    expect(href("about-website")).toBe("https://www.packmansolutions.com");
    expect(document.getElementById("about-website")?.getAttribute("target")).toBe("_blank");
    expect(href("about-email")).toBe("mailto:packmancarebh@gmail.com");
    expect(href("about-phone-1")).toBe("tel:+97334655651");
    expect(href("about-phone-2")).toBe("tel:+97317404567");
    expect(screen.getByText("www.packmansolutions.com")).toBeTruthy();
    expect(screen.getByText("+973 34655651")).toBeTruthy();
    expect(screen.getByText("+973 17404567")).toBeTruthy();
  });
});
