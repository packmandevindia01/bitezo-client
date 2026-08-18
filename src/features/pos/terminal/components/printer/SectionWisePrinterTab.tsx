import React, { useState, useEffect } from "react";
import { SelectInput, Button, RecordTableCard, ConfirmDialog } from "../../../../../components/common";
import { Trash2 } from "lucide-react";
import type { SectionPrinterSetting } from "../../../types";
import { dineInApi } from "../../../services/dineInApi";
import { useAvailablePrinters } from "../../hooks/useAvailablePrinters";

interface SectionWisePrinterTabProps {
  initialData: SectionPrinterSetting[];
  onSave: (data: SectionPrinterSetting[]) => void;
  loading?: boolean;
}

export const SectionWisePrinterTab: React.FC<SectionWisePrinterTabProps> = ({
  initialData,
  onSave,
  loading,
}) => {
  const { printerOptions } = useAvailablePrinters();
  const [items, setItems] = useState<SectionPrinterSetting[]>(initialData);
  const [form, setForm] = useState({
    sectionId: "",
    firstPrinter: "No Printer",
    secondPrinter: "No Printer",
  });
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [sectionOptions, setSectionOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  useEffect(() => {
    if (printerOptions.length > 1 && form.firstPrinter === "No Printer") {
      setForm((prev) => ({
        ...prev,
        firstPrinter: printerOptions[1].value,
      }));
    }
  }, [printerOptions]);

  useEffect(() => {
    dineInApi
      .getSections()
      .then((response) => {
        if (response.isSuccess && response.data) {
          setSectionOptions(response.data.map((s: any) => ({ label: s.sectionName, value: String(s.sectionId) })));
        }
      })
      .catch(console.error);
  }, []);

  const handleAdd = () => {
    if (!form.sectionId) return;
    const section = sectionOptions.find((s) => s.value === form.sectionId);
    const newItem: SectionPrinterSetting = {
      sectionId: parseInt(form.sectionId),
      section: section?.label,
      firstPrinter: form.firstPrinter,
      secondPrinter: form.secondPrinter,
    };

    if (items.some((i) => i.sectionId === newItem.sectionId)) {
      setItems(items.map((i) => (i.sectionId === newItem.sectionId ? newItem : i)));
    } else {
      setItems([newItem, ...items]);
    }

    setForm({ ...form, sectionId: "" });
  };

  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.sectionId !== id));
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3 min-w-[280px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">
              Section
            </label>
            <div className="flex-1">
              <SelectInput
                autoFocus={window.innerWidth > 1024}
                noMargin
                options={sectionOptions}
                value={form.sectionId}
                onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
                placeholder="Select Section"
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
            disabled={!form.sectionId}
          >
            Add Mapping
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <RecordTableCard
          title="Section Wise Printer List"
          data={items}
          rowKey="sectionId"
          columns={[
            { header: "SNo", accessor: "sectionId", render: (_: any, index: number) => index + 1 },
            {
              header: "Section",
              accessor: "section",
              render: (row) =>
                row.section ||
                sectionOptions.find((s) => s.value === String(row.sectionId))?.label ||
                `Section #${row.sectionId}`,
            },
            { header: "First Printer", accessor: "firstPrinter" },
            { header: "Second Printer", accessor: "secondPrinter" },
            {
              header: "Actions",
              accessor: "sectionId",
              render: (row) => (
                <button
                  onClick={() => handleDelete(row.sectionId)}
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
            Save Section Routing
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
        message="Are you sure you want to clear all section-wise printer settings? This cannot be undone."
        onConfirm={() => {
          setItems([]);
          setShowDeleteAll(false);
        }}
        onCancel={() => setShowDeleteAll(false)}
      />
    </div>
  );
};
