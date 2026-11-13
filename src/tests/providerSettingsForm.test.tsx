// @vitest-environment jsdom
/**
 * Back Office Provider Settings form (2026-11-12): the save payload matches the backend DTOs, rows without a unit are
 * not dropped silently, a second price list for the same provider + branch is refused, Edit loads each product's real
 * alternatives and own code (the server's reply carries another product's), Excl / Incl use the product's own VAT.
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { splitPrice } from "../features/general/providerSettings/utils/providerVat";

const toast = vi.fn();
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: toast }) }));
vi.mock("../hooks/useCurrency", () => ({ useCurrency: () => ({ decimalPart: 3 }) }));
vi.mock("../features/inventory/subcategory/api", () => ({ subCategoryApi: { getSubCategories: async () => [] } }));
vi.mock("../features/inventory/branches/utils/branchSync", () => ({ subscribeToBranchUpdates: () => () => {} }));
vi.mock("../features/inventory/branches/services/branchApi", () => ({ fetchBranchNames: async () => [] }));
vi.mock("../features/inventory/product/services/productService", () => ({
  productService: {
    loadMasterData: async () => ({ vat: [{ id: 1, name: "VAT 10", value: 10 }, { id: 2, name: "VAT 5", value: 5 }] }),
    getById: async (id: number) => ({ product: { productId: id, sVatId: id === 5 ? 2 : 1 } }),
  },
}));
const service = vi.hoisted(() => ({
  loadMasterData: vi.fn(),
  loadProducts: vi.fn(),
  fetchAltNames: vi.fn(),
  fetchUnitPrice: vi.fn(),
  deleteProviderSettings: vi.fn(),
  fetchProviderSettingsList: vi.fn(),
}));
vi.mock("../features/general/providerSettings/services/providerSettingsService", () => service);

import { useProviderSettingsForm } from "../features/general/providerSettings/hooks/useProviderSettingsForm";

beforeEach(() => {
  vi.clearAllMocks();
  service.loadMasterData.mockResolvedValue({
    provider: [{ providerId: 5, providerName: "Swiggy" }, { providerId: 6, providerName: "Zomato" }],
    branch: [{ branchId: 2, branchName: "Main" }],
    category: [],
  });
  // load_products: each product's own code; Burgers has no alternative.
  service.loadProducts.mockResolvedValue([
    { product: "Burgers", barcode: "00005", altName: "", isIncl: false, price: 1, productId: 5, unitId: 1 },
    { product: "Chicken Biriyani", barcode: "000041", altName: "aaa", isIncl: true, price: 100, productId: 4, unitId: 1 },
  ]);
  service.fetchAltNames.mockImplementation(async (pid: number) => (pid === 4 ? [{ unitId: 1, altName: "Half" }, { unitId: 3, altName: "Full" }] : []));
  service.fetchProviderSettingsList.mockResolvedValue([{ transId: 1, sNo: 1, provider: "Swiggy", branch: "Main" }]);
});

/** Swiggy / Main as the server returns it today: Burgers 3 times with Chicken Biriyani's code and alt names. */
const savedSwiggy = {
  master: { transId: 1, branchId: 2, providerId: 5, createdAt: "2026-11-12T01:51:30-08:00", updatedAt: "" },
  details: [
    { sNo: 3, product: "Burgers", barcode: "000041", altName: "aaa", isIncl: false, price: 1, productId: 5, unitId: 1 },
    { sNo: 2, product: "Burgers", barcode: "000041", altName: "aaa", isIncl: false, price: 1, productId: 5, unitId: 1 },
    { sNo: 1, product: "Burgers", barcode: "000041", altName: "abcs", isIncl: false, price: 1, productId: 5, unitId: 1 },
    { sNo: 9, product: "Chicken Biriyani", barcode: "000041", altName: "aaa", isIncl: true, price: 150, productId: 4, unitId: 1 },
  ],
};

describe("splitPrice", () => {
  it("uses the product's own VAT, not a fixed 5 %", () => {
    expect(splitPrice(110, true, 10).exclPrice).toBeCloseTo(100, 9);
    expect(splitPrice(100, false, 10).inclPrice).toBeCloseTo(110, 9);
    expect(splitPrice(20, false, null)).toEqual({ exclPrice: 20, inclPrice: 20 });
  });
});

