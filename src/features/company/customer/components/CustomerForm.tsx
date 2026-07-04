import { Save, RotateCcw, Trash2 } from "lucide-react";
import { Button, Checkbox, FormInput, SelectInput } from "../../../../components/common";
import type { Customer } from "../types";
import { useCustomerForm } from "../hooks/useCustomerForm";
import { useEnterKeyNavigation } from "../../../../hooks/useEnterKeyNavigation";

interface Props {
  initialData?: Customer | null;
  onSubmit: (customer: Customer) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
  onClear?: () => void;
}

const CustomerForm = ({
  initialData,
  onSubmit,
  submitting = false,
  onDelete,
  deleting = false,
  onClear,
}: Props) => {
  const { form, handleSubmit } = useCustomerForm({
    initialData,
    onSubmit,
  });

  const { register, watch, setValue, formState: { errors } } = form;
  const handleKeyDown = useEnterKeyNavigation();

  const handleClear = () => {
    form.reset();
    if (onClear) onClear();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 py-2 px-1">
        {/* Customer Code - Read Only */}
        <FormInput
          id="cust-code"
          label="Customer Code"
          placeholder="AUTO"
          readOnly
          tabIndex={-1}
          {...register("customerCode")}
        />

        {/* Address */}
        <div className="flex flex-col gap-1 w-full relative">
          <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5 min-w-0">
            Address
            {errors.address && (
              <span className="text-[10px] text-red-500 font-bold ml-2 normal-case truncate shrink">
                ({(errors.address as any).message})
              </span>
            )}
          </label>
          <textarea
            id="cust-address"
            placeholder="Enter full address"
            tabIndex={2}
            {...register("address")}
            onKeyDown={(e) => handleKeyDown(e, "cust-area")}
            className={`w-full px-4 py-2 text-sm rounded-md border outline-none transition resize-none h-[42px] ${
              errors.address ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"
            } focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20`}
          />
        </div>

        {/* Customer Name */}
        <FormInput
          id="cust-name"
          label="Customer Name"
          required
          autoFocus
          placeholder="Enter customer name"
          tabIndex={1}
          {...register("customerName")}
          error={(errors.customerName as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-arabic")}
        />

        {/* Area */}
        <FormInput
          id="cust-area"
          label="Area"
          placeholder="Enter area"
          tabIndex={4}
          {...register("area")}
          error={(errors.area as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-building")}
        />

        {/* Arabic Name */}
        <FormInput
          id="cust-arabic"
          label="Arabic Name"
          placeholder="Enter arabic name"
          tabIndex={3}
          inputClassName="text-right font-arabic"
          {...register("arabicName")}
          error={(errors.arabicName as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-mobile")}
        />

        {/* Building No */}
        <FormInput
          id="cust-building"
          label="Building No"
          placeholder="Enter building no"
          tabIndex={6}
          {...register("buildingNo")}
          error={(errors.buildingNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-flat")}
        />

        {/* Mobile No */}
        <FormInput
          id="cust-mobile"
          label="Mobile No"
          required
          placeholder="Enter mobile number"
          tabIndex={5}
          {...register("mobileNo")}
          error={(errors.mobileNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-tel")}
        />

        {/* Flat No */}
        <FormInput
          id="cust-flat"
          label="Flat No"
          placeholder="Enter flat no"
          tabIndex={8}
          {...register("flatNo")}
          error={(errors.flatNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-block")}
        />

        {/* Tel No */}
        <FormInput
          id="cust-tel"
          label="Tel No"
          placeholder="Enter tel number"
          tabIndex={7}
          {...register("telNo")}
          error={(errors.telNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-email")}
        />

        {/* Block No */}
        <FormInput
          id="cust-block"
          label="Block No"
          placeholder="Enter block no"
          tabIndex={10}
          {...register("blockNo")}
          error={(errors.blockNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-road")}
        />

        {/* Email */}
        <FormInput
          id="cust-email"
          label="Email"
          type="email"
          placeholder="Enter email address"
          tabIndex={9}
          {...register("email")}
          error={(errors.email as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-id-no")}
        />

        {/* Road No */}
        <FormInput
          id="cust-road"
          label="Road No"
          placeholder="Enter road no"
          tabIndex={12}
          {...register("roadNo")}
          error={(errors.roadNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-branch")}
        />

        {/* Identity No */}
        <FormInput
          id="cust-id-no"
          label="Identity No"
          placeholder="Enter identity number"
          tabIndex={11}
          {...register("identityNo")}
          error={(errors.identityNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-trn")}
        />

        {/* Branch */}
        <SelectInput
          id="cust-branch"
          label="Branch"
          placeholder="Select Branch..."
          tabIndex={14}
          options={[{ label: "Main Branch", value: "main" }]}
          {...register("branch")}
          error={(errors.branch as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-balance")}
        />

        {/* TRN No */}
        <FormInput
          id="cust-trn"
          label="TRN No"
          placeholder="Enter TRN number"
          tabIndex={13}
          {...register("trnNo")}
          error={(errors.trnNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-address")}
        />

        {/* Opening Balance */}
        <FormInput
          id="cust-balance"
          label="Opening Balance"
          type="number"
          placeholder="0.000"
          tabIndex={15}
          inputClassName="text-right"
          {...register("openingBalance")}
          error={(errors.openingBalance as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-save-btn")}
        />

        <div className="md:col-span-2 mt-2">
          <Checkbox
            label="Active"
            checked={watch("isActive")}
            tabIndex={16}
            onChange={(e) => setValue("isActive", e.target.checked)}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
        <Button 
          variant="secondary" 
          onClick={handleClear} 
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>

        <Button 
          id="cust-save-btn"
          onClick={handleSubmit} 
          loading={submitting}
          isAction
          tabIndex={17}
          icon={<Save size={18} />}
        >
          {initialData ? "Update" : "Save"}
        </Button>

        {initialData && onDelete && (
          <Button 
            variant="danger" 
            onClick={onDelete} 
            loading={deleting}
            isAction
            tabIndex={18}
            icon={<Trash2 size={18} />}
          >
            Delete
          </Button>
        )}
      </div>
    </>
  );
};

export default CustomerForm;
