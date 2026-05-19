import React, { useState, useRef } from "react";
import { Building2, Camera, Trash2, X, RotateCcw, Save } from "lucide-react";
import { Button, FormInput, Checkbox, SelectInput } from "../../../../components/common";
import type { ProviderPayload } from "../types";

interface BranchOption {
  id: number;
  name: string;
}

interface Props {
  initialData?: (ProviderPayload & { providerId?: number; fileUrl?: string }) | null;
  onSubmit: (data: ProviderPayload) => void;

  onCancel: () => void;
  onDelete?: () => void;
  submitting?: boolean;
  deleting?: boolean;
  branchOptions: BranchOption[];
  paymodeOptions: { id: number; name: string }[];
}

const ProviderForm: React.FC<Props> = ({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  submitting = false,
  deleting = false,
  branchOptions,
  paymodeOptions,
}) => {
  const [name, setName] = useState(initialData?.providerName || "");
  const [paymodeId, setPaymodeId] = useState<number>(initialData?.paymodeId || 0);
  const [deliveryStatus, setDeliveryStatus] = useState(
    initialData?.deliveryStatus === true
  );
  const [selectedBranches, setSelectedBranches] = useState<number[]>(
    initialData?.branchIds || []
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.fileUrl || "");
  const [allocationOpen, setAllocationOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleBranch = (branchId: number) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      providerId: initialData?.providerId,
      providerName: name,
      paymodeId,
      deliveryStatus,
      createdAt: initialData?.createdAt,
      imageFile: imageFile || undefined,
      branchIds: selectedBranches,
    });
  };


  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[1fr_240px]">
        {/* Main Form Fields */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            <FormInput
              label="Provider Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter provider name"
              required
              autoFocus
            />

            <SelectInput
              label="Paymode"
              value={String(paymodeId)}
              onChange={(e) => setPaymodeId(Number(e.target.value))}
              required
              options={[
                { value: "0", label: "Select Paymode", disabled: true },
                ...paymodeOptions.map((pm) => ({ value: String(pm.id), label: pm.name })),
              ]}
            />

            <div className="flex flex-col gap-1 mb-1 w-full">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Delivery Status
              </span>
              <div className="flex items-center h-10.5">
                <Checkbox
                  checked={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.checked)}
                  label={deliveryStatus ? "Delivery Enabled" : "Delivery Disabled"}
                />
              </div>
            </div>

            {/* Branch Allocation Trigger */}
            <div className="flex flex-col gap-1 mb-1 w-full">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Branch Allocation
              </span>
              <Button
                type="button"
                variant="secondary"
                className="bg-[#f0e8ed] text-[#49293e] hover:bg-[#e7dbe2] w-full h-10.5 justify-center font-bold"
                onClick={() => setAllocationOpen(!allocationOpen)}
                icon={<Building2 size={18} />}
              >
                Branch Allocation
              </Button>
            </div>
          </div>

          {/* Branch Allocation Panel */}
          {allocationOpen && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-[#49293e]/10 bg-[#49293e]/5 p-6">
              <p className="text-[10px] font-bold text-gray-800 uppercase tracking-widest mb-4">Select Branches</p>
              <div className="flex flex-wrap gap-2.5">
                {branchOptions.map((branch) => {
                  const active = selectedBranches.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => toggleBranch(branch.id)}
                      className={`rounded-full border px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        active
                          ? "border-[#49293e] bg-[#49293e] text-white shadow-md scale-105"
                          : "border-gray-200 bg-white text-gray-500 hover:border-[#49293e]/30 hover:bg-gray-50"
                      }`}
                    >
                      {branch.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Image Upload Column */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Provider Image</p>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-48 w-full cursor-pointer overflow-hidden rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-[#49293e]/30 hover:bg-white"
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
                <Camera size={40} strokeWidth={1.5} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Upload Image</span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
            />
          </div>
          {imagePreview && (
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(""); }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
            >
              <X size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
        {initialData && onDelete && (
          <Button
            type="button"
            variant="danger"
            onClick={onDelete}
            disabled={submitting || deleting}
            isAction
            icon={<Trash2 size={18} />}
          >
            Delete
          </Button>
        )}
        <Button 
          type="button" 
          variant="secondary" 
          onClick={onCancel} 
          disabled={submitting} 
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>
        <Button 
          type="submit" 
          disabled={submitting}
          isAction
          loading={submitting}
          icon={<Save size={18} />}
        >
          {initialData ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );
};

export default ProviderForm;
