import { useState, useEffect, useRef } from "react";
import { Save, Trash2, Plus, X as CloseIcon, Loader2 } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SearchableCombobox } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useBom } from "../hooks/useBom";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FormProvider, Controller } from "react-hook-form";
import { generateUUID } from "../../../../utils/uuid";

const BomPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const {
    form,
    items,
    append,
    remove,
    loading,
    saving,
    branches,
    finishedProducts,
    finishedProductUnits,
    categoryUnits,
    handleFinishedProductSelect,
    handleGridProductSelect,
    handleGridUnitChange,
    handleBarcodeScan,
    getRowOptions,
    onSubmit,
    masterData
  } = useBom(id ? parseInt(id, 10) : undefined);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const canAdd = hasPermission("BOM Master", "Add");
  const canEdit = hasPermission("BOM Master", "Edit");
  const canDelete = hasPermission("BOM Master", "Delete");
  const canSave = canAdd || canEdit;

  const { watch, setValue, control, register, formState: { errors, isSubmitted } } = form;
  const showErr = (fieldError?: { message?: string }) => isSubmitted ? fieldError?.message : undefined;
  const watchedItems = watch("items") || [];
  const productSelectedRef = useRef(false);

  useEffect(() => {
    setTimeout(() => {
      document.getElementById("bom-name")?.focus();
    }, 200);
  }, []);

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) document.getElementById(nextId)?.focus();
    }
  };

  const handleGridNav = (e: React.KeyboardEvent, rowIndex?: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (rowIndex !== undefined) {
        const rowProduct = form.getValues(`items.${rowIndex}.product`);
        if (!rowProduct || rowProduct.trim() === "") {
          if (items.length > 1) remove(rowIndex);
          setTimeout(() => document.getElementById("bom-save-btn")?.focus(), 50);
          return;
        }
      }
      const container = (e.target as HTMLElement).closest('.relative');
      const formElements = container
        ? Array.from(container.querySelectorAll('input:not([tabindex="-1"]):not([type="hidden"]), select:not([tabindex="-1"]), button:not([tabindex="-1"]), [role="combobox"]:not([tabindex="-1"])'))
            .filter(el => !el.hasAttribute('disabled') && !el.hasAttribute('readonly'))
        : [];
      const currentIndex = formElements.indexOf(e.target as Element);
      if (currentIndex > -1 && formElements[currentIndex + 1]) {
        (formElements[currentIndex + 1] as HTMLElement).focus();
      }
    }
  };

  if (loading) {
    return (
      <PageShell title="BOM">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#49293e]" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={id ? "Edit BOM" : "Add BOM"}>
      <FormProvider {...form}>
        <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 110px)" }}>
          
          {/* Close Button in top right */}
          <button
            type="button"
            onClick={() => navigate("/dashboard/boms")}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <CloseIcon size={20} />
          </button>

          {/* ── Static Header Fields ── */}
          <div className="p-2 md:p-3 pb-0" style={{ paddingRight: "60px" }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-1.5 mb-2">
              <FormInput 
                id="bom-name"
                label="BOM Name" 
                inputClassName="!h-8 !px-2 !text-xs"
                value={watch("bomName")}
                onChange={(e) => setValue("bomName", e.target.value)}
                disabled={!canSave}
                onKeyDown={(e) => hk(e, "bom-branch")}
                maxLength={100}
                autoFocus
                required
                error={showErr(errors.bomName)}
              />
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect 
                    id="bom-branch"
                    label="Branch" 
                    className="h-8 !px-2 !text-xs"
                    options={branches}
                    value={field.value}
                    onChange={(val) => setValue("branchId", val)}
                    disabled={!canSave}
                    required
                    error={showErr(errors.branchId)}
                  />
                )}
              />
              <Controller
                name="finishedProduct"
                control={control}
                render={({ field }) => (
                  <SearchableSelect 
                    id="bom-finProduct"
                    label="Finished Product" 
                    className="h-8 !px-2 !text-xs"
                    options={finishedProducts}
                    value={field.value}
                    onChange={(val) => {
                      if (val) {
                        handleFinishedProductSelect(val);
                      } else {
                        setValue("finishedProduct", "");
                        setValue("finishedProductCode", "");
                        setValue("finishedProductUnit", "");
                        setValue("finishedProductUnitName", "");
                        setValue("finishedProductQty", "");
                      }
                    }}
                    disabled={!canSave}
                    required
                    error={showErr(errors.finishedProduct)}
                  />
                )}
              />
              <FormInput 
                id="bom-finCode" 
                label="Code" 
                inputClassName="!h-8 !px-2 !text-xs cursor-not-allowed text-[#49293e]" 
                value={watch("finishedProductCode") || ""} 
                onChange={(e) => setValue("finishedProductCode", e.target.value)} 
                onKeyDown={(e) => hk(e, "bom-finQty")} 
                readOnly={true} 
              />
              <Controller
                name="finishedProductUnit"
                control={control}
                render={({ field }) => (
                  <SearchableSelect 
                    id="bom-finUnit"
                    label="Unit" 
                    className="h-8 !px-2 !text-xs"
                    options={finishedProductUnits.length > 0 ? finishedProductUnits : (masterData?.units || [])}
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      const opts = finishedProductUnits.length > 0 ? finishedProductUnits : (masterData?.units || []);
                      const opt = opts.find(u => u.value === val);
                      setValue("finishedProductUnitName", opt?.label || "");
                    }}
                    disabled={!canSave || !watch("finishedProduct")}
                    required
                    error={showErr(errors.finishedProductUnit)}
                  />
                )}
              />
              <FormInput 
                id="bom-finQty" 
                label="Qty" 
                type="number"
                inputClassName="!h-8 !px-2 !text-xs text-right"
                value={watch("finishedProductQty")} 
                onChange={(e) => setValue("finishedProductQty", e.target.value)} 
                onKeyDown={(e) => hk(e, "product-select-0")} 
                maxLength={10}
                required 
                readOnly={!canSave}
                error={showErr(errors.finishedProductQty)}
              />
            </div>
          </div>

          {/* ── Scrollable DataGrid ── */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3">
            <div className="h-full flex flex-col rounded-xl border border-gray-200 bg-white">
              <div className="flex-1 overflow-auto">
                <table className="min-w-full table-fixed text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      {[
                        { name: "SL", width: "w-[5%]" },
                        { name: "Raw Material", width: "w-[45%]" },
                        { name: "Code", width: "w-[15%]" },
                        { name: "Unit", width: "w-[15%]" },
                        { name: "Qty", width: "w-[12%]" },
                        { name: "", width: "w-[8%]" }
                      ].map((col, i) => (
                        <th key={i} className={`sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ${col.width} ${col.name === "SL" || col.name === "" ? "text-center" : col.name === "Qty" ? "text-right" : "text-center"}`}>
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {items.map((item, index) => {
                      const itemWatch = watchedItems[index] || {};
                      const rowOptions = getRowOptions(index);
                      const rowError = (errors.items as any)?.[index];
                      return (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-2 py-1 text-center font-bold text-gray-400 border-r border-gray-100 bg-gray-50/30">{index + 1}</td>
                          <td className="p-0.5 border-r border-gray-100 bg-white">
                            <Controller
                              name={`items.${index}.product`}
                              control={control}
                              render={({ field: selectField }) => (
                                <div className="grid-product-select">
                                  <SearchableCombobox
                                    id={`product-select-${index}`}
                                    className="h-7 !px-2 text-xs"
                                    value={selectField.value}
                                    options={rowOptions}
                                    onChange={(val) => {
                                      productSelectedRef.current = true;
                                      selectField.onChange(val);
                                      if (val) {
                                        const opt = rowOptions.find(o => o.value === val) as any;
                                        if (opt) {
                                          setValue(`items.${index}.productName`, opt.label);
                                          setValue(`items.${index}.code`, opt.code || "");
                                          handleGridProductSelect(index, val, opt.code || "");
                                        }
                                      } else {
                                        setValue(`items.${index}.productName`, "");
                                        setValue(`items.${index}.code`, "");
                                        setValue(`items.${index}.unitId`, undefined);
                                        setValue(`items.${index}.unit`, "");
                                        setValue(`items.${index}.unitCategory`, "");
                                        setValue(`items.${index}.qty`, "");
                                      }
                                      setTimeout(() => {
                                        const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
                                        qtyInputs[0]?.focus();
                                      }, 100);
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter") {
                                        if (productSelectedRef.current) {
                                          productSelectedRef.current = false;
                                          return;
                                        }
                                        const rawValue = e.currentTarget.value;
                                        if (rawValue && rawValue.trim().length > 0) {
                                          e.preventDefault();
                                          const success = await handleBarcodeScan(index, rawValue.trim());
                                          if (success) {
                                            setTimeout(() => {
                                              const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
                                              qtyInputs[0]?.focus();
                                            }, 100);
                                          }
                                          return;
                                        }
                                        if (items.length > 1) remove(index);
                                        setTimeout(() => document.getElementById("bom-save-btn")?.focus(), 50);
                                      }
                                    }}
                                    disabled={!canSave}
                                    minQueryLength={0}
                                  />
                                </div>
                              )}
                            />
                          </td>
                          <td className="px-2 py-1 text-[10px] text-gray-500 border-r border-gray-100 bg-gray-50/50 text-center">{itemWatch.code || "-"}</td>
                          <td className="p-0 border-r border-gray-100 relative">
                            <Controller
                              name={`items.${index}.unit`}
                              control={control}
                              render={({ field: selectField }) => (
                                <SearchableSelect
                                  className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                                  value={selectField.value}
                                  options={(itemWatch.unitCategory && categoryUnits[itemWatch.unitCategory]) ? categoryUnits[itemWatch.unitCategory] : (masterData?.units || [])}
                                  onChange={(val) => handleGridUnitChange(index, val)}
                                  disabled={!canSave}
                                  placeholder="Unit"
                                  disableAutoOpenOnFocus={true}
                                />
                              )}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100">
                            <input
                              {...register(`items.${index}.qty`)}
                              type="number"
                              min="0"
                              step="any"
                              maxLength={10}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const rowProduct = form.getValues(`items.${index}.product`);
                                  if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
                                    append({
                                      id: generateUUID(),
                                      product: "", code: "", unit: "", qty: "1"
                                    }, { shouldFocus: false });
                                    setTimeout(() => document.getElementById(`product-select-${items.length}`)?.focus(), 50);
                                  } else {
                                    handleGridNav(e, index);
                                  }
                                }
                              }}
                              className={`w-full h-7 text-right bg-transparent border hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none ${showErr(rowError?.qty) ? 'border-red-500 bg-red-50/30 text-red-600' : 'border-transparent'}`}
                              readOnly={!canSave}
                            />
                            {showErr(rowError?.qty) && (
                              <span className="block text-[10px] font-bold text-red-500 px-1 truncate" title={showErr(rowError?.qty)}>
                                required
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => items.length > 1 && remove(index)}
                              className={`p-1.5 rounded-md transition-colors ${items.length > 1 ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-200 cursor-not-allowed'}`}
                              disabled={!canSave || items.length <= 1}
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {isSubmitted && (errors.items as any)?.message && typeof (errors.items as any)?.message === 'string' && (
                <div className="px-3 py-1.5 text-xs text-red-600 font-semibold bg-red-50/50 border-t border-red-100">
                  {(errors.items as any).message}
                </div>
              )}

              {/* Add Row Button */}
              <div className="flex justify-start px-2 py-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    append({
                      id: generateUUID(),
                      product: "", code: "", unit: "", qty: "1"
                    }, { shouldFocus: false });

                    setTimeout(() => {
                      document.getElementById(`product-select-${items.length}`)?.focus();
                    }, 50);
                  }}
                  disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#49293e] hover:text-[#3a2132] hover:bg-[#49293e]/5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
            </div>
          </div>

          {/* ── Compact Action Footer ── */}
          <div className="border-t border-gray-200 bg-gray-50/50 p-3 rounded-b-2xl shrink-0 flex items-center justify-end gap-3">
            {canAdd && (
              <Button 
                type="button"
                variant="secondary" 
                onClick={() => {
                  if (items.length > 0) {
                    setShowClearConfirm(true);
                  } else {
                    form.reset();
                    setTimeout(() => document.getElementById("bom-name")?.focus(), 100);
                  }
                }}
                tabIndex={-1}
                isAction
                icon={<Plus size={16} />}
              >
                New
              </Button>
            )}
            {canSave && (
              <Button 
                id="bom-save-btn"
                type="button"
                isAction 
                icon={<Save size={16} />} 
                onClick={onSubmit} 
                disabled={saving} 
                loading={saving}
                tabIndex={12}
              >
                Save
              </Button>
            )}
            {canDelete && (
              <Button 
                type="button"
                variant="danger" 
                onClick={() => {
                  if (items.length > 0) setShowClearConfirm(true);
                }} 
                disabled={!canDelete || items.length === 0} 
                isAction
                icon={<Trash2 size={16} />}
                tabIndex={13}
              >
                Delete
              </Button>
            )}
          </div>

        </div>
      </FormProvider>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear Data"
        confirmVariant="danger"
        onConfirm={() => {
          form.reset();
          setShowClearConfirm(false);
          setTimeout(() => document.getElementById("bom-name")?.focus(), 100);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </PageShell>
  );
};

export default BomPage;
