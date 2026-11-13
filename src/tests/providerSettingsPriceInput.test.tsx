// @vitest-environment jsdom
/**
 * Provider Settings price box (2026-11-13): prices show with the company's currency decimals, typing is limited to that
 * many decimals, and Enter moves to the next row's price (the product box when the next row is empty; the last row adds one).
 */
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { acceptPriceInput, formatPriceInput } from "../features/general/providerSettings/utils/priceInput";

vi.mock("../hooks/useCurrency", () => ({ useCurrency: () => ({ decimalPart: 3, formatAmount: (n: number) => n.toFixed(3) }) }));

import ProviderSettingsGrid from "../features/general/providerSettings/components/ProviderSettingsGrid";

describe("formatPriceInput / acceptPriceInput", () => {
  it("formats with the currency decimals; no price → empty", () => {
    expect(formatPriceInput(150, 3)).toBe("150.000");
    expect(formatPriceInput(1.5, 3)).toBe("1.500");
    expect(formatPriceInput(1.5, 2)).toBe("1.50");
    expect(formatPriceInput(0, 3)).toBe("");
    expect(formatPriceInput(undefined, 3)).toBe("");
  });

  it("accepts plain numbers with up to N decimals, refuses the rest", () => {
    for (const ok of ["", "1", "1.", ".5", "1.255", "150.000"]) expect(acceptPriceInput(ok, 3)).toBe(ok);
    expect(acceptPriceInput("1,5", 3)).toBe("1.5");
    for (const bad of ["1.2555", "abc", "-1", "1.2.3", "1e3"]) expect(acceptPriceInput(bad, 3)).toBeNull();
    expect(acceptPriceInput("1.5", 0)).toBeNull();
    expect(acceptPriceInput("15", 0)).toBe("15");
  });
});

const row = (productId: number, price: number) => ({
  productId, unitId: 1, productName: `P${productId}`, productCode: "", altName: "", isIncl: false, vatRate: 10,
  price, rawPrice: String(price), exclPrice: price, inclPrice: price * 1.1,
});

const renderGrid = (entries: any[], extra: Partial<Record<string, any>> = {}) => {
  const props = {
    entries, allProducts: [], altNamesMap: { 1: [], 2: [], 3: [] },
    onProductSelect: vi.fn(async () => {}), onAltNameSelect: vi.fn(), onToggleTax: vi.fn(),
    onPriceChange: vi.fn(), onPriceCommit: vi.fn(), onRemove: vi.fn(), onAddRow: vi.fn(),
    onLoadAltNames: vi.fn(async () => {}), ...extra,
  };
  const view = render(<ProviderSettingsGrid {...(props as any)} />);
  return { ...view, props };
};

describe("ProviderSettingsGrid price box", () => {
  it("shows saved prices with 3 decimals when not being edited", () => {
    const { container } = renderGrid([row(1, 150), row(2, 1.5)]);
    expect((container.querySelector("#ps-grid-price-0") as HTMLInputElement).value).toBe("150.000");
    expect((container.querySelector("#ps-grid-price-1") as HTMLInputElement).value).toBe("1.500");
  });

  it("Enter moves to the next row's price (it used to do nothing except on the last row)", async () => {
    const { container, props } = renderGrid([row(1, 150), row(2, 1.5), row(3, 2)]);
    const first = container.querySelector("#ps-grid-price-0") as HTMLInputElement;
    first.focus();
    fireEvent.keyDown(first, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 5));
    expect(document.activeElement?.id).toBe("ps-grid-price-1");
    expect(props.onPriceCommit).toHaveBeenCalledWith(0);
    expect(props.onAddRow).not.toHaveBeenCalled();
  });

  it("Enter goes to the next row's product box when that row has no product yet", async () => {
    const { container } = renderGrid([row(1, 150), { ...row(0, 0), productId: 0 }]);
    const first = container.querySelector("#ps-grid-price-0") as HTMLInputElement;
    first.focus();
    fireEvent.keyDown(first, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 5));
    expect(document.activeElement?.id).toBe("ps-grid-prod-1");
  });

  it("Enter on the last row adds a row", () => {
    const { container, props } = renderGrid([row(1, 150), row(2, 1.5)]);
    fireEvent.keyDown(container.querySelector("#ps-grid-price-1") as HTMLInputElement, { key: "Enter" });
    expect(props.onAddRow).toHaveBeenCalledTimes(1);
  });
});
