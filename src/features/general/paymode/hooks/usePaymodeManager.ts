import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymodeService } from "../services/paymodeService";
import { counterService } from "../../counter/services/counterService";
import { subscribeToCounterUpdates } from "../../counter/utils/counterSync";
import { useToast } from "../../../../app/providers/useToast";
import type { PaymodeForm, PaymodeRecord } from "../types";
import { notifyPaymodeUpdated } from "../utils/paymodeSync";

const MAX_INT32 = 2147483647;

// We create a schema factory to inject existing codes for uniqueness validation
const getPaymodeSchema = (existingRecords: PaymodeRecord[], editingId: number | null) => {
  return z.object({
    paymodeId: z.number(),
    code: z.string()
      .min(1, "Paymode code is required")
      .max(9, "Code must not exceed 9 digits")
      .regex(/^[0-9]+$/, "Code must contain only numbers")
      .refine((val) => {
        const num = Number(val);
        return num > 0 && num <= MAX_INT32;
      }, "Code is too large")
      .refine((val) => {
        // Uniqueness check
        const isDuplicate = existingRecords.some(
          (record) => String(record.code) === val && record.paymodeId !== editingId
        );
        return !isDuplicate;
      }, "This Paymode Code already exists. Please choose a unique code."),
    paymodeName: z.string()
      .min(1, "Paymode name is required")
      .max(25, "Name must not exceed 25 characters"),
    isActive: z.boolean(),
    counterIds: z.array(z.number()),
  });
};

type PaymodeSchemaType = z.infer<ReturnType<typeof getPaymodeSchema>>;

