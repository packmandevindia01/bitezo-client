import { Trash2, Loader2, Minus, Plus, X } from "lucide-react";
import { Button, FormInput } from "../../../../components/common";
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
  const handleChairChange = (delta: number) => {
    const current = parseInt(String(form.chairs || 0));
    const next = Math.max(1, current + delta);
    onSetField("chairs", String(next));
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-3xl border border-gray-200 bg-white p-4 md:p-5 shadow-lg max-w-4xl mx-auto">
      <div className="mb-3 flex items-center justify-between border-b border-gray-50 pb-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#49293e]">
          {mode === "edit" ? "Edit Table" : "Register New Table"}
        </h2>
        <button 
          onClick={onReset}
          className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
          disabled={loading}
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Table Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">
            Table Name
          </label>
          <FormInput
            value={form.tableName}
            placeholder='e.g. "T1"'
            onChange={(e) => onSetField("tableName", e.target.value)}
            className="h-11 text-base font-bold !rounded-xl border-gray-200"
            autoFocus
            disabled={loading}
          />
        </div>

        {/* Chairs Stepper */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">
            Chairs
          </label>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleChairChange(-1)}
              disabled={loading || parseInt(String(form.chairs)) <= 1}
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-[#49293e] active:bg-gray-100 transition-colors disabled:opacity-30 shadow-sm"
            >
              <Minus size={18} />
            </button>
            <div className="flex-1">
              <FormInput
                value={form.chairs}
                type="number"
                placeholder="0"
                onChange={(e) => onSetField("chairs", e.target.value)}
                className="h-11 text-center text-base font-bold !rounded-xl border-gray-200"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => handleChairChange(1)}
              disabled={loading}
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-[#49293e] active:bg-gray-100 transition-colors disabled:opacity-30 shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">
            Status
          </label>
          <select
            value={String(form.isActive)}
            onChange={(e) => onSetField("isActive", e.target.value === "true")}
            className="h-11 w-full px-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 outline-none transition focus:border-[#49293e] focus:ring-2 focus:ring-[#49293e]/5 disabled:bg-gray-50 shadow-sm"
            disabled={loading}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-gray-50">
        <Button 
          variant="secondary" 
          onClick={onReset} 
          className="h-11 px-6 text-xs rounded-xl font-bold border-gray-200 shadow-sm"
          disabled={loading}
        >
          Clear
        </Button>
        <Button 
          onClick={onSave} 
          className="h-11 px-8 text-xs rounded-xl font-bold shadow-md bg-[#49293e] hover:bg-[#3a2131]"
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
          {mode === "edit" ? "Update Table" : "Save Table"}
        </Button>
        {mode === "edit" && onDeleteRequest && (
          <Button
            variant="danger"
            onClick={onDeleteRequest}
            disabled={loading}
            className="h-11 px-4 text-xs rounded-xl font-bold"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};

export default TableFormSection;
