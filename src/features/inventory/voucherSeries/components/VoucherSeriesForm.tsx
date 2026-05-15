import { FormInput, SelectInput } from "../../../../components/common";
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
}

const VoucherSeriesForm = ({
  form,
  branches,
  isEditing,
  saving = false,
  onChange,
}: VoucherSeriesFormProps) => {
  const branchOptions = branches.map((b) => ({
    label: b.branchName,
    value: String(b.id),
  }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 gap-2">
        <SelectInput
          label="Voucher Type"
          options={voucherTypeOptions}
          value={form.voucherType}
          onChange={(e) => onChange("voucherType", e.target.value)}
          placeholder="Select voucher type"
          required
          disabled={saving}
          autoFocus
        />

        <FormInput
          label="Name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter voucher name"
          required
          disabled={saving}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Prefix"
            value={form.prefix}
            onChange={(e) => onChange("prefix", e.target.value.toUpperCase())}
            placeholder="e.g. S-"
            disabled={saving}
          />

          <FormInput
            label="Start No"
            type="number"
            value={form.startNo}
            onChange={(e) => onChange("startNo", e.target.value)}
            placeholder="1"
            required
            disabled={saving}
          />
        </div>

        <SelectInput
          label="Branch Name"
          options={branchOptions}
          value={form.branchId}
          onChange={(e) => onChange("branchId", e.target.value)}
          placeholder="Select a branch"
          required
          disabled={saving}
        />
      </div>
    </div>
  );
};

export default VoucherSeriesForm;

