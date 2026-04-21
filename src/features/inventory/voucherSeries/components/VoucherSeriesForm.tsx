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
  onCancel: () => void;
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
  onCancel,
  onDelete,
}: VoucherSeriesFormProps) => {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-8 text-center text-xl font-bold text-[#49293e]">VOUCHER SERIES</h2>

      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        {/* VOUCHER TYPE */}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Voucher Type
        </p>
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

        {/* NAME */}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Name
        </p>
        <FormInput
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter voucher name"
        />

        {/* PREFIX */}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Prefix
        </p>
        <FormInput
          value={form.prefix}
          onChange={(e) => onChange("prefix", e.target.value.toUpperCase())}
          placeholder="e.g. S-"
        />

        {/* START NO */}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Start No
        </p>
        <FormInput
          type="number"
          value={form.startNo}
          onChange={(e) => onChange("startNo", e.target.value)}
          placeholder="1"
        />

        {/* BRANCH */}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Branch Name
        </p>
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

      <div className="mt-8 flex flex-wrap gap-3">
        {isEditing && (
          <Button
            variant="danger"
            onClick={onDelete}
            className="mr-auto"
            disabled={saving}
          >
            Delete Series
          </Button>
        )}
        <Button variant="secondary" onClick={onClear} disabled={saving}>
          Clear
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} loading={saving}>
          {isEditing ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default VoucherSeriesForm;

