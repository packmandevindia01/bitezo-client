import { useRef } from "react";
import { Save, RotateCcw, Trash2, Camera, X } from "lucide-react";
import { handleFocusNextInput } from "../../../../utils/keyboard";
import { Button, FormInput, Modal, Checkbox, SearchableSelect } from "../../../../components/common";
import { BranchAllocationSelect } from "./BranchAllocationSelect";
import type { UseFormReturn } from "react-hook-form";
import type { ProviderFormType } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: UseFormReturn<ProviderFormType>;
  saving: boolean;
  selectedBranchIds: number[];
  branchOptions: { id: number; name: string }[];
  paymodeOptions: { id: number; name: string }[];
  accountOptions: { id: number; name: string }[];
  imagePreview: string;
  onClose: () => void;
  onImageChange: (file: File | null) => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const ProviderModal = ({
  isOpen,
  editingId,
  form,
  saving,
  selectedBranchIds,
  branchOptions,
  paymodeOptions,
  accountOptions,
  imagePreview,
  onClose,
  onImageChange,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const { register, formState: { errors } } = form;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onImageChange(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Provider" : "Add Provider"}
      size="2xl"
      footer={
        <div className="flex gap-3">
          <Button 
            type="button"
            variant="secondary" 
            onClick={onClear} 
            disabled={saving} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            type="button"
            onClick={onSave} 
            disabled={saving}
            isAction
            loading={saving}
            icon={<Save size={18} />}
          >
            {editingId ? "Update" : "Save"}
          </Button>
          {editingId && onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              disabled={saving}
              isAction
              icon={<Trash2 size={18} />}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <form 
        onSubmit={(e) => { e.preventDefault(); onSave(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const target = e.target as HTMLElement;
            if (target.tagName !== "BUTTON" && target.tagName !== "TEXTAREA") {
              e.preventDefault();
              handleFocusNextInput(target);
            }
          }
        }}
        className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6"
      >
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[1fr_200px]">
          {/* Main Form Fields */}
          <div className="flex flex-col gap-4">
            {/* Provider Name */}
            <FormInput
              label="Provider Name"
              required
              tabIndex={1}
              maxLength={20}
              {...register("providerName")}
              placeholder="Enter provider name"
              autoFocus
              error={errors.providerName?.message}
            />

            {/* Paymode */}
            <SearchableSelect
              label="Paymode"
              required
              tabIndex={2}
              value={String(form.watch("paymodeId") || "")}
              onChange={(val) => form.setValue("paymodeId", Number(val), { shouldDirty: true, shouldValidate: true })}
              error={errors.paymodeId?.message}
              placeholder="Select Paymode"
              options={paymodeOptions.map((pm: any) => ({
                value: String(pm.id ?? pm.paymodeId ?? ""),
                label: String(pm.name ?? pm.paymodeName ?? ""),
              }))}
            />

            {/* Post Account */}
            <SearchableSelect
              label="Post Account"
              required
              tabIndex={3}
              value={String(form.watch("postAccountId") || "")}
              onChange={(val) => form.setValue("postAccountId", Number(val) || 0, { shouldDirty: true, shouldValidate: true })}
              error={errors.postAccountId?.message}
              placeholder="Select Post Account"
              options={accountOptions.map((acc: any) => ({
                value: String(acc.id ?? acc.customerId ?? ""),
                label: String(acc.name ?? acc.customerName ?? ""),
              }))}
            />

            {/* Branch Allocation Dropdown */}
            <BranchAllocationSelect
              id="prov-branch-select"
              branchOptions={branchOptions}
              selectedIds={selectedBranchIds}
              disabled={saving}
              error={errors.branchIds?.message}
              tabIndex={4}
              onChange={(ids) => form.setValue("branchIds", ids, { shouldDirty: true, shouldValidate: true })}
            />

            {/* Delivery Status */}
            <div className="flex flex-col gap-1 w-full mt-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Delivery Status
              </span>
              <div className="flex items-center h-10">
                <Checkbox
                  tabIndex={5}
                  checked={form.watch("deliveryStatus")}
                  onChange={(e) => form.setValue("deliveryStatus", e.target.checked, { shouldDirty: true, shouldValidate: true })}
                  label={form.watch("deliveryStatus") ? "Delivery Enabled" : "Delivery Disabled"}
                />
              </div>
            </div>
          </div>

          {/* Image Upload Column */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 self-start">
              Provider Image
            </span>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-40 w-full cursor-pointer overflow-hidden rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-[#49293e]/30 hover:bg-white"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="text-white" size={32} />
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                  <Camera size={32} strokeWidth={1.5} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Upload</span>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>
            {imagePreview && (
              <button
                type="button"
                onClick={() => onImageChange(null)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline mt-1"
              >
                <X size={12} /> Remove
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ProviderModal;
