import { useState } from "react";
import { Button, Checkbox, FormInput, SelectInput } from "../../../../components/common";
import { isRequired } from "../../../../lib/validators";
import type { Customer } from "../../../pos/customer/types/customer";

interface Props {
  initialData?: Customer | null;
  onSubmit: (customer: Customer) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
  onClear?: () => void;
}

const createInitialForm = (initialData?: Customer | null): Customer => ({
  id: initialData?.id,
  customerCode: initialData?.customerCode ?? "",
  customerName: initialData?.customerName ?? "",
  arabicName: initialData?.arabicName ?? "",
  mobileNo: initialData?.mobileNo ?? "",
  telNo: initialData?.telNo ?? "",
  email: initialData?.email ?? "",
  address: initialData?.address ?? "",
  area: initialData?.area ?? "",
  flatNo: initialData?.flatNo ?? "",
  buildingNo: initialData?.buildingNo ?? "",
  blockNo: initialData?.blockNo ?? "",
  roadNo: initialData?.roadNo ?? "",
  identityNo: initialData?.identityNo ?? "",
  trnNo: initialData?.trnNo ?? "",
  branch: initialData?.branch ?? "",
  openingBalance: initialData?.openingBalance ?? "",
  isActive: initialData?.isActive ?? true,
});

const CustomerForm = ({
  initialData,
  onSubmit,
  submitting = false,
  onDelete,
  deleting = false,
  onClear,
}: Props) => {
  const [form, setForm] = useState<Customer>(() => createInitialForm(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof Customer, string>>>({});

  const handleChange = <K extends keyof Customer>(key: K, value: Customer[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleClear = () => {
    setForm(createInitialForm(null));
    setErrors({});
    if (onClear) onClear();
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!isRequired(form.customerName)) newErrors.customerName = "Customer name is required";
    if (!isRequired(form.mobileNo)) newErrors.mobileNo = "Mobile number is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-1 py-2 px-1">
        <FormInput
          label="Customer Code"
          value={form.customerCode}
          onChange={(e) => handleChange("customerCode", e.target.value.toUpperCase())}
          placeholder="AUTO"
          readOnly
        />
        <FormInput
          label="Customer Name"
          required
          autoFocus
          value={form.customerName}
          onChange={(e) => handleChange("customerName", e.target.value)}
          error={errors.customerName}
        />
        <FormInput
          label="Arabic Name"
          value={form.arabicName}
          onChange={(e) => handleChange("arabicName", e.target.value)}
          inputClassName="text-right font-arabic"
        />
        <FormInput
          label="Mobile No"
          required
          value={form.mobileNo}
          onChange={(e) => handleChange("mobileNo", e.target.value)}
          error={errors.mobileNo}
        />
        <FormInput
          label="Tel No"
          value={form.telNo}
          onChange={(e) => handleChange("telNo", e.target.value)}
        />
        <FormInput
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        <FormInput
          label="Identity No"
          value={form.identityNo}
          onChange={(e) => handleChange("identityNo", e.target.value)}
        />
        <FormInput
          label="TRN No"
          value={form.trnNo}
          onChange={(e) => handleChange("trnNo", e.target.value)}
        />

        {/* Address Full Width on mobile/tablet, 2 cols on lg+ */}
        <div className="md:col-span-2 lg:col-span-2 flex flex-col gap-1 mb-4 w-full">
          <label className="text-xs md:text-sm font-medium text-gray-700">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 resize-none h-[42px]"
            placeholder="Enter full address"
          />
        </div>

        <FormInput
          label="Area"
          value={form.area}
          onChange={(e) => handleChange("area", e.target.value)}
        />
        <FormInput
          label="Building No"
          value={form.buildingNo}
          onChange={(e) => handleChange("buildingNo", e.target.value)}
        />
        <FormInput
          label="Flat No"
          value={form.flatNo}
          onChange={(e) => handleChange("flatNo", e.target.value)}
        />
        <FormInput
          label="Block No"
          value={form.blockNo}
          onChange={(e) => handleChange("blockNo", e.target.value)}
        />
        <FormInput
          label="Road No"
          value={form.roadNo}
          onChange={(e) => handleChange("roadNo", e.target.value)}
        />
        <SelectInput
          label="Branch"
          value={form.branch}
          onChange={(e) => handleChange("branch", e.target.value)}
          options={[{ label: "Select Branch...", value: "" }, { label: "Main Branch", value: "main" }]}
        />
        <FormInput
          label="Opening Balance"
          type="number"
          value={form.openingBalance}
          onChange={(e) => handleChange("openingBalance", e.target.value)}
          inputClassName="text-right"
        />

        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 mt-2">
          <Checkbox
            label="Active"
            checked={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
        <Button variant="secondary" className="h-10 w-20" onClick={handleClear}>
          Clear
        </Button>

        <Button className="h-10 w-24 bg-[#49293e] hover:bg-[#3a2131]" onClick={handleSubmit} loading={submitting}>
          {initialData ? "Update" : "Save"}
        </Button>

        {initialData && onDelete && (
          <Button variant="danger" onClick={onDelete} loading={deleting}>
            Delete
          </Button>
        )}
      </div>
    </>
  );
};

export default CustomerForm;
