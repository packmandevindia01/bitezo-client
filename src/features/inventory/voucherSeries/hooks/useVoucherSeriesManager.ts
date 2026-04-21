import { useEffect, useMemo, useState } from "react";
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
  const [branches, setBranches] = useState<BranchRecord[]>([]);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [seriesList, branchList] = await Promise.all([
        voucherseriesService.list(),
        branchApi.fetchBranchNames(true),
      ]);

      setRecords(seriesList as VoucherSeriesRecord[]);
      // Filter out BranchId: 1 (typically "All") as per user request
      setBranches(branchList.filter(b => b.id !== 1));
    } catch (error) {
      showToast("Failed to load voucher series data", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const setField = <K extends keyof VoucherSeriesForm>(key: K, value: VoucherSeriesForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyVoucherSeriesForm);
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
    const vType = form.voucherType;
    const branchId = Number(form.branchId);
    const startNo = Number(form.startNo) || 1;

    if (!vType) {
      showToast("Voucher type is required", "error");
      return;
    }
    if (!vName) {
      showToast("Voucher name is required", "error");
      return;
    }
    if (!branchId) {
      showToast("Please select a branch", "error");
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save voucher series";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (record: VoucherSeriesRecord) => {
    try {
      setLoading(true);
      const detail = await voucherseriesService.getById(record.voucherId);

      setEditingId(detail.voucherId);
      setForm({
        voucherType: detail.voucherType,
        name: detail.voucherName,
        prefix: detail.prefix,
        startNo: String(detail.startNo),
        branchId: String(detail.branchId),
      });
      setOpen(true);
    } catch (error) {
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
    } catch (error) {
      showToast("Failed to delete voucher series", "error");
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
