import { useEffect, useMemo } from "react";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import { Button, Checkbox, FormInput, SelectInput } from "../../../../components/common";
import type { Customer } from "../types";
import { useCustomerForm } from "../hooks/useCustomerForm";
import { useEnterKeyNavigation } from "../../../../hooks/useEnterKeyNavigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBranches, fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalBranches, fetchGlobalMasterData } from "../../../inventory/shared/store/masterDataSlice";
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";

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
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const masterBranches = useAppSelector((state) => state.masterData.branches);

  const { data: branchesData = [], refetch: refetchBranches } = useQuery({
    queryKey: ["customerBranches"],
    queryFn: async () => {
      const branchMap = new Map<string, string>();

      const [branchMasterRes, directBranchesRes] = await Promise.allSettled([
        fetchBranches(),
        fetchBranchNames(true),
      ]);

      if (branchMasterRes.status === "fulfilled" && Array.isArray(branchMasterRes.value)) {
        branchMasterRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name) {
            branchMap.set(id, name);
          }
        });
      }

      if (directBranchesRes.status === "fulfilled" && Array.isArray(directBranchesRes.value)) {
        directBranchesRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      if (branchMap.size === 0) {
        try {
          const { data: res } = await axiosInstance.get<ApiResponse<any[]>>("/Branch/true/list-name");
          const list = Array.isArray(res?.data) ? res.data : [];
          list.forEach((b: any) => {
            const id = String(b.branchId ?? b.id ?? "");
            const name = String(b.branchName ?? b.name ?? "");
            if (id && id !== "0" && name) {
              branchMap.set(id, name);
            }
          });
        } catch {
          // ignore
        }
      }

      return Array.from(branchMap.entries()).map(([value, label]) => ({
        label,
        value,
      }));
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization for branch updates
  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      queryClient.removeQueries({ queryKey: ["customerBranches"] });
      queryClient.removeQueries({ queryKey: ["branchNames"] });
      queryClient.removeQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
      void refetchBranches();
      void dispatch(fetchGlobalBranches());
      void dispatch(fetchGlobalMasterData());
    });
    return () => unsubscribe();
  }, [queryClient, refetchBranches, dispatch]);

  // Ensure fresh branch data on mount
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ["customerBranches"] });
    queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
    void refetchBranches();
    void dispatch(fetchGlobalBranches());
  }, [queryClient, refetchBranches, dispatch]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();

    // 1. Add from Redux store masterData.branches
    if (Array.isArray(masterBranches)) {
      masterBranches.forEach((b) => {
        const id = String(b.id);
        if (id && id !== "0" && b.name) {
          map.set(id, b.name);
        }
      });
    }

    // 2. Add from React Query fetched branches (authoritative server data)
    if (Array.isArray(branchesData)) {
      branchesData.forEach((b) => {
        if (b.value && b.value !== "0" && b.label) {
          map.set(b.value, b.label);
        }
      });
    }

    // 3. If editing and initialData has a branch not in the map
    if (initialData?.branch && !map.has(String(initialData.branch))) {
      map.set(String(initialData.branch), `Branch (${initialData.branch})`);
    }

    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [masterBranches, branchesData, initialData?.branch]);

  const handleClear = () => {
    form.reset();
    if (onClear) onClear();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-2 py-2 px-1">
        {/* Customer Code */}
        <FormInput
          id="cust-code"
          label="Customer Code"
          required
          maxLength={20}
          placeholder="Enter customer code"
          autoFocus
          {...register("customerCode")}
          error={(errors.customerCode as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-name")}
        />

        {/* Customer Name */}
        <FormInput
          id="cust-name"
          label="Customer Name"
          required
          maxLength={100}
          placeholder="Enter customer name"
          {...register("customerName")}
          error={(errors.customerName as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-arabic")}
        />

        {/* Arabic Name */}
        <FormInput
          id="cust-arabic"
          label="Arabic Name"
          maxLength={100}
          placeholder="Enter arabic name"
          inputClassName="text-right font-arabic"
          {...register("arabicName")}
          error={(errors.arabicName as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-mobile")}
        />

        {/* Mobile No */}
        <FormInput
          id="cust-mobile"
          label="Mobile No"
          required
          maxLength={20}
          placeholder="Enter mobile number"
          {...register("mobileNo", {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/[^0-9+\-\s()]/g, "");
            }
          })}
          error={(errors.mobileNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "customer-telNo")}
        />

        {/* Tel No */}
        <FormInput
          id="customer-telNo"
          label="Tel No"
          maxLength={20}
          placeholder="Enter tel number"
          {...register("telNo", {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/[^0-9+\-\s()]/g, "");
            }
          })}
          error={(errors.telNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-email")}
        />

        {/* Email */}
        <FormInput
          id="cust-email"
          label="Email"
          type="email"
          maxLength={30}
          placeholder="Enter email address"
          {...register("email")}
          error={(errors.email as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-id-no")}
        />

        {/* Identity No */}
        <FormInput
          id="cust-id-no"
          label="Identity No"
          maxLength={50}
          placeholder="Enter identity number"
          {...register("identityNo")}
          error={(errors.identityNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-trn")}
        />

        {/* TRN No */}
        <FormInput
          id="cust-trn"
          label="TRN No"
          maxLength={50}
          placeholder="Enter TRN number"
          {...register("trnNo")}
          error={(errors.trnNo as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-address")}
        />

        {/* Address */}
        <FormInput
          id="cust-address"
          label="Address"
          maxLength={250}
          placeholder="Enter full address"
          wrapperClassName="md:col-span-2 lg:col-span-2"
          {...register("address")}
          error={(errors.address as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-area")}
        />

        {/* Area */}
        <FormInput
          id="cust-area"
          label="Area"
          maxLength={100}
          placeholder="Enter area"
          {...register("area")}
          error={(errors.area as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-branch")}
        />

        {/* Branch */}
        <SelectInput
          id="cust-branch"
          label="Branch"
          required
          placeholder="Select Branch..."
          options={branchOptions}
          {...register("branch")}
          error={(errors.branch as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-balance")}
        />

        {/* Opening Balance */}
        <FormInput
          id="cust-balance"
          label="Opening Balance"
          required
          type="number"
          placeholder="0.000"
          inputClassName="text-right"
          maxLength={15}
          {...register("openingBalance")}
          error={(errors.openingBalance as any)?.message}
          onKeyDown={(e) => handleKeyDown(e, "cust-save-btn")}
        />

        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 mt-2">
          <Checkbox
            label="Active"
            checked={watch("isActive")}
            onChange={(e) => setValue("isActive", e.target.checked)}
            disabled={!initialData}
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
