// @vitest-environment jsdom
/**
 * Product Master (2026-11-14): Enter on Sales VAT, the last field, did nothing, so it never reached Save Product.
 * Now Enter on Sales VAT (closed) and picking a Sales VAT from its list both move focus to Save Product.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { useForm } from "react-hook-form";

vi.mock("../app/hooks", () => ({ useAppSelector: () => 3 }));
vi.mock("../features/inventory/product/components/QuickAddGroupModal", () => ({ QuickAddGroupModal: () => null }));
vi.mock("../features/inventory/product/components/QuickAddCategoryModal", () => ({ QuickAddCategoryModal: () => null }));
vi.mock("../features/inventory/product/components/QuickAddSubCategoryModal", () => ({ QuickAddSubCategoryModal: () => null }));
vi.mock("../features/inventory/product/components/QuickAddUnitModal", () => ({ QuickAddUnitModal: () => null }));

import { ProductDetailsSection } from "../features/inventory/product/components/ProductDetailsSection";
import type { ProductFormData } from "../features/inventory/product/schema/productSchema";
import type { ProductMasterData } from "../features/inventory/product/types";

beforeAll(() => {
  // jsdom has no layout: give every element a size so the "next field" helper sees them
  Element.prototype.getBoundingClientRect = function () {
    return { width: 100, height: 20, top: 0, left: 0, right: 100, bottom: 20, x: 0, y: 0, toJSON() {} } as DOMRect;
  };
});

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

const masterData = { vat: [{ id: 1, name: "VAT", value: 10 }, { id: 2, name: "Zero", value: 0 }] } as unknown as ProductMasterData;

// The section plus the page's Save Product button (same id and data-focus-next as ProductFormPage).
const Harness = ({ sVatId }: { sVatId: string }) => {
  const form = useForm<ProductFormData>({ defaultValues: { sVatId, pVatId: "1", colorCode: "#49293e" } as Partial<ProductFormData> as ProductFormData });
  return (
    <div>
      <ProductDetailsSection form={form} masterData={masterData} subCatOptions={[]} branchOptions={[{ label: "All", value: "1" }]} />
      <button id="prod-save-btn" data-focus-next type="button">Save Product</button>
    </div>
  );
};

describe("Product Master: Enter after Sales VAT goes to Save Product", () => {
  it("Enter on Product Color → Sales VAT → Enter (list closed) → Save Product", async () => {
    render(<Harness sVatId="1" />);
    const color = document.getElementById("prod-color")!;
    color.focus();
    fireEvent.keyDown(color, { key: "Enter" });
    await wait(80);
    const sVat = document.getElementById("prod-s-vat")!;
    expect(document.activeElement === sVat || sVat.contains(document.activeElement)).toBe(true);

    // close the list that opened on focus, then Enter on the closed box
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await wait(20);
    sVat.focus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await wait(20);
    fireEvent.keyDown(sVat, { key: "Enter" });
    await wait(80);
    expect(document.activeElement?.id).toBe("prod-save-btn");
  });

  it("picking a Sales VAT from the open list → Save Product", async () => {
    render(<Harness sVatId="" />);
    const sVat = document.getElementById("prod-s-vat")!;
    sVat.focus();
    if (sVat.getAttribute("aria-expanded") !== "true") fireEvent.keyDown(sVat, { key: "Enter" });
    await wait(30);
    const search = document.querySelector<HTMLInputElement>(".select-portal-content input, input[placeholder*='search' i]")!;
    fireEvent.change(search, { target: { value: "Zero" } });
    await wait(20);
    fireEvent.keyDown(search, { key: "Enter" });
    await wait(100);
    expect(document.activeElement?.id).toBe("prod-save-btn");
  });
});

// The harness above has its own Save button; this keeps the real page's button opted in to the "next field" search.
import productFormPageSource from "../features/inventory/product/pages/ProductFormPage.tsx?raw";
it("ProductFormPage's Save Product button is marked data-focus-next", () => {
  expect(productFormPageSource).toMatch(/id="prod-save-btn"\s*\n\s*data-focus-next/);
});
