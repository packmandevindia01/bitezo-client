import React, { useState, useEffect } from "react";
import {
  SelectInput,
  SearchableSelect,
  Button,
  RecordTableCard,
  ConfirmDialog,
} from "../../../../../components/common";
import { Trash2, AlertTriangle } from "lucide-react";
import type { ProductPrinterSetting } from "../../../types";
import { productService } from "../../../../inventory/product/services/productService";
import { useAvailablePrinters } from "../../hooks/useAvailablePrinters";

interface ProductWisePrinterTabProps {
  initialData: ProductPrinterSetting[];
  onSave: (data: ProductPrinterSetting[]) => void;
  loading?: boolean;
  isAndroidPrinter?: boolean;
  onToggleAndroidPrinter?: (enabled: boolean) => void;
}

export const ProductWisePrinterTab: React.FC<ProductWisePrinterTabProps> = ({
  initialData,
  onSave,
  loading,
  isAndroidPrinter,
  onToggleAndroidPrinter,
}) => {
  const {
    printerOptions,
    isAndroidPrinter: isAndroid,
    toggleAndroidPrinter,
    ipMapList,
    loadingIpMap,
  } = useAvailablePrinters({
    isAndroid: isAndroidPrinter,
    onToggleAndroid: onToggleAndroidPrinter,
  });
  const [items, setItems] = useState<ProductPrinterSetting[]>(initialData);
  const [productOptions, setProductOptions] = useState<{ label: string; value: string }[]>([]);
  const [form, setForm] = useState({
    productId: "",
    firstPrinter: "No Printer",
    secondPrinter: "No Printer",
  });
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  useEffect(() => {
    if (printerOptions.length > 1) {
      const exists = printerOptions.some((p) => p.value === form.firstPrinter);
      if (!exists || form.firstPrinter === "No Printer") {
        setForm((prev) => ({
          ...prev,
          firstPrinter: printerOptions[1].value,
        }));
      }
      if (form.secondPrinter !== "No Printer") {
        const secondExists = printerOptions.some((p) => p.value === form.secondPrinter);
        if (!secondExists) {
          setForm((prev) => ({ ...prev, secondPrinter: "No Printer" }));
        }
      }
    }
  }, [printerOptions]);

  useEffect(() => {
    productService.listName().then((data) => {
      setProductOptions(data.map((p) => ({ label: p.productName, value: String(p.productId) })));
    });
  }, []);

  const handleAdd = () => {
    if (!form.productId) return;
    const product = productOptions.find((p) => p.value === form.productId);
    const newItem: ProductPrinterSetting = {
      productId: parseInt(form.productId),
      product: product?.label,
      firstPrinter: form.firstPrinter,
      secondPrinter: form.secondPrinter,
    };

    if (items.some((i) => i.productId === newItem.productId)) {
      setItems(items.map((i) => (i.productId === newItem.productId ? newItem : i)));
    } else {
      setItems([newItem, ...items]);
    }

    setForm({ ...form, productId: "" });
  };

  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.productId !== id));
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#49293e] rounded-full" />
            Product Routing
          </h3>

          {/* Android Printer Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm hover:border-[#49293e]/30 transition-colors">
            <input
              type="checkbox"
              checked={isAndroid}
              onChange={(e) => toggleAndroidPrinter(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e] cursor-pointer"
            />
            <span>Enable Android Printer Option</span>
          </label>
        </div>

        {/* Warning banner when androidPrint is enabled but no printer IP mappings exist */}
        {isAndroid && !loadingIpMap && ipMapList.length === 0 && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-start gap-3 text-amber-800 mb-4">
            <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={18} />
            <div className="text-xs">
              <p className="font-bold">No Printer IP Mappings Saved</p>
              <p className="text-amber-700 mt-0.5">
                Android Direct Printing is enabled, but no printer IP addresses are currently saved.
                Please navigate to the <strong>IP MAP</strong> tab to configure your thermal printer IP mappings.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3 min-w-[300px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">
              Product
            </label>
            <div className="flex-1">
              <SearchableSelect
                autoFocus={window.innerWidth > 1024}
                options={productOptions}
                value={form.productId}
                onChange={(val) => setForm({ ...form, productId: val })}
                placeholder="Search product..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-[220px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">
              KOT 1
            </label>
            <div className="flex-1">
              <SelectInput
                noMargin
                options={printerOptions}
                value={form.firstPrinter}
                onChange={(e) => setForm({ ...form, firstPrinter: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-[220px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">
              KOT 2
            </label>
            <div className="flex-1">
              <SelectInput
                noMargin
                options={printerOptions}
                value={form.secondPrinter}
                onChange={(e) => setForm({ ...form, secondPrinter: e.target.value })}
              />
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleAdd}
            className="h-10.5 px-8 uppercase tracking-[0.2em] font-black text-[10px] shadow-sm ml-auto"
            disabled={!form.productId}
          >
            Add Mapping
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <RecordTableCard
          title="Product Wise Printer List"
          data={items}
          rowKey="productId"
          columns={[
            { header: "SNo", accessor: "productId", render: (_: any, index: number) => index + 1 },
            {
              header: "Product",
              accessor: "product",
              render: (row) =>
                row.product ||
                productOptions.find((p) => p.value === String(row.productId))?.label ||
                `Product #${row.productId}`,
            },
            { header: "First Printer", accessor: "firstPrinter" },
            { header: "Second Printer", accessor: "secondPrinter" },
            {
              header: "Actions",
              accessor: "productId",
              render: (row) => (
                <button
                  onClick={() => handleDelete(row.productId)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              ),
            },
          ]}
        />
      </div>

      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-4">
          <Button
            variant="primary"
            onClick={() => onSave(items)}
            loading={loading}
            className="px-12 uppercase tracking-widest font-black text-[10px]"
          >
            Save Product Routing
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteAll(true)}
            className="text-red-500 border-red-100 hover:bg-red-50"
            disabled={items.length === 0}
          >
            Delete All
          </Button>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Total Mappings: {items.length}
        </p>
      </div>

      <ConfirmDialog
        isOpen={showDeleteAll}
        title="Delete All Mappings"
        message="Are you sure you want to clear all product-wise printer settings? This cannot be undone."
        onConfirm={() => {
          setItems([]);
          setShowDeleteAll(false);
        }}
        onCancel={() => setShowDeleteAll(false)}
      />
    </div>
  );
};
