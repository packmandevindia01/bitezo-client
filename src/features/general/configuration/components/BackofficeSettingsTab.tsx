import React from "react";
import type { BackofficeConfigState } from "../types";
import { SelectInput } from "../../../../components/common";
import Checkbox from "../../../../components/common/Checkbox";

interface Props {
  form: BackofficeConfigState;
  onChange: <K extends keyof BackofficeConfigState>(key: K, value: BackofficeConfigState[K]) => void;
  productTypeOptions: {label: string, value: string}[];
  vatOptions: {label: string, value: string}[];
  paymodeOptions: {label: string, value: string}[];
  backofficeBranches?: {label: string, value: string}[];
  selectedBranch?: string;
  onBranchChange?: (branchId: string) => void;
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

// Named export — strictly following project rules
export const BackofficeSettingsTab = ({
  form,
  onChange,
  productTypeOptions,
  vatOptions,
  paymodeOptions,
  backofficeBranches,
  selectedBranch,
  onBranchChange
}: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* ── Branch Selection ────────────────────────────────────────── */}
      {backofficeBranches && onBranchChange && (
        <SelectInput
          id="bo-conf-branch-select"
          label="Branch Name"
          value={selectedBranch || ""}
          onChange={(e) => onBranchChange(e.target.value)}
          options={backofficeBranches}
        />
      )}

      {/* ── Products & VAT ─────────────────────────────────────────── */}
      <SelectInput
        id="bo-conf-product-type"
        label="Default Product Type"
        autoFocus
        tabIndex={1}
        value={form.defaultProductType}
        onChange={(e) => onChange("defaultProductType", e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "bo-conf-vat-select")}
        options={productTypeOptions}
      />

      <SelectInput
        id="bo-conf-vat-select"
        label="Default VAT (%)"
        tabIndex={2}
        value={form.defaultVat}
        onChange={(e) => onChange("defaultVat", e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "bo-conf-paymode-select")}
        options={vatOptions}
      />

      <SelectInput
        id="bo-conf-paymode-select"
        label="Default Paymode"
        tabIndex={3}
        value={form.defaultPaymode}
        onChange={(e) => onChange("defaultPaymode", e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "bo-conf-stock-method")}
        options={paymodeOptions}
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
          { value: "Exclusive", label: "Exclusive" },
          { value: "Inclusive", label: "Inclusive" },
        ]}
      />

      {/* ── Feature Toggles ────────────────────────────────────────── */}
      <div className="flex items-center">
        <Checkbox
          id="bo-conf-vat-status"
          label="VAT Status"
          checked={form.vatStatus}
          onChange={(e) => onChange("vatStatus", e.target.checked)}
        />
      </div>

      <div className="flex items-center">
        <Checkbox
          id="bo-conf-adv-product"
          label="Advanced Product Search"
          checked={form.advancedProductSearch}
          onChange={(e) => onChange("advancedProductSearch", e.target.checked)}
        />
      </div>

      <div className="flex items-center">
        <Checkbox
          id="bo-conf-display-all-units"
          label="Display All Units"
          checked={form.displayAllUnits}
          onChange={(e) => onChange("displayAllUnits", e.target.checked)}
        />
      </div>

      <div className="flex items-center">
        <Checkbox
          id="bo-conf-update-lnd-cost"
          label="Update LND Cost"
          checked={form.updateLndCost}
          onChange={(e) => onChange("updateLndCost", e.target.checked)}
        />
      </div>

      <div className="flex items-center">
        <Checkbox
          id="bo-conf-supplier-purchase"
          label="Supplier Products in Purchase"
          checked={form.supplierProductsInPurchase}
          onChange={(e) => onChange("supplierProductsInPurchase", e.target.checked)}
        />
      </div>

      <div className="flex items-center">
        <Checkbox
          id="bo-conf-auto-update-supplier"
          label="Auto Update Supplier (Purchase)"
          checked={form.autoUpdateSupplier}
          onChange={(e) => onChange("autoUpdateSupplier", e.target.checked)}
        />
      </div>

      <div className="flex items-center">
        <Checkbox
          id="bo-conf-barcode-view"
          label="Barcode View"
          checked={form.barcodeView}
          onChange={(e) => onChange("barcodeView", e.target.checked)}
        />
      </div>
    </div>
  );
};
