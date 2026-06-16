import React from "react";
import type { BackofficeConfigState } from "../types";
import { SelectInput } from "../../../../components/common";
import Checkbox from "../../../../components/common/Checkbox";

interface Props {
  form: BackofficeConfigState;
  onChange: <K extends keyof BackofficeConfigState>(key: K, value: BackofficeConfigState[K]) => void;
}

// Tab navigation helper — moves focus to the next field on Enter
const handleKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  nextId?: string
) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (nextId) document.getElementById(nextId)?.focus();
  }
};

// Placeholder product type options — replace with API data when ready
const PRODUCT_TYPE_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "composite", label: "Composite" },
  { value: "service", label: "Service" },
];

// Placeholder VAT options — replace with API data when ready
const VAT_OPTIONS = [
  { value: "5", label: "5%" },
  { value: "10", label: "10%" },
  { value: "15", label: "15%" },
];

// Named export — strictly following project rules
export const BackofficeSettingsTab = ({ form, onChange }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">

      {/* ── Left Column ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 border-b border-gray-100 pb-2 mb-4 uppercase tracking-widest">
          Product &amp; VAT
        </h3>

        <div className="grid gap-y-3">
          <SelectInput
            id="bo-conf-product-type"
            label="Default Product Type"
            autoFocus
            tabIndex={1}
            value={form.defaultProductType}
            onChange={(e) => onChange("defaultProductType", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-vat-select")}
            options={PRODUCT_TYPE_OPTIONS}
          />

          <SelectInput
            id="bo-conf-vat-select"
            label="Default VAT (%)"
            tabIndex={2}
            value={form.defaultVat}
            onChange={(e) => onChange("defaultVat", e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-stock-method")}
            options={VAT_OPTIONS}
          />

          <SelectInput
            id="bo-conf-stock-method"
            label="Stock Value Method"
            tabIndex={3}
            value={form.stockValueMethod}
            onChange={(e) =>
              onChange("stockValueMethod", e.target.value as BackofficeConfigState["stockValueMethod"])
            }
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-lnd-cost-type")}
            options={[
              { value: "AverageCost", label: "Average Cost" },
              { value: "LastPurchase", label: "Last Purchase" },
              { value: "FIFO", label: "FIFO" },
            ]}
          />

          <SelectInput
            id="bo-conf-lnd-cost-type"
            label="Update LND Cost Type"
            tabIndex={4}
            value={form.updateLndCostType}
            onChange={(e) =>
              onChange("updateLndCostType", e.target.value as BackofficeConfigState["updateLndCostType"])
            }
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-discount-calc")}
            options={[
              { value: "All", label: "All" },
              { value: "Barcode", label: "Barcode" },
              { value: "Unit", label: "Unit" },
            ]}
          />

          <SelectInput
            id="bo-conf-discount-calc"
            label="Discount Calculation"
            tabIndex={5}
            value={form.discountCalculation}
            onChange={(e) =>
              onChange("discountCalculation", e.target.value as BackofficeConfigState["discountCalculation"])
            }
            options={[
              { value: "Inclusive", label: "Inclusive" },
              { value: "Exclusive", label: "Exclusive" },
            ]}
          />
        </div>
      </div>

      {/* ── Right Column ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 border-b border-gray-100 pb-2 mb-4 uppercase tracking-widest">
          Feature Toggles
        </h3>

        <div className="grid gap-y-3">
          <Checkbox
            id="bo-conf-vat-status"
            label="VAT Status"
            tabIndex={6}
            checked={form.vatStatus}
            onChange={(e) => onChange("vatStatus", e.target.checked)}
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-adv-search")}
          />

          <Checkbox
            id="bo-conf-adv-search"
            label="Advanced Product Search"
            tabIndex={7}
            checked={form.advancedProductSearch}
            onChange={(e) => onChange("advancedProductSearch", e.target.checked)}
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-display-units")}
          />

          <Checkbox
            id="bo-conf-display-units"
            label="Display All Units"
            tabIndex={8}
            checked={form.displayAllUnits}
            onChange={(e) => onChange("displayAllUnits", e.target.checked)}
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-update-lnd")}
          />

          <Checkbox
            id="bo-conf-update-lnd"
            label="Update LND Cost"
            tabIndex={9}
            checked={form.updateLndCost}
            onChange={(e) => onChange("updateLndCost", e.target.checked)}
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-supplier-products")}
          />

          <Checkbox
            id="bo-conf-supplier-products"
            label="Supplier Products in Purchase"
            tabIndex={10}
            checked={form.supplierProductsInPurchase}
            onChange={(e) => onChange("supplierProductsInPurchase", e.target.checked)}
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-auto-update")}
          />

          <Checkbox
            id="bo-conf-auto-update"
            label="Auto Update Supplier (Purchase)"
            tabIndex={11}
            checked={form.autoUpdateSupplier}
            onChange={(e) => onChange("autoUpdateSupplier", e.target.checked)}
            onKeyDown={(e) => handleKeyDown(e, "bo-conf-barcode-view")}
          />

          <Checkbox
            id="bo-conf-barcode-view"
            label="Barcode View"
            tabIndex={12}
            checked={form.barcodeView}
            onChange={(e) => onChange("barcodeView", e.target.checked)}
          />
        </div>
      </div>

    </div>
  );
};
