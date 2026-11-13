// @vitest-environment jsdom
/**
 * Provider Settings grid: find a product (2026-11-13). Typing in "Find product" highlights every matching row
 * (name, alt name or code), scrolls to the current match and shows "n of N"; Enter / ▼ next, Shift+Enter / ▲ previous
 * (wraps); Esc / × clears.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { findMatchingRows, stepMatch } from "../features/general/providerSettings/utils/gridSearch";

vi.mock("../hooks/useCurrency", () => ({ useCurrency: () => ({ decimalPart: 3, formatAmount: (n: number) => n.toFixed(3) }) }));

import ProviderSettingsGrid from "../features/general/providerSettings/components/ProviderSettingsGrid";

const row = (productId: number, productName: string, altName = "", productCode = "") => ({
  productId, unitId: 1, productName, productCode, altName, isIncl: false, vatRate: 10,
  price: 1, rawPrice: "1", exclPrice: 1, inclPrice: 1.1,
});

const rows = [
  row(4, "Chicken Biriyani", "aaa", "000041"),
  row(5, "Burgers", "Burgers", "00005"),
  row(6, "KFC", "KFC", "00006"),
  row(5, "Burgers", "Large", "00005"), // same product again (another unit)
  row(0, ""), // empty row
];

describe("findMatchingRows / stepMatch", () => {
  it("matches name, alt name or code, case-insensitive, anywhere; empty rows never", () => {
    expect(findMatchingRows(rows, "bur")).toEqual([1, 3]);
    expect(findMatchingRows(rows, "BIRI")).toEqual([0]);
    expect(findMatchingRows(rows, "large")).toEqual([3]);
    expect(findMatchingRows(rows, "00006")).toEqual([2]);
    expect(findMatchingRows(rows, "  ")).toEqual([]);
    expect(findMatchingRows(rows, "pizza")).toEqual([]);
  });

  it("steps through matches and wraps", () => {
    expect(stepMatch(0, 3, 1)).toBe(1);
    expect(stepMatch(2, 3, 1)).toBe(0);
    expect(stepMatch(0, 3, -1)).toBe(2);
    expect(stepMatch(-1, 3, -1)).toBe(2);
    expect(stepMatch(0, 0, 1)).toBe(-1);
  });
});

const scrolled: string[] = [];
beforeEach(() => {
  scrolled.length = 0;
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this.id);
  } as never;
});

const renderGrid = () =>
  render(
    <ProviderSettingsGrid
      entries={rows as never}
      allProducts={[]}
      altNamesMap={{ 4: [], 5: [], 6: [] }}
      onProductSelect={vi.fn(async () => {})}
      onAltNameSelect={vi.fn()}
      onToggleTax={vi.fn()}
      onPriceChange={vi.fn()}
      onRemove={vi.fn()}
      onAddRow={vi.fn()}
      onLoadAltNames={vi.fn(async () => {})}
    />
  );

const findState = (container: HTMLElement) =>
  rows.map((_, i) => container.querySelector(`#ps-grid-row-${i}`)?.getAttribute("data-find") ?? null);

describe("ProviderSettingsGrid find box", () => {
  it("highlights every matching row, marks the first as current and scrolls to it", () => {
    const { container } = renderGrid();
    fireEvent.change(screen.getByLabelText("Find product in list"), { target: { value: "burg" } });
    expect(findState(container)).toEqual([null, "current", null, "match", null]);
    expect(screen.getByTestId("ps-grid-find-count").textContent).toBe("1 of 2");
    expect(scrolled).toContain("ps-grid-row-1");
  });

  it("Enter goes to the next match, Shift+Enter back, wrapping around", () => {
    const { container } = renderGrid();
    const box = screen.getByLabelText("Find product in list");
    fireEvent.change(box, { target: { value: "burg" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(findState(container)).toEqual([null, "match", null, "current", null]);
    expect(screen.getByTestId("ps-grid-find-count").textContent).toBe("2 of 2");
    expect(scrolled).toContain("ps-grid-row-3");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByTestId("ps-grid-find-count").textContent).toBe("1 of 2");
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(screen.getByTestId("ps-grid-find-count").textContent).toBe("2 of 2");
  });

  it("the ▲ / ▼ buttons move between matches", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Find product in list"), { target: { value: "burg" } });
    fireEvent.click(screen.getByLabelText("Next match"));
    expect(screen.getByTestId("ps-grid-find-count").textContent).toBe("2 of 2");
    fireEvent.click(screen.getByLabelText("Previous match"));
    expect(screen.getByTestId("ps-grid-find-count").textContent).toBe("1 of 2");
  });

  it("no match says so and highlights nothing", () => {
    const { container } = renderGrid();
    fireEvent.change(screen.getByLabelText("Find product in list"), { target: { value: "pizza" } });
    expect(screen.getByTestId("ps-grid-find-count").textContent).toBe("No match");
    expect(findState(container).every((s) => s === null)).toBe(true);
  });

  it("Esc clears the search and the highlight", () => {
    const { container } = renderGrid();
    const box = screen.getByLabelText("Find product in list") as HTMLInputElement;
    fireEvent.change(box, { target: { value: "kfc" } });
    expect(findState(container)[2]).toBe("current");
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box.value).toBe("");
    expect(findState(container).every((s) => s === null)).toBe(true);
    expect(screen.queryByTestId("ps-grid-find-count")).toBeNull();
  });
});