export const usePaymodeManager = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [counterAllocOpen, setCounterAllocOpen] = useState(false);

  // ── Queries ─────────────────────────────────────────────

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["paymodes"],
    queryFn: () => paymodeService.list(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: counterOptions = [], isLoading: countersLoading, refetch: refetchCounters } = useQuery({
    queryKey: ["counters"],
    queryFn: async () => {
      const data = await counterService.list();
      return (data || []).map((c) => ({
        counterId: c.counterId,
        counterName: c.counterName,
      }));
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Real-time synchronization for counter updates
  useEffect(() => {
    const unsubscribe = subscribeToCounterUpdates(() => {
      queryClient.removeQueries({ queryKey: ["counters"] });
      queryClient.invalidateQueries({ queryKey: ["counters"], refetchType: "all" });
      void refetchCounters();
    });
    return () => unsubscribe();
  }, [queryClient, refetchCounters]);

  // Ensure fresh counter data on mount
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ["counters"] });
    queryClient.invalidateQueries({ queryKey: ["counters"], refetchType: "all" });
    void refetchCounters();
  }, [queryClient, refetchCounters]);

  // Ensure fresh counter data whenever the modal opens
  useEffect(() => {
    if (open) {
      queryClient.removeQueries({ queryKey: ["counters"] });
      queryClient.invalidateQueries({ queryKey: ["counters"], refetchType: "all" });
      void refetchCounters();
    }
  }, [open, queryClient, refetchCounters]);

  // ── Form Setup ──────────────────────────────────────────

  const form = useForm<PaymodeSchemaType>({
    mode: "onChange",
    reValidateMode: "onChange",
    resolver: (data, context, options) => {
      // Re-evaluate schema dynamically with the latest records
      return zodResolver(getPaymodeSchema(records, editingId))(data, context, options);
    },
    defaultValues: {
      paymodeId: 0,
      code: "",
      paymodeName: "",
      isActive: true,
      counterIds: [],
    },
  });

  // ── Mutations ───────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (data: PaymodeSchemaType) => {
      const payload = {
        ...data,
        code: parseInt(data.code, 10) || 0, // Pass as integer, backend expects integer value
      };
      if (editingId) {
        return await paymodeService.update(editingId, payload);
      } else {
        return await paymodeService.create(payload);
      }
    },
    onSuccess: (res, variables) => {
      showToast(`Paymode ${editingId ? "updated" : "created"} successfully`, "success");
      const targetId = editingId || (res && typeof res === "object" && "id" in res ? Number((res as any).id) : Date.now());
      if (targetId) {
        queryClient.setQueryData<PaymodeRecord[]>(["paymodes"], (old = []) => {
          const item: PaymodeRecord = {
            paymodeId: targetId,
            sNo: old.length + 1,
            code: Number(variables.code) || 0,
            paymodeName: variables.paymodeName,
            isActive: variables.isActive,
          };
          if (editingId) {
            return old.map(p => (p.paymodeId === editingId ? { ...p, ...item } : p));
          }
          return old.some(p => p.paymodeId === targetId) ? old : [...old, item];
        });
      }
      queryClient.invalidateQueries({ queryKey: ["paymodes"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["receiptMaster"] });
      queryClient.invalidateQueries({ queryKey: ["paymentAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["receiptAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["providerPaymodes"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      void queryClient.refetchQueries({ queryKey: ["paymodes"] });
      void queryClient.refetchQueries({ queryKey: ["paymentMaster"] });
      void queryClient.refetchQueries({ queryKey: ["receiptMaster"] });
      void queryClient.refetchQueries({ queryKey: ["providerPaymodes"] });
      notifyPaymodeUpdated(editingId ? "updated" : "created");
      closeModal();
    },
    onError: (error: any) => {
      showToast(error?.message || "Failed to save paymode", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymodeId: number) => paymodeService.remove(paymodeId),
    onSuccess: (_data, paymodeId) => {
      showToast("Paymode deleted successfully", "success");
      queryClient.setQueryData<PaymodeRecord[]>(["paymodes"], (old = []) => {
        return old.filter(p => p.paymodeId !== paymodeId);
      });
      queryClient.invalidateQueries({ queryKey: ["paymodes"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["receiptMaster"] });
      queryClient.invalidateQueries({ queryKey: ["paymentAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["receiptAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["providerPaymodes"] });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
      void queryClient.refetchQueries({ queryKey: ["paymodes"] });
      void queryClient.refetchQueries({ queryKey: ["paymentMaster"] });
      void queryClient.refetchQueries({ queryKey: ["receiptMaster"] });
      void queryClient.refetchQueries({ queryKey: ["providerPaymodes"] });
      notifyPaymodeUpdated("deleted");
      if (editingId) {
        closeModal();
      }
    },
    onError: (error: any) => {
      showToast(error?.message || "Failed to delete paymode", "error");
    },
  });

  // ── Actions ─────────────────────────────────────────────

  const resetForm = () => {
    form.reset({
      paymodeId: 0,
      code: "",
      paymodeName: "",
      isActive: true,
      counterIds: [],
    });
    setEditingId(null);
    setCounterAllocOpen(false);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = async () => {
    const maxCode = records.reduce((max, r) => Math.max(max, Number(r.code) || 0), 0);
    const initialCode = maxCode > 0 ? String(maxCode + 1) : "1";
    form.reset({
      paymodeId: 0,
      code: initialCode,
      paymodeName: "",
      isActive: true,
      counterIds: [],
    });
    setEditingId(null);
    setCounterAllocOpen(false);

    queryClient.removeQueries({ queryKey: ["counters"] });
    queryClient.invalidateQueries({ queryKey: ["counters"], refetchType: "all" });
    void refetchCounters();
    setOpen(true);
    try {
      const res = await paymodeService.getNextCode();
      if (res && res.code !== undefined && res.code !== null && Number(res.code) > 0) {
        form.setValue("code", String(res.code), { shouldValidate: true, shouldDirty: false });
      }
    } catch (error) {
      console.warn("Failed to fetch next paymode code:", error);
    }
  };

  const handleClear = async () => {
    if (editingId) {
      const currentCode = form.getValues("code");
      form.reset({
        paymodeId: editingId,
        code: currentCode,
        paymodeName: "",
        isActive: true,
        counterIds: [],
      });
    } else {
      let currentCode = form.getValues("code");
      if (!currentCode) {
        try {
          const res = await paymodeService.getNextCode();
          if (res && res.code !== undefined && res.code !== null && Number(res.code) > 0) {
            currentCode = String(res.code);
          }
        } catch {
          const maxCode = records.reduce((max, r) => Math.max(max, Number(r.code) || 0), 0);
          currentCode = String(maxCode + 1);
        }
      }
      form.reset({
        paymodeId: 0,
        code: currentCode || "1",
        paymodeName: "",
        isActive: true,
        counterIds: [],
      });
    }
    form.clearErrors();
    setTimeout(() => {
      const nameInput = document.getElementById("pm-name");
      if (nameInput) {
        nameInput.focus();
        if (nameInput instanceof HTMLInputElement) {
          nameInput.select?.();
        }
      }
    }, 50);
  };

  const handleEdit = async (record: PaymodeRecord) => {
    try {
      queryClient.removeQueries({ queryKey: ["counters"] });
      queryClient.invalidateQueries({ queryKey: ["counters"], refetchType: "all" });
      void refetchCounters();
      const detail = await paymodeService.getById(record.paymodeId);
      const p = detail.paymode[0];
      setEditingId(p.paymodeId);
      
      form.reset({
        paymodeId: p.paymodeId,
        code: String(p.code),
        paymodeName: p.paymodeName,
        isActive: p.isActive,
        counterIds: (detail.counter || []).map((c: any) => c.counterId),
      });

      setOpen(true);
    } catch (error: any) {
      showToast(error?.message || "Failed to fetch paymode details", "error");
    }
  };

  const handleSave = form.handleSubmit(
    (data) => {
      saveMutation.mutate(data);
    },
    (errors) => {
      if (errors.paymodeName) {
        showToast(errors.paymodeName.message || "Paymode name is required", "error");
        setTimeout(() => {
          const el = document.getElementById("pm-name");
          if (el) {
            el.focus();
            if (el instanceof HTMLInputElement) el.select?.();
          }
        }, 50);
      } else if (errors.code) {
        showToast(errors.code.message || "Paymode code is required", "error");
      }
    }
  );

  const handleDelete = (paymodeId: number) => {
    deleteMutation.mutate(paymodeId);
  };

  const toggleCounterSelection = (counterId: number) => {
    const current = form.getValues("counterIds");
    const updated = current.includes(counterId)
      ? current.filter((id) => id !== counterId)
      : [...current, counterId];
    
    form.setValue("counterIds", updated, { shouldDirty: true, shouldValidate: true });
  };

  const setField = (patch: Partial<PaymodeForm>) => {
    // For compatibility with any old manual onChange wrappers
    Object.entries(patch).forEach(([key, value]) => {
      form.setValue(key as keyof PaymodeSchemaType, value as any, { shouldValidate: true, shouldDirty: true });
    });
  };

  const filteredRecords = useMemo(() => {
    // FIFO (First In, First Out) ascending order
    const result = records.slice().sort((a, b) => {
      const codeA = Number(a.code) || a.paymodeId;
      const codeB = Number(b.code) || b.paymodeId;
      return codeA - codeB;
    });

    const query = search.trim().toLowerCase();
    const filtered = query
      ? result.filter((item) =>
          [String(item.paymodeId), item.paymodeName, String(item.code)].some((value) =>
            value.toLowerCase().includes(query)
          )
        )
      : result;

    return filtered.map((item, index) => ({
      ...item,
      sNo: index + 1,
    }));
  }, [records, search]);

  return {
    form,
    open,
    search,
    editingId,
    filteredRecords,
    loading: recordsLoading || countersLoading,
    saving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    counterOptions,
    refetchCounters,
    counterAllocOpen,
    setCounterAllocOpen,
    setSearch,
    setField,
    toggleCounterSelection,
    resetForm,
    handleClear,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  };
};
