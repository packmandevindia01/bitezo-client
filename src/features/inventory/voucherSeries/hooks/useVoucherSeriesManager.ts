import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import type { BranchRecord } from "../../../inventory/branches/types";
import { emptyVoucherSeriesForm } from "../constants";
import { voucherseriesService } from "../services/voucherseriesService";
import type { VoucherSeriesForm, VoucherSeriesRecord } from "../types";

export const useVoucherSeriesManager = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<VoucherSeriesRecord[]>([]);
  const [form, setForm] = useState<VoucherSeriesForm>(emptyVoucherSeriesForm);
  const [errors, setErrors] = useState<Partial<Record<keyof VoucherSeriesForm, string>>>({});
  const [branches, setBranches] = useState<BranchRecord[]>([]);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [seriesList, branchList] = await Promise.all([
        voucherseriesService.list(),
        branchApi.fetchBranchNames(true),
      ]);

      setRecords(seriesList as VoucherSeriesRecord[]);
      // Filter out BranchId: 1 (typically "All") as per user request
      setBranches(branchList.filter(b => b.id !== 1));
    } catch {
      showToast("Failed to load voucher series data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setField = <K extends keyof VoucherSeriesForm>(key: K, value: VoucherSeriesForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const resetForm = () => {
    setForm(emptyVoucherSeriesForm);
    setErrors({});
    setEditingId(null);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  const handleSave = async () => {
    const vName = form.name.trim();
    const vType = form.voucherType.trim();
    const vPrefix = form.prefix?.trim() || "";
    const branchId = Number(form.branchId);
    const startNoStr = String(form.startNo ?? "").trim();
    const startNo = Number(startNoStr) || 1;

    const newErrors: Partial<Record<keyof VoucherSeriesForm, string>> = {};
    if (!vType) newErrors.voucherType = "required";
    if (!vName) {
      newErrors.name = "required";
    } else if (vName.length > 50) {
      newErrors.name = "Maximum character limit exceeded.";
    }

    if (vPrefix.length > 10) {
      newErrors.prefix = "Maximum character limit exceeded.";
    }

    if (!startNoStr) {
      newErrors.startNo = "required";
    } else if (startNoStr.length > 9 || startNo > 999999999) {
      newErrors.startNo = "Maximum character limit exceeded.";
    }

    if (!branchId || isNaN(branchId)) newErrors.branchId = "required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (Object.values(newErrors).some((msg) => msg === "Maximum character limit exceeded.")) {
        showToast("Maximum character limit exceeded.", "warning");
      }
      return;
    }

    try {
      setSaving(true);
      const payload = {
        voucherType: vType,
        voucherName: vName,
        prefix: form.prefix || "",
        startNo: startNo,
        branchId: branchId,
      };

      if (editingId) {
        await voucherseriesService.update(editingId, payload);
        showToast("Voucher series updated successfully", "success");
      } else {
        await voucherseriesService.create(payload);
        showToast("Voucher series created successfully", "success");
      }

      await fetchData(); // Refresh list
      closeModal();
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { message?: string; title?: string; errors?: { message?: string }[] } }; message?: string };
      const status = axErr.response?.status;
      const apiMsg = axErr.response?.data?.message || axErr.response?.data?.title || axErr.response?.data?.errors?.[0]?.message;

      let message = apiMsg;
      if (status === 400 && (!message || message.includes("400") || message.includes("validation"))) {
        message = "Maximum character limit exceeded or invalid input.";
      } else if (status === 409 || status === 404 || axErr.message?.includes("409") || axErr.message?.includes("404") || apiMsg?.includes("conflict") || apiMsg?.includes("constraint") || apiMsg?.includes("in use")) {
        message = "This Voucher Series cannot be modified because it is actively used in transactions.";
      } else if (!message || message.includes("Request failed with status code")) {
        message = axErr.message || "Failed to save Voucher Series. It may be currently in use.";
      }

      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: VoucherSeriesRecord) => {
    try {
      setLoading(true);
      const detail = await voucherseriesService.getById(record.voucherId);

      setErrors({});
      setEditingId(detail.voucherId);
      setForm({
        voucherType: detail.voucherType,
        name: detail.voucherName,
        prefix: detail.prefix,
        startNo: String(detail.startNo),
        branchId: String(detail.branchId),
      });
      setOpen(true);
    } catch {
      showToast("Failed to load voucher series details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: VoucherSeriesRecord) => {
    try {
      setSaving(true);
      await voucherseriesService.remove(record.voucherId);
      showToast("Voucher series deleted successfully", "success");
      await fetchData();
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { message?: string; title?: string; errors?: { message?: string }[] } }; message?: string };
      const status = axErr.response?.status;
      const apiMsg = axErr.response?.data?.message || axErr.response?.data?.title || axErr.response?.data?.errors?.[0]?.message;

      let message = apiMsg;
      if (status === 409 || status === 404 || axErr.message?.includes("409") || axErr.message?.includes("404") || apiMsg?.includes("conflict") || apiMsg?.includes("constraint") || apiMsg?.includes("in use")) {
        message = "This Voucher Series cannot be deleted because it is actively used in transactions.";
      } else if (!message || message.includes("Request failed with status code")) {
        message = axErr.message || "Failed to delete Voucher Series. It may be protected or currently in use.";
      }

      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [item.voucherName, item.voucherType, item.branch].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [records, search]);

  return {
    form,
    errors,
    branches,
    open,
    search,
    editingId,
    loading,
    saving,
    filteredRecords,
    setSearch,
    setField,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  };
};
