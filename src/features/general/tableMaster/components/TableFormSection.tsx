import { Trash2, Loader2 } from "lucide-react";
import { MasterFieldRow, Button, FormInput } from "../../../../components/common";
import { statusOptions } from "../constants";
import type { TableForm } from "../types";

interface TableFormSectionProps {
  form: any;
  mode: "create" | "edit";
  loading: boolean;
  onSetField: <K extends keyof TableForm>(key: K, value: TableForm[K]) => void;
  onReset: () => void;
  onSave: () => void;
  onDeleteRequest?: () => void;
}

const TableFormSection = ({
  form,
  mode,
  loading,
  onSetField,
  onReset,
  onSave,
  onDeleteRequest
}: TableFormSectionProps) => {
  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-3xl border border-gray-100 bg-white p-6 shadow-md md:p-10">
      <div className="mb-10 flex items-center justify-between border-b border-gray-50 pb-4">
        <h2 className="text-xl font-bold uppercase tracking-wide text-[#49293e]">
          {mode === "edit" ? "Table Details" : "New Table"}
        </h2>
        <button 
          onClick={onReset}
          className="text-sm font-semibold text-gray-400 hover:text-[#49293e] transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      <div className="mx-auto max-w-xl space-y-2">
        <MasterFieldRow label="Table Name">
          <FormInput
            value={form.tableName}
            placeholder="e.g. T1"
            onChange={(e) => onSetField("tableName", e.target.value)}
            autoFocus
            disabled={loading}
          />
        </MasterFieldRow>

        <MasterFieldRow label="Chairs">
          <FormInput
            value={form.chairs}
            type="number"
            placeholder="Enter number of chairs"
            onChange={(e) => onSetField("chairs", e.target.value)}
            disabled={loading}
          />
        </MasterFieldRow>

        <MasterFieldRow label="Status">
          <div className="flex flex-col gap-1 mb-4 w-full">
            <select
              value={String(form.isActive)}
              onChange={(e) => onSetField("isActive", e.target.value === "true")}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
              disabled={loading}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </MasterFieldRow>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
          {mode === "edit" && onDeleteRequest && (
            <Button
              variant="danger"
              onClick={onDeleteRequest}
              disabled={loading}
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={onReset} 
            className="min-w-[120px]"
            disabled={loading}
          >
            Reset
          </Button>
          <Button onClick={onSave} className="min-w-[150px]" disabled={loading}>
            {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : null}
            {mode === "edit" ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TableFormSection;
