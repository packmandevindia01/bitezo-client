import { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { FormInput, SearchableSelect } from "../../../../../components/common";
import { Plus } from "lucide-react";
import type { ExtrasMasterForm } from "../../schemas";
import { useExtrasTypes } from "../../../extrasType/hooks/useExtrasTypeQueries";
import { ExtrasTypeQuickAddModal } from "../../../extrasType/components/ExtrasTypeQuickAddModal";

interface ExtrasBasicFieldsProps {
  form: UseFormReturn<ExtrasMasterForm>;
  onSave?: () => void;
  saveButtonId?: string;
}

const ExtrasBasicFields = ({ form, onSave, saveButtonId = "btn-save-extras" }: ExtrasBasicFieldsProps) => {
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const { register, control, formState: { errors } } = form;
  const { data: extrasTypes = [], isLoading: isLoadingTypes } = useExtrasTypes();

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        setTimeout(() => {
          const target = document.getElementById(nextFieldId);
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
        onSave?.();
      }
    }
  };

  return (
    <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
      <FormInput
        id="ext-name"
        label="Name"
        required
        placeholder="e.g. Extra Mayo"
        error={errors.name?.message}
        {...register("name")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const nameVal = form.getValues("name");
            if (!nameVal || !nameVal.trim()) {
              void form.trigger("name");
              setTimeout(() => {
                const el = document.getElementById("ext-name");
                el?.focus();
                if (el instanceof HTMLInputElement) el.select?.();
              }, 20);
              return;
            }
            handleKeyDown(e, "ext-arabic");
          }
        }}
        autoFocus
      />

      <FormInput
        id="ext-arabic"
        label="Arabic"
        placeholder="أدخل الاسم بالعربي"
        error={errors.arabic?.message}
        {...register("arabic")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const nameVal = form.getValues("name");
            if (!nameVal || !nameVal.trim()) {
              void form.trigger("name");
              setTimeout(() => {
                const el = document.getElementById("ext-name");
                el?.focus();
                if (el instanceof HTMLInputElement) el.select?.();
              }, 20);
              return;
            }
            handleKeyDown(e, "ext-type");
          }
        }}
      />

      <Controller
        control={control}
        name="typeId"
        render={({ field }) => (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SearchableSelect
                id="ext-type"
                label="Type"
                required
                placeholder={isLoadingTypes ? "Loading types..." : "Select type"}
                error={errors.typeId?.message}
                options={extrasTypes.map((t) => ({ label: t.name, value: t.typeId.toString() }))}
                value={field.value ? field.value.toString() : ""}
                onChange={(val) => {
                  field.onChange(Number(val));
                  void form.trigger("typeId");
                  // Focus next field
                  setTimeout(() => {
                    const priceInput = document.getElementById("ext-price");
                    if (priceInput) {
                      priceInput.focus();
                      if (priceInput instanceof HTMLInputElement) {
                        try {
                          priceInput.select();
                        } catch {}
                      }
                    }
                  }, 60);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const nameVal = form.getValues("name");
                    if (!nameVal || !nameVal.trim()) {
                      void form.trigger("name");
                      setTimeout(() => {
                        const el = document.getElementById("ext-name");
                        el?.focus();
                        if (el instanceof HTMLInputElement) el.select?.();
                      }, 20);
                      return;
                    }
                    if (field.value && Number(field.value) > 0) {
                      setTimeout(() => {
                        const priceInput = document.getElementById("ext-price");
                        if (priceInput) {
                          priceInput.focus();
                          if (priceInput instanceof HTMLInputElement) {
                            try {
                              priceInput.select();
                            } catch {}
                          }
                        }
                      }, 10);
                    } else if (extrasTypes.length > 0) {
                      const firstType = extrasTypes[0];
                      field.onChange(Number(firstType.typeId));
                      void form.trigger("typeId");
                      setTimeout(() => {
                        const priceInput = document.getElementById("ext-price");
                        if (priceInput) {
                          priceInput.focus();
                          if (priceInput instanceof HTMLInputElement) {
                            try {
                              priceInput.select();
                            } catch {}
                          }
                        }
                      }, 20);
                    } else {
                      void form.trigger("typeId");
                      setTimeout(() => {
                        document.getElementById("ext-type")?.focus();
                      }, 10);
                    }
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsTypeModalOpen(true)}
              disabled={isLoadingTypes}
              tabIndex={-1}
              className="h-[42px] w-[42px] flex-shrink-0 flex items-center justify-center bg-[#49293e] hover:bg-[#3d2234] text-white rounded-[10px] transition-colors mb-0.5"
              title="Add Extras Type"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      />

      <FormInput
        id="ext-price"
        label="Price"
        type="number"
        min={0.001}
        step="any"
        required
        placeholder="0.00"
        inputClassName="text-right"
        error={errors.price?.message}
        {...register("price")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const nameVal = form.getValues("name");
            if (!nameVal || !nameVal.trim()) {
              void form.trigger("name");
              setTimeout(() => {
                const el = document.getElementById("ext-name");
                el?.focus();
                if (el instanceof HTMLInputElement) el.select?.();
              }, 20);
              return;
            }
            const typeVal = Number(form.getValues("typeId"));
            if (!typeVal || typeVal <= 0) {
              void form.trigger("typeId");
              setTimeout(() => {
                document.getElementById("ext-type")?.focus();
              }, 20);
              return;
            }
            const priceVal = Number(form.getValues("price"));
            if (isNaN(priceVal) || priceVal <= 0) {
              void form.trigger("price");
              setTimeout(() => {
                const el = document.getElementById("ext-price");
                el?.focus();
                if (el instanceof HTMLInputElement) el.select?.();
              }, 20);
              return;
            }
            handleKeyDown(e, "ext-color");
          }
        }}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Display Color</label>
        <div className="flex h-10.5 items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 transition-colors focus-within:border-[#49293e] focus-within:ring-1 focus-within:ring-[#49293e]/10">
          <input
            id="ext-color"
            type="color"
            {...register("color")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const nameVal = form.getValues("name");
                if (!nameVal || !nameVal.trim()) {
                  void form.trigger("name");
                  setTimeout(() => {
                    const el = document.getElementById("ext-name");
                    el?.focus();
                    if (el instanceof HTMLInputElement) el.select?.();
                  }, 20);
                  return;
                }
                const typeVal = Number(form.getValues("typeId"));
                if (!typeVal || typeVal <= 0) {
                  void form.trigger("typeId");
                  setTimeout(() => {
                    document.getElementById("ext-type")?.focus();
                  }, 20);
                  return;
                }
                const priceVal = Number(form.getValues("price"));
                if (isNaN(priceVal) || priceVal <= 0) {
                  void form.trigger("price");
                  setTimeout(() => {
                    const el = document.getElementById("ext-price");
                    el?.focus();
                    if (el instanceof HTMLInputElement) el.select?.();
                  }, 20);
                  return;
                }
                handleKeyDown(e, saveButtonId);
              }
            }}
            className="h-7 w-10 cursor-pointer rounded border-none bg-transparent p-0"
          />
          <span className="text-xs font-mono uppercase text-gray-500">{form.watch("color")}</span>
        </div>
      </div>

      <ExtrasTypeQuickAddModal 
        isOpen={isTypeModalOpen} 
        onClose={() => setIsTypeModalOpen(false)} 
        onSuccess={(id) => {
          form.setValue("typeId", id, { shouldValidate: true, shouldDirty: true });
          setTimeout(() => {
            const priceInput = document.getElementById("ext-price");
            if (priceInput) {
              priceInput.focus();
              if (priceInput instanceof HTMLInputElement) {
                try {
                  priceInput.select();
                } catch {}
              }
            }
          }, 60);
        }}
      />
    </div>
  );
};

export default ExtrasBasicFields;
