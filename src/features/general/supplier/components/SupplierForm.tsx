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

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) document.getElementById(nextId)?.focus();
    }
  };


  return (
    <form className="flex flex-col w-full min-h-[55vh]" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 pb-16">
        <FormInput
          id="supplier-code"
          tabIndex={1}
          label="Supplier Code"
          required
          autoFocus
          {...register("code")}
          error={errors.code?.message}
          onKeyDown={(e) => hk(e, "supplier-name")}
        />
        
        <FormInput
          id="supplier-name"
          tabIndex={2}
          label="Supplier Name"
          required
          {...register("name")}
          error={errors.name?.message}
          onKeyDown={(e) => hk(e, "supplier-arabicName")}
        />

        <FormInput
          id="supplier-arabicName"
          tabIndex={3}
          label="Arabic Name"
          {...register("arabicName")}
          onKeyDown={(e) => hk(e, "supplier-mobileNo")}
        />

        <FormInput
          id="supplier-mobileNo"
          tabIndex={4}
          label="Mobile No"
          {...register("mobileNo")}
          onKeyDown={(e) => hk(e, "supplier-telNo")}
        />

        <FormInput
          id="supplier-telNo"
          tabIndex={5}
          label="Tel No"
          {...register("telNo")}
          onKeyDown={(e) => hk(e, "supplier-email")}
        />

        <FormInput
          id="supplier-email"
          tabIndex={6}
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          onKeyDown={(e) => hk(e, "supplier-address")}
        />

        <div className="flex flex-col gap-1 w-full relative md:col-span-3">
          <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">
            Address
          </label>
          <textarea
            id="supplier-address"
            tabIndex={7}
            {...register("address")}
            className="w-full text-sm rounded-md border border-gray-300 bg-white px-4 py-2 outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 resize-none h-10.5"
            placeholder="Enter full address"
            onKeyDown={(e) => hk(e, "supplier-area")}
          />
        </div>

        <FormInput
          id="supplier-area"
          tabIndex={8}
          label="Area"
          {...register("area")}
          onKeyDown={(e) => hk(e, "supplier-identityNo")}
        />

        <FormInput
          id="supplier-identityNo"
          tabIndex={9}
          label="Identity No"
          {...register("identityNo")}
          onKeyDown={(e) => hk(e, "supplier-trnNo")}
        />

        <FormInput
          id="supplier-trnNo"
          tabIndex={10}
          label="TRN No"
          {...register("trnNo")}
          onKeyDown={(e) => hk(e, "supplier-branch")}
        />

        <SearchableSelect
          id="supplier-branch"
          tabIndex={11}
          label="Branch"
          required
          value={watchBranchId ? String(watchBranchId) : ""}
          onChange={(val) => setValue("branchId", Number(val), { shouldValidate: true })}
          onKeyDown={(e) => hk(e, "supplier-openingBalance")}
          disabled={branchesLoading}
          error={errors.branchId?.message}
          options={branches.map((b) => ({
            label: b.branchName,
            value: String(b.branchId),
          }))}
          placeholder={branchesLoading ? "Loading..." : "Select a branch"}
        />

        <FormInput
          id="supplier-openingBalance"
          tabIndex={12}
          label="Opening Balance"
          type="number"
          step={Math.pow(10, -getDecimalPart()).toString()}
          inputClassName="text-right"
          {...register("openingBalance")}
          error={errors.openingBalance?.message}
          placeholder={(0).toFixed(getDecimalPart())}
          onKeyDown={(e) => hk(e, "supplier-save-btn")}
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
          id="supplier-save-btn"
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
