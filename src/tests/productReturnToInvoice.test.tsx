// @vitest-environment jsdom
/**
 * Purchase Invoice → "New Product" → Product Master (2026-11-14): Product Master opened with ?returnTo=<invoice page>
 * shows "Back to Purchase Invoice"; Save Product stores the new product and goes back to the invoice.
 * The draft helper only accepts Purchase Invoice pages and drops old or foreign drafts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";

const mutate = vi.fn();
vi.mock("../features/inventory/product/hooks/useProductForm", () => ({
  useProductForm: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- the mocked hook is called as a hook by the page
    const form = useForm({ defaultValues: { name: "New Rice", code: "N1", barcode: "N1" } });
    return {
      form, masterData: null, branches: [], subCategories: [], isLoading: false, isSaving: false, isDeleting: false,
      imagePreview: null, setImageFile: vi.fn(), saveMutation: { mutate }, deleteMutation: { mutate: vi.fn() },
      handleResetForm: vi.fn(), currentBranchId: 1,
    };
  },
}));
vi.mock("../features/inventory/product/components/ProductMasterForm", () => ({ default: () => null }));
vi.mock("../features/pos/terminal/hooks/useBarcodeScanner", () => ({ useBarcodeScanner: () => {} }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

import ProductFormPage from "../features/inventory/product/pages/ProductFormPage";
import {
  isPurchaseInvoicePath, productMasterFromInvoice, savePurchaseInvoiceDraft, takePurchaseInvoiceDraft, saveCreatedProduct, takeCreatedProduct,
} from "../features/transaction/purchaseInvoice/utils/purchaseInvoiceDraft";

const Where = () => createElement("div", { "data-testid": "where" }, useLocation().pathname);

const renderProductAdd = (search: string) =>
  render(
    createElement(MemoryRouter, { initialEntries: [`/dashboard/products/add${search}`], children:
      createElement(Routes, null,
        createElement(Route, { path: "/dashboard/products/add", element: createElement(ProductFormPage) }),
        createElement(Route, { path: "*", element: createElement(Where) })) }),
  );

beforeEach(() => {
  sessionStorage.clear();
  mutate.mockReset();
});

describe("Product Master opened from Purchase Invoice", () => {
  it("Back to Purchase Invoice goes back to that invoice", () => {
    renderProductAdd(`?returnTo=${encodeURIComponent("/dashboard/purchase-invoice/new")}`);
    fireEvent.click(screen.getByRole("button", { name: /Back to Purchase Invoice/ }));
    expect(screen.getByTestId("where").textContent).toBe("/dashboard/purchase-invoice/new");
  });

  it("Save Product stores the new product and goes back to the invoice", async () => {
    mutate.mockImplementation((_data, opts) => opts?.onSuccess?.({ id: 77 }));
    renderProductAdd(`?returnTo=${encodeURIComponent("/dashboard/purchase-invoice/edit/5")}`);
    fireEvent.click(screen.getByRole("button", { name: /Save Product/ }));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard/purchase-invoice/edit/5"));
    expect(JSON.parse(sessionStorage.getItem("purchaseInvoiceCreatedProduct")!)).toEqual({ id: 77, name: "New Rice", code: "N1", barcode: "N1" });
  });

  it("the close (X) also goes back to the invoice", () => {
    renderProductAdd(`?returnTo=${encodeURIComponent("/dashboard/purchase-invoice/new")}`);
    fireEvent.click(screen.getByTitle("Close"));
    expect(screen.getByTestId("where").textContent).toBe("/dashboard/purchase-invoice/new");
  });

  it("without returnTo, or with an address that is not a Purchase Invoice page, there is no Back button", () => {
    renderProductAdd("");
    expect(screen.queryByRole("button", { name: /Back to Purchase Invoice/ })).toBeNull();
    document.body.innerHTML = "";
    renderProductAdd(`?returnTo=${encodeURIComponent("https://example.com")}`);
    expect(screen.queryByRole("button", { name: /Back to Purchase Invoice/ })).toBeNull();
    fireEvent.click(screen.getByTitle("Close"));
    expect(screen.getByTestId("where").textContent).toBe("/dashboard/products");
  });
});

describe("purchase invoice draft", () => {
  it("only Purchase Invoice pages are accepted as the way back", () => {
    expect(isPurchaseInvoicePath("/dashboard/purchase-invoice/new")).toBe(true);
    expect(isPurchaseInvoicePath("/dashboard/purchase-invoice/edit/12")).toBe(true);
    expect(isPurchaseInvoicePath("/dashboard/purchase-return/new")).toBe(false);
    expect(isPurchaseInvoicePath("//evil.com")).toBe(false);
    expect(isPurchaseInvoicePath(null)).toBe(false);
    expect(productMasterFromInvoice("/dashboard/purchase-invoice/new")).toBe("/dashboard/products/add?returnTo=%2Fdashboard%2Fpurchase-invoice%2Fnew");
  });

  it("a draft is taken once, only by its own page; a stale draft is dropped; a new trip clears an old product", () => {
    saveCreatedProduct({ id: 1, name: "Old", code: "O", barcode: "O" });
    savePurchaseInvoiceDraft("/dashboard/purchase-invoice/new", { refNo: "X" }, 2);
    expect(takeCreatedProduct()).toBeNull(); // cleared by the new trip
    expect(takePurchaseInvoiceDraft("/dashboard/purchase-invoice/edit/1")).toBeNull(); // another page
    const draft = takePurchaseInvoiceDraft("/dashboard/purchase-invoice/new");
    expect(draft?.values).toEqual({ refNo: "X" });
    expect(draft?.selectedPaymodeId).toBe(2);
    expect(takePurchaseInvoiceDraft("/dashboard/purchase-invoice/new")).toBeNull(); // taken once

    sessionStorage.setItem("purchaseInvoiceDraft", JSON.stringify({ path: "/dashboard/purchase-invoice/new", savedAt: Date.now() - 3 * 60 * 60 * 1000, values: {}, selectedPaymodeId: 0 }));
    expect(takePurchaseInvoiceDraft("/dashboard/purchase-invoice/new")).toBeNull(); // older than 2 hours
  });
});
