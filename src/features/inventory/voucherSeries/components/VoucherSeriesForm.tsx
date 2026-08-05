import { FormInput, SelectInput } from "../../../../components/common";
import type { BranchRecord } from "../../../inventory/branches/types";
import { voucherTypeOptions } from "../constants";
import type { VoucherSeriesForm as VoucherSeriesFormType } from "../types";

interface VoucherSeriesFormProps {
  form: VoucherSeriesFormType;
  errors?: Partial<Record<keyof VoucherSeriesFormType, string>>;
  branches: BranchRecord[];
  saving?: boolean;
  onChange: <K extends keyof VoucherSeriesFormType>(
    key: K,
    value: VoucherSeriesFormType[K]
  ) => void;
}

const VoucherSeriesForm = ({
  form,
  errors,
  branches,
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
          error={errors?.voucherType}
          autoFocus
        />

        <FormInput
          label="Name"
          value={form.name}
          maxLength={50}
          onChange={(e) => onChange("name", e.target.value.slice(0, 50))}
          placeholder="Enter voucher name"
          required
          disabled={saving}
          error={errors?.name}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Prefix"
            value={form.prefix}
            maxLength={10}
            onChange={(e) => onChange("prefix", e.target.value.toUpperCase().slice(0, 10))}
            placeholder="e.g. S-"
            disabled={saving}
            error={errors?.prefix}
          />

          <FormInput
            label="Start No"
            type="number"
            value={form.startNo}
            maxLength={9}
            onChange={(e) => onChange("startNo", e.target.value.slice(0, 9))}
            placeholder="1"
            required
            disabled={saving}
            error={errors?.startNo}
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
          error={errors?.branchId}
        />
      </div>
    </div>
  );
};

export default VoucherSeriesForm;

