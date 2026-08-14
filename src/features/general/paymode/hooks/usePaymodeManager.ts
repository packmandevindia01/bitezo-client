import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymodeService } from "../services/paymodeService";
import { counterService } from "../../counter/services/counterService";
import { useToast } from "../../../../app/providers/useToast";
import type { PaymodeForm, PaymodeRecord } from "../types";

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
  });

  const { data: counterOptions = [], isLoading: countersLoading } = useQuery({
    queryKey: ["counters"],
    queryFn: async () => {
      const data = await counterService.list();
      return data.map((c) => ({
        counterId: c.counterId,
        counterName: c.counterName,
      }));
    },
  });

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
    onSuccess: () => {
      showToast(`Paymode ${editingId ? "updated" : "created"} successfully`, "success");
      queryClient.invalidateQueries({ queryKey: ["paymodes"] });
      closeModal();
    },
    onError: (error: any) => {
      showToast(error?.message || "Failed to save paymode", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymodeId: number) => paymodeService.remove(paymodeId),
    onSuccess: () => {
      showToast("Paymode deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["paymodes"] });
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
    resetForm();
    setOpen(true);
    try {
      const res = await paymodeService.getNextCode();
      if (res && res.code !== undefined && res.code !== null) {
        form.setValue("code", String(res.code), { shouldValidate: false, shouldDirty: false });
      }
    } catch (error) {
      console.warn("Failed to fetch next paymode code:", error);
    }
  };

  const handleEdit = async (record: PaymodeRecord) => {
    try {
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

  const handleSave = form.handleSubmit((data) => {
    saveMutation.mutate(data);
  });

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
    let result = records.slice().reverse();
    const query = search.trim().toLowerCase();
    if (!query) return result;

    return result.filter((item) =>
      [String(item.paymodeId), item.paymodeName, String(item.code)].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
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
    counterAllocOpen,
    setCounterAllocOpen,
    setSearch,
    setField,
    toggleCounterSelection,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  };
};
