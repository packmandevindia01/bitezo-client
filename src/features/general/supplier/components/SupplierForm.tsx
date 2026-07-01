import React from "react";
import { Button, Checkbox, FormInput, SearchableSelect } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import { useSupplierForm } from "../hooks/useSupplierForm";
import type { Supplier, SupplierPayload } from "../types";
import { getDecimalPart } from "../../../../utils/currency";

interface Props {
  initialData?: Supplier | null;
  onSubmit?: (data: SupplierPayload) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
  onClear?: () => void;
}

const SupplierForm = ({
  initialData,
  onSubmit,
  submitting = false,
  onDelete,
  deleting = false,
  onClear,
}: Props) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    errors,
    branches,
    branchesLoading,
    isSubmitting,
    isDeleting,
    handleClear,
  } = useSupplierForm({
    initialData,
    onSubmitOverride: onSubmit,
    onClear,
  });

  const watchBranchId = watch("branchId");
  const watchIsActive = watch("isActive");
  const watchOpeningBalance = watch("openingBalance");

  return (
    <form className="flex flex-col w-full min-h-[55vh]" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 pb-16">
        <FormInput
          tabIndex={1}
          label="Supplier Code"
          required
          autoFocus
          {...register("code")}
          error={errors.code?.message}
        />
        
        <FormInput
          tabIndex={2}
          label="Supplier Name"
          required
          {...register("name")}
          error={errors.name?.message}
        />

        <FormInput
          tabIndex={3}
          label="Arabic Name"
          {...register("arabicName")}
        />

        <FormInput
          tabIndex={4}
          label="Mobile No"
          {...register("mobileNo")}
        />

        <FormInput
          tabIndex={5}
          label="Tel No"
          {...register("telNo")}
        />

        <FormInput
          tabIndex={6}
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
        />

        <div className="flex flex-col gap-1 w-full relative md:col-span-3">
          <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">
            Address
          </label>
          <textarea
            tabIndex={7}
            {...register("address")}
            className="w-full text-sm rounded-md border border-gray-300 bg-white px-4 py-2 outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 resize-none h-10.5"
            placeholder="Enter full address"
          />
        </div>

        <FormInput
          tabIndex={8}
          label="Area"
          {...register("area")}
        />

        <FormInput
          tabIndex={9}
          label="Identity No"
          {...register("identityNo")}
        />

        <FormInput
          tabIndex={10}
          label="TRN No"
          {...register("trnNo")}
        />

        <SearchableSelect
          tabIndex={11}
          label="Branch"
          required
          value={watchBranchId ? String(watchBranchId) : ""}
          onChange={(val) => setValue("branchId", Number(val), { shouldValidate: true })}
          disabled={branchesLoading}
          error={errors.branchId?.message}
          options={branches.map((b) => ({
            label: b.branchName,
            value: String(b.branchId),
          }))}
          placeholder={branchesLoading ? "Loading..." : "Select a branch"}
        />

        <FormInput
          tabIndex={12}
          label="Opening Balance"
          type="number"
          step={Math.pow(10, -getDecimalPart()).toString()}
          inputClassName="text-right"
          {...register("openingBalance")}
          error={errors.openingBalance?.message}
          placeholder={(0).toFixed(getDecimalPart())}
        />

        <div className="flex items-center h-10.5 mt-[18px]">
          <Checkbox
            tabIndex={13}
            label="Active"
            checked={watchIsActive}
            onChange={(e) => setValue("isActive", e.target.checked, { shouldValidate: true })}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white py-4 px-6 flex flex-wrap justify-end gap-3 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] rounded-b-xl border-t border-slate-100">
        <Button 
          type="button"
          variant="secondary" 
          onClick={handleClear} 
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>

        <Button 
          type="submit"
          loading={submitting || isSubmitting}
          isAction
          tabIndex={14}
          icon={<Save size={18} />}
        >
          {initialData ? "Update" : "Save"}
        </Button>

        {initialData && onDelete && (
          <Button 
            type="button"
            variant="danger" 
            onClick={onDelete} 
            loading={deleting || isDeleting} 
            tabIndex={-1}
            isAction
            icon={<Trash2 size={18} />}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
};

export default SupplierForm;
