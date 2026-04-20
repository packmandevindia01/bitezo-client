import { Trash2 } from "lucide-react";
import { Button, FormInput, SelectInput } from "../../../../components/common";
import { voucherBranchOptions, voucherTypeOptions } from "../constants";
import type { VoucherSeriesForm as VoucherSeriesFormType } from "../types";

interface VoucherSeriesFormProps {
  form: VoucherSeriesFormType;
  isEditing: boolean;
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
  isEditing,
  onChange,
  onClear,
  onSave,
  onCancel,
  onDelete,
}: VoucherSeriesFormProps) => {
  return (
    <>
      <h2 className="mb-6 text-center text-lg font-bold">VOUCHER SERIES</h2>

      <div className="flex max-w-md flex-col gap-4">
        <SelectInput
          label="Voucher Type"
          options={voucherTypeOptions}
          value={form.voucherType}
          placeholder="Select voucher type"
          onChange={(e) => onChange("voucherType", e.target.value)}
          autoFocus
        />

        <FormInput
          label="Name"
          required
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
        />

        <FormInput
          label="Prefix"
          value={form.prefix}
          onChange={(e) => onChange("prefix", e.target.value.toUpperCase())}
        />

        <FormInput
          label="Start No"
          type="number"
          value={form.startNo}
          onChange={(e) => onChange("startNo", e.target.value)}
        />

        <SelectInput
          label="Branch"
          options={voucherBranchOptions}
          value={form.branch}
          placeholder="Select branch"
          onChange={(e) => onChange("branch", e.target.value)}
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
        {isEditing && (
          <Button
            variant="danger"
            onClick={onDelete}
            className="mr-auto"
          >
            <Trash2 size={16} />
            Delete Series
          </Button>
        )}
        <Button variant="secondary" onClick={onClear}>
          Clear
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>{isEditing ? "Update" : "Save"}</Button>
      </div>
    </>
  );
};

export default VoucherSeriesForm;

