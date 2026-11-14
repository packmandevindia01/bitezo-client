// @vitest-environment jsdom
/**
 * Provider Settings Enter key (2026-11-14), on the real filter row and grid:
 * Provider → Date → Branch → Category → Load Data (Sub Category → Load Data); editing: Date skips the locked Branch.
 * Grid: picking a product moves to Alt Name (focus used to be lost: the row key held the product, so the row was rebuilt),
 * Enter on Alt Name goes to Price (it did nothing).
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { useState } from "react";
import { render, fireEvent, act } from "@testing-library/react";

vi.mock("../hooks/useCurrency", () => ({ useCurrency: () => ({ decimalPart: 3, formatAmount: (n: number) => n.toFixed(3) }) }));

import ProviderSettingsGrid from "../features/general/providerSettings/components/ProviderSettingsGrid";
import type { ProviderSettingEntry, ProductSearchItem, AltNameItem, ProviderMasterItem, BranchMasterItem, CategoryMasterItem } from "../features/general/providerSettings/types";
import type { SubCategoryListItem } from "../features/inventory/subcategory/types";

beforeAll(() => {
  // jsdom has no layout: give every element a size so the "next field" helper sees them
  Element.prototype.getBoundingClientRect = function () {
    return { width: 100, height: 20, top: 0, left: 0, right: 100, bottom: 20, x: 0, y: 0, toJSON() {} } as DOMRect;
  };
  Object.defineProperty(window, "innerWidth", { value: 1600, configurable: true });
});

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));
const empty = () => ({ productId: 0, unitId: 0, productName: "", productCode: "", altName: "", isIncl: true, price: 0, exclPrice: 0, inclPrice: 0 });

const Harness = () => {
  const [entries, setEntries] = useState<ProviderSettingEntry[]>([empty()]);
  const products = [
    { productId: 1, unitId: 11, productName: "Apple", barcode: "A1", altName: "", price: 5, isIncl: true },
    { productId: 2, unitId: 22, productName: "Banana", barcode: "B2", altName: "", price: 6, isIncl: true },
  ];
  return (
    <ProviderSettingsGrid
      entries={entries}
      allProducts={products as unknown as ProductSearchItem[]}
      altNamesMap={{ 1: [{ unitId: 11, altName: "Apple" }], 2: [{ unitId: 22, altName: "Banana" }] } as unknown as Record<number, AltNameItem[]>}
      onProductSelect={async (i, val) => {
        const [pid, uid] = val.split("-").map(Number);
        const p = products.find((x) => x.productId === pid)!;
        setEntries((prev) => prev.map((e, k) => (k === i ? { ...e, productId: pid, unitId: uid, productName: p.productName, price: p.price, exclPrice: p.price, inclPrice: p.price } : e)));
      }}
      onAltNameSelect={() => {}}
      onToggleTax={() => {}}
      onPriceChange={() => {}}
      onPriceCommit={() => {}}
      onRemove={() => {}}
      onAddRow={() => setEntries((prev) => [...prev, empty()])}
      onLoadAltNames={async () => {}}
    />
  );
};

const pickIn = async (id: string, text: string) => {
  const trig = document.getElementById(id)!;
  trig.focus();
  if (trig.getAttribute("aria-expanded") !== "true") fireEvent.keyDown(trig, { key: "Enter" });
  await wait(30);
  const search = document.querySelector<HTMLInputElement>(".select-portal-content input, input[placeholder*='search' i]")!;
  fireEvent.change(search, { target: { value: text } });
  await wait(10);
  fireEvent.keyDown(search, { key: "Enter" });
  await wait(150);
  return document.activeElement;
};

describe("Provider Settings grid: Enter", () => {
  it("picking a product moves to Alt Name (focus is not lost), Enter on Alt Name goes to Price", async () => {
    render(<Harness />);
    const after = await pickIn("ps-grid-prod-0", "App");
    expect(after?.id).toBe("ps-grid-alt-0");
    expect(document.getElementById("ps-grid-prod-0")?.textContent).toContain("Apple");
    fireEvent.keyDown(after!, { key: "Enter" });
    expect(document.activeElement?.id).toBe("ps-grid-price-0");
  });
});

import ProviderSettingsFilters from "../features/general/providerSettings/components/ProviderSettingsFilters";

const FHarness = ({ isEdit = false }: { isEdit?: boolean }) => {
  const [prov, setProv] = useState(isEdit ? "1" : "");
  const [branch, setBranch] = useState(isEdit ? "1" : "");
  const [cats, setCats] = useState<number[]>([]);
  const [sub, setSub] = useState("");
  const [loadingSubs, setLoadingSubs] = useState(false);
  return (
    <div>
      <ProviderSettingsFilters
        providers={[{ providerId: 1, providerName: "Swiggy" }] as unknown as ProviderMasterItem[]}
        branches={[{ branchId: 1, branchName: "Main" }] as unknown as BranchMasterItem[]}
        categories={[{ categoryId: 1, categoryName: "Drinks" }, { categoryId: 2, categoryName: "Food" }] as unknown as CategoryMasterItem[]}
        subCategories={cats.length && !loadingSubs ? ([{ id: 9, name: "Cold" }] as unknown as SubCategoryListItem[]) : []}
        selectedProvider={prov} selectedDate="2026-11-14" selectedBranch={branch}
        selectedCategoryIds={cats} selectedSubCategory={sub}
        loading={false} loadingSubs={loadingSubs} isEdit={isEdit}
        onProviderChange={setProv} onDateChange={() => {}} onBranchChange={setBranch}
        onAddCategory={(id) => { setCats((c) => [...c, id]); setLoadingSubs(true); setTimeout(() => setLoadingSubs(false), 200); }}
        onRemoveCategory={() => {}} onClearCategories={() => {}} onSubCategoryChange={setSub} onLoad={() => {}}
      />
      <input id="ps-grid-find" />
    </div>
  );
};

const pick = async (id: string, text: string) => (await pickIn(id, text))?.id;

describe("Provider Settings filter row: Enter", () => {
  it("Provider → Date → Branch → Category → Load Data; Sub Category → Load Data", async () => {
    render(<FHarness />);
    await wait(50);
    expect(await pick("ps-provider", "Swi")).toBe("ps-date");
    const d = document.getElementById("ps-date")!;
    fireEvent.keyDown(d, { key: "Enter" });
    await wait(20);
    expect(document.getElementById("ps-branch")?.getAttribute("aria-expanded")).toBe("true");
    expect(await pick("ps-branch", "Mai")).not.toBe("ps-grid-find");
    expect(document.getElementById("ps-category")?.getAttribute("aria-expanded")).toBe("true");
    // Sub Category is still loading → Load Data, not the grid find box
    expect(await pick("ps-category", "Dri")).toBe("ps-load-btn");
    await wait(300);
    expect(await pick("ps-subcategory", "Col")).toBe("ps-load-btn");
  });

  it("editing: Date skips the locked Branch and opens Category", async () => {
    render(<FHarness isEdit />);
    const d = document.getElementById("ps-date")!;
    d.focus();
    fireEvent.keyDown(d, { key: "Enter" });
    await wait(20);
    expect(document.getElementById("ps-category")?.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.id).not.toBe("ps-branch");
  });
});
