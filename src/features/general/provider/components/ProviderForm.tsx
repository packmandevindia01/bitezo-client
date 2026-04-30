import React, { useState, useRef } from "react";
import { Building2, Camera, Loader2, Trash2, X } from "lucide-react";
import { Button, FormInput } from "../../../../components/common";
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
        {/* Main Form Fields */}
        <div className="flex flex-col gap-6">
          <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Provider Name</p>
            <FormInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter provider name"
              required
            />

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Paymode</p>
            <div className="relative">
              <select
                value={paymodeId}
                onChange={(e) => setPaymodeId(Number(e.target.value))}
                className="w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-700 outline-none transition-all focus:border-[#49293e] focus:bg-white focus:ring-1 focus:ring-[#49293e]/10"
                required
              >
                <option value={0} disabled>Select Paymode</option>
                {paymodeOptions.map((pm) => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </select>
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Delivery Status</p>
            <label className="flex cursor-pointer items-center gap-3 w-fit">
              <div
                role="switch"
                aria-checked={deliveryStatus}
                onClick={() => setDeliveryStatus(!deliveryStatus)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  deliveryStatus ? "bg-[#49293e]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                    deliveryStatus ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm font-bold text-gray-700">
                {deliveryStatus ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>

          {/* Branch Allocation Trigger */}
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              className="bg-[#f0e8ed] text-[#49293e] hover:bg-[#e7dbe2]"
              onClick={() => setAllocationOpen(!allocationOpen)}
            >
              <Building2 size={18} />
              Branch Allocation ({selectedBranches.length})
            </Button>
          </div>

          {/* Branch Allocation Panel */}
          {allocationOpen && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-[#49293e]/10 bg-[#49293e]/5 p-6">
              <p className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Select Branches</p>
              <div className="flex flex-wrap gap-2.5">
                {branchOptions.map((branch) => {
                  const active = selectedBranches.includes(branch.id);
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => toggleBranch(branch.id)}
                      className={`rounded-full border px-5 py-2 text-sm font-bold transition-all ${
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
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">Provider Image</p>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-48 w-full cursor-pointer overflow-hidden rounded-[2.5rem] border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-[#49293e]/30 hover:bg-white"
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
                <span className="text-xs font-bold uppercase tracking-widest">Upload Image</span>
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
      <div className="mt-8 flex items-center justify-end gap-4 border-t border-gray-100 pt-8">
        {initialData && onDelete && (
          <Button
            type="button"
            variant="danger"
            onClick={onDelete}
            disabled={submitting || deleting}
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Delete Provider
          </Button>
        )}
        <div className="flex gap-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : initialData ? (
              "Update Provider"
            ) : (
              "Create Provider"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ProviderForm;
