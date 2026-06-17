import { useEffect, useState } from "react";
import { Button, Checkbox, FormInput, SearchableSelect } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import { isRequired } from "../../../../lib/validators";
import type { Supplier, SupplierPayload } from "../types";
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";

interface Branch {
  branchId: number;
  branchName: string;
}

interface Props {
  initialData?: Supplier | null;
  onSubmit: (data: SupplierPayload) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
  onClear?: () => void;
}

const createInitialForm = (initialData?: Supplier | null): SupplierPayload => ({
  code: initialData?.code ?? "",
  name: initialData?.name ?? "",
  arabicName: initialData?.arabicName ?? "",
  mobileNo: initialData?.mobileNo ?? "",
  telNo: initialData?.telNo ?? "",
  email: initialData?.email ?? "",
  address: initialData?.address ?? "",
  area: initialData?.area ?? "",
  identityNo: initialData?.identityNo ?? "",
  trnNo: initialData?.trnNo ?? "",
  branchId: initialData?.branchId ?? 0,
  openingBalance: initialData?.openingBalance ?? 0,
  isActive: initialData?.isActive ?? true,
});

const SupplierForm = ({
  initialData,
  onSubmit,
  submitting = false,
  onDelete,
  deleting = false,
  onClear,
}: Props) => {
  const [form, setForm] = useState<SupplierPayload>(() => createInitialForm(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierPayload, string>>>({});
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranchesLoading(true);
        const { data } = await axiosInstance.get<ApiResponse<Branch[]>>("/Branch/true/list-name");
        setBranches(data.data ?? []);
      } catch {
        setBranches([]);
      } finally {
        setBranchesLoading(false);
      }
    };
    fetchBranches();
  }, []);

  const handleChange = <K extends keyof SupplierPayload>(key: K, value: SupplierPayload[K]) => {
    setForm((prev) => {
      let val = value;
      // Enforce uppercase and no spaces for code
      if (key === "code" && typeof val === "string") {
        val = val.toUpperCase().replace(/\s/g, "") as SupplierPayload[K];
      }
      return { ...prev, [key]: val };
    });
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleClear = () => {
    setForm(createInitialForm(null));
    setErrors({});
    if (onClear) onClear();
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!isRequired(form.code)) newErrors.code = "Code is required";
    if (!isRequired(form.name)) newErrors.name = "Name is required";
    if (!form.branchId || form.branchId <= 0) newErrors.branchId = "Branch is required";
    
    // Optional basic email validation
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    const payload: SupplierPayload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      branchId: Number(form.branchId),
      openingBalance: Number(form.openingBalance) || 0,
    };

    await onSubmit(payload);
  };

  return (
    <form className="flex flex-col w-full min-h-[55vh]" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 pb-16">
        <FormInput
          tabIndex={1}
          label="Supplier Code"
          required
          autoFocus
          value={form.code}
          onChange={(e) => handleChange("code", e.target.value)}
          error={errors.code}
        />
        
        <FormInput
          tabIndex={2}
          label="Supplier Name"
          required
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          error={errors.name}
        />

        <FormInput
          tabIndex={3}
          label="Arabic Name"
          value={form.arabicName}
          onChange={(e) => handleChange("arabicName", e.target.value)}
        />

        <FormInput
          tabIndex={4}
          label="Mobile No"
          value={form.mobileNo}
          onChange={(e) => handleChange("mobileNo", e.target.value)}
        />

        <FormInput
          tabIndex={5}
          label="Tel No"
          value={form.telNo}
          onChange={(e) => handleChange("telNo", e.target.value)}
        />

        <FormInput
          tabIndex={6}
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
        />

        <div className="flex flex-col gap-1 w-full relative md:col-span-3">
          <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">
            Address
          </label>
          <textarea
            tabIndex={7}
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full text-sm rounded-md border border-gray-300 bg-white px-4 py-2 outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 resize-none h-10.5"
            placeholder="Enter full address"
          />
        </div>

        <FormInput
          tabIndex={8}
          label="Area"
          value={form.area}
          onChange={(e) => handleChange("area", e.target.value)}
        />

        <FormInput
          tabIndex={9}
          label="Identity No"
          value={form.identityNo}
          onChange={(e) => handleChange("identityNo", e.target.value)}
        />

        <FormInput
          tabIndex={10}
          label="TRN No"
          value={form.trnNo}
          onChange={(e) => handleChange("trnNo", e.target.value)}
        />

        <SearchableSelect
          tabIndex={11}
          label="Branch"
          required
          value={form.branchId ? String(form.branchId) : ""}
          onChange={(val) => handleChange("branchId", Number(val))}
          disabled={branchesLoading}
          error={errors.branchId}
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
          step="0.001"
          inputClassName="text-right"
          value={form.openingBalance === 0 && !form.openingBalance.toString().includes('.') ? "" : form.openingBalance}
          onChange={(e) => handleChange("openingBalance", e.target.value === "" ? 0 : parseFloat(e.target.value))}
          placeholder="0.000"
        />

        <div className="flex items-center h-10.5 mt-[18px]">
          <Checkbox
            tabIndex={13}
            label="Active"
            checked={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
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
          loading={submitting}
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
            loading={deleting} 
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
