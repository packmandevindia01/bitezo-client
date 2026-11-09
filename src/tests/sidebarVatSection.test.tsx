// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import NavReportGroup from "../components/layout/sidebar/NavReportGroup";

const allowed = vi.hoisted(() => ({ modules: [] as string[] }));
vi.mock("../hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: (module: string) => allowed.modules.includes(module) }),
}));

const OUTPUT = "Product Output VAT Report";
const INPUT = "Product Input VAT Report";
const navigate = vi.fn();
const onClose = vi.fn();
const show = (...modules: string[]) => {
  allowed.modules = modules;
  render(<NavReportGroup navigate={navigate} onClose={onClose} itemClassName="item" />);
};
const sectionOf = (label: string) => screen.getByText(label).closest(".flex.flex-col")?.parentElement?.parentElement;

beforeEach(() => {
  navigate.mockClear();
  onClose.mockClear();
});
afterEach(cleanup);

describe("VAT Report section in the back office sidebar", () => {
  it("holds both VAT reports, each listed once", () => {
    show("Sales Report", "Purchase Report");
    expect(screen.getAllByText("VAT Report")).toHaveLength(1);
    expect(screen.getAllByText(OUTPUT)).toHaveLength(1);
    expect(screen.getAllByText(INPUT)).toHaveLength(1);
    expect(sectionOf(OUTPUT)?.textContent).toContain("VAT Report");
    expect(sectionOf(INPUT)?.textContent).toContain("VAT Report");
    expect(sectionOf("Sales Summary")?.textContent).not.toContain(OUTPUT);
    expect(sectionOf("Purchase Summary")?.textContent).not.toContain(INPUT);
  });

  it.each([
    [OUTPUT, "/dashboard/reports/product-output-vat"],
    [INPUT, "/dashboard/reports/product-input-vat"],
  ])("%s opens its existing page and closes the sidebar", (label, path) => {
    show("Sales Report");
    fireEvent.click(screen.getByText(label));
    expect(navigate).toHaveBeenCalledWith(path);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Purchase Report users see only the Input report, as its page allows", () => {
    show("Purchase Report");
    expect(screen.queryByText(OUTPUT)).toBeNull();
    expect(screen.getByText(INPUT)).toBeTruthy();
  });

  it("is hidden for users who can open neither report", () => {
    show("Stock Report");
    expect(screen.queryByText("VAT Report")).toBeNull();
  });
});
