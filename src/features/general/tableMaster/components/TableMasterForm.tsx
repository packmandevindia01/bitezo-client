import { Trash2, Minus, Plus, Save, RotateCcw, X } from "lucide-react";
import { Button, FormInput, Checkbox } from "../../../../components/common";
import type { UseFormReturn } from "react-hook-form";
import type { TableMasterForm as TableMasterFormType } from "../schemas";
import React, { useEffect } from "react";

interface TableMasterFormProps {
  form: UseFormReturn<TableMasterFormType>;
  mode: "create" | "edit";
  loading: boolean;
  onClear: () => void;
  onSave: () => void;
  onClose?: () => void;
  onDeleteRequest?: () => void;
}

const TableMasterForm = ({
  form,
  mode,
  loading,
  onClear,
  onSave,
  onClose,
  onDeleteRequest
}: TableMasterFormProps) => {
  const { register, watch, setValue, formState: { errors } } = form;

  const currentChairs = watch("chairs");

  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById("table-name")?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleChairChange = (delta: number) => {
    const current = Number(currentChairs || 0);
    const next = Math.max(1, current + delta);
    setValue("chairs", next, { shouldValidate: true, shouldDirty: true });
  };

  const handleEnter = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) {
        setTimeout(() => {
          const target = document.getElementById(nextId);
          if (target) {
            target.focus();
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
              try {
                target.setSelectionRange(0, target.value.length);
              } catch {
                target.select?.();
              }
            }
          }
        }, 10);
      } else {
        onSave();
      }
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="flex flex-col bg-white p-4 md:p-5 w-full"
    >
      <div className="mb-3 flex items-center justify-between border-b border-gray-50 pb-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#49293e]">
          {mode === "edit" ? "Edit Table" : "Register New Table"}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Table Name */}
        <div className="flex flex-col">
          <FormInput
            id="table-name"
            label="Table Name"
            required={true}
            placeholder='e.g. "T1"'
            maxLength={15}
            error={errors.tableName?.message}
            {...register("tableName")}
            className="h-11 text-base font-bold !rounded-xl border-gray-200 uppercase"
            autoFocus
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const nameVal = form.getValues("tableName");
                if (!nameVal || !nameVal.trim()) {
                  void form.trigger("tableName");
                  setTimeout(() => {
                    const el = document.getElementById("table-name");
                    el?.focus();
                  }, 20);
                  return;
                }
                handleEnter(e, "table-chairs");
              }
            }}
            onChange={(e) => {
              // Convert to uppercase on change and enforce max 15 characters
              setValue("tableName", e.target.value.toUpperCase().slice(0, 15), { shouldValidate: true, shouldDirty: true });
            }}
          />
        </div>

        {/* Chairs Stepper */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-1 mb-0.5">
            Chairs <span className="text-red-500 ml-1 font-bold">*</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleChairChange(-1)}
              disabled={loading || Number(currentChairs) <= 1}
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-[#49293e] active:bg-gray-100 transition-colors disabled:opacity-30 shadow-sm shrink-0"
            >
              <Minus size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <FormInput
                id="table-chairs"
                type="number"
                placeholder="0"
                error={errors.chairs?.message}
                hideLabel={true}
                {...register("chairs", { valueAsNumber: true })}
                className="h-11 !rounded-xl border-gray-200"
                inputClassName="px-0 text-center text-base font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const nameVal = form.getValues("tableName");
                    if (!nameVal || !nameVal.trim()) {
                      void form.trigger("tableName");
                      setTimeout(() => {
                        const el = document.getElementById("table-name");
                        el?.focus();
                        if (el instanceof HTMLInputElement) el.select?.();
                      }, 20);
                      return;
                    }
                    const chairsVal = form.getValues("chairs");
                    if (!chairsVal || Number(chairsVal) < 1) {
                      void form.trigger("chairs");
                      setTimeout(() => {
                        const el = document.getElementById("table-chairs");
                        el?.focus();
                        if (el instanceof HTMLInputElement) el.select?.();
                      }, 20);
                      return;
                    }
                    handleEnter(e, "table-save-btn");
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleChairChange(1)}
              disabled={loading}
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-[#49293e] active:bg-gray-100 transition-colors disabled:opacity-30 shadow-sm shrink-0"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5 justify-center mt-2">
          <Checkbox
            id="table-active"
            label="Active Status"
            checked={watch("isActive")}
            onChange={(e) => setValue("isActive", e.target.checked, { shouldValidate: true, shouldDirty: true })}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const nameVal = form.getValues("tableName");
                if (!nameVal || !nameVal.trim()) {
                  void form.trigger("tableName");
                  setTimeout(() => {
                    const el = document.getElementById("table-name");
                    el?.focus();
                    if (el instanceof HTMLInputElement) el.select?.();
                  }, 20);
                  return;
                }
                const chairsVal = form.getValues("chairs");
                if (!chairsVal || Number(chairsVal) < 1) {
                  void form.trigger("chairs");
                  setTimeout(() => {
                    const el = document.getElementById("table-chairs");
                    el?.focus();
                    if (el instanceof HTMLInputElement) el.select?.();
                  }, 20);
                  return;
                }
                handleEnter(e, "table-save-btn");
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
        <Button 
          variant="secondary" 
          onClick={() => {
            onClear();
            setTimeout(() => {
              document.getElementById("table-name")?.focus();
            }, 30);
          }} 
          disabled={loading}
          type="button"
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>
        <Button 
          id="table-save-btn"
          onClick={onSave} 
          disabled={loading}
          type="submit"
          isAction
          loading={loading}
          icon={<Save size={18} />}
        >
          Save
        </Button>
        {mode === "edit" && onDeleteRequest && (
          <Button
            variant="danger"
            type="button"
            onClick={onDeleteRequest}
            disabled={loading}
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

export default TableMasterForm;
