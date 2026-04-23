import { Button, FormInput } from "../../../../components/common";
import type { BranchRecord } from "../../../inventory/branches/types";
import { voucherTypeOptions } from "../constants";
import type { VoucherSeriesForm as VoucherSeriesFormType } from "../types";

interface VoucherSeriesFormProps {
  form: VoucherSeriesFormType;
  branches: BranchRecord[];
  isEditing: boolean;
  saving?: boolean;
  onChange: <K extends keyof VoucherSeriesFormType>(
    key: K,
    value: VoucherSeriesFormType[K]
  ) => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const VoucherSeriesForm = ({
  form,
  branches,
  isEditing,
  saving = false,
  onChange,
  onClear,
  onSave,
  onDelete,
}: VoucherSeriesFormProps) => {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-4">
        {/* VOUCHER TYPE */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Voucher Type</label>
          <select
            value={form.voucherType}
            onChange={(e) => onChange("voucherType", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[#49293e]/40 disabled:cursor-not-allowed disabled:bg-slate-50"
            autoFocus
          >
            <option value="">Select type</option>
            {voucherTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* NAME */}
        <FormInput
          label="Name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter voucher name"
        />

        {/* PREFIX */}
        <FormInput
          label="Prefix"
          value={form.prefix}
          onChange={(e) => onChange("prefix", e.target.value.toUpperCase())}
          placeholder="e.g. S-"
        />

        {/* START NO */}
        <FormInput
          label="Start No"
          type="number"
          value={form.startNo}
          onChange={(e) => onChange("startNo", e.target.value)}
          placeholder="1"
        />

        {/* BRANCH */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Branch Name</label>
          <select
            value={form.branchId}
            onChange={(e) => onChange("branchId", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[#49293e]/40 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">Select a branch</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.branchName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
        <Button variant="secondary" onClick={onClear} disabled={saving}>
          Clear
        </Button>
        <Button onClick={onSave} loading={saving}>
          {isEditing ? "Update" : "Save"}
        </Button>
        {isEditing && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
          >
            Delete Series
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoucherSeriesForm;