describe("Provider Settings form", () => {
  it("Edit: one row per product, its own code, real alternatives, its own VAT; Update sends the DTO fields", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useProviderSettingsForm(savedSwiggy as never, onSubmit));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    await waitFor(() => {
      const burgers = result.current.entries.find((e) => e.productId === 5)!;
      expect(burgers.productCode).toBe("00005");
      expect(burgers.altName).toBe(""); // no alternatives: not Chicken Biriyani's "aaa"
      expect(burgers.vatRate).toBe(5);
      expect(burgers.inclPrice).toBeCloseTo(1.05, 9);
    });
    await waitFor(() => {
      const biriyani = result.current.entries.find((e) => e.productId === 4)!;
      expect(biriyani.altName).toBe("Half");
      expect(biriyani.vatRate).toBe(10);
      expect(biriyani.exclPrice).toBeCloseTo(150 / 1.1, 9);
    });
    expect(result.current.altNamesMap[4].map((a) => a.altName)).toEqual(["Half", "Full"]);

    await act(async () => { await result.current.handleSubmit(); });
    const payload = onSubmit.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(["branchId", "createdAt", "details", "providerId"]);
    expect(payload).toMatchObject({ branchId: 2, providerId: 5 });
    expect(payload.details).toEqual([
      { productId: 5, unitId: 1, isIncl: false, price: 1 },
      { productId: 4, unitId: 1, isIncl: true, price: 150 },
    ]);
  });

  it("New: a second price list for the same provider + branch is refused", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useProviderSettingsForm(null, onSubmit));
    await waitFor(() => expect(result.current.providers).toHaveLength(2));
    act(() => { result.current.setSelectedProvider("5"); result.current.setSelectedBranch("2"); });
    await act(async () => { await result.current.handleGridProductSelect(0, "5-1"); });
    await act(async () => { await result.current.handleSubmit(); });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Swiggy already has settings for Main. Open them from the list and edit instead.", "error");
  });

  it("New: another provider for the same branch is saved", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useProviderSettingsForm(null, onSubmit));
    await waitFor(() => expect(result.current.providers).toHaveLength(2));
    act(() => { result.current.setSelectedProvider("6"); result.current.setSelectedBranch("2"); });
    await act(async () => { await result.current.handleGridProductSelect(0, "5-1"); });
    await act(async () => { await result.current.handleSubmit(); });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ providerId: 6, branchId: 2, details: [{ productId: 5, unitId: 1, isIncl: false, price: 1 }] });
  });

  it("a product row without a unit is not dropped silently", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useProviderSettingsForm(null, onSubmit));
    await waitFor(() => expect(result.current.providers).toHaveLength(2));
    act(() => {
      result.current.setSelectedProvider("6");
      result.current.setSelectedBranch("2");
      result.current.setEntries([{ productId: 9, unitId: 0, productName: "Tea", productCode: "", altName: "", isIncl: true, exclPrice: 1, inclPrice: 1, price: 1 }]);
    });
    await act(async () => { await result.current.handleSubmit(); });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Please select the Alt Name (unit) for Tea", "warning");
  });
});

describe("price box: currency decimals (3 here) and validation (2026-11-13)", () => {
  it("Edit shows saved prices with 3 decimals (150 → 150.000, 1 → 1.000)", async () => {
    const { result } = renderHook(() => useProviderSettingsForm(savedSwiggy as never, vi.fn()));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.entries.find((e) => e.productId === 4)!.rawPrice).toBe("150.000");
    expect(result.current.entries.find((e) => e.productId === 5)!.rawPrice).toBe("1.000");
  });

  it("typing: up to 3 decimals accepted, a 4th decimal or letters are refused (previous value kept)", async () => {
    const { result } = renderHook(() => useProviderSettingsForm(savedSwiggy as never, vi.fn()));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    const idx = result.current.entries.findIndex((e) => e.productId === 5);
    act(() => result.current.handleGridPriceChange(idx, "1.25"));
    expect(result.current.entries[idx]).toMatchObject({ rawPrice: "1.25", price: 1.25 });
    act(() => result.current.handleGridPriceChange(idx, "1.2555"));
    expect(result.current.entries[idx]).toMatchObject({ rawPrice: "1.25", price: 1.25 });
    act(() => result.current.handleGridPriceChange(idx, "1.2a"));
    expect(result.current.entries[idx].rawPrice).toBe("1.25");
  });

  it("leaving the box (blur / Enter) shows it with 3 decimals: 1.5 → 1.500", async () => {
    const { result } = renderHook(() => useProviderSettingsForm(savedSwiggy as never, vi.fn()));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    const idx = result.current.entries.findIndex((e) => e.productId === 5);
    act(() => result.current.handleGridPriceChange(idx, "1.5"));
    act(() => result.current.handleGridPriceCommit(idx));
    expect(result.current.entries[idx]).toMatchObject({ rawPrice: "1.500", price: 1.5 });
  });
});
