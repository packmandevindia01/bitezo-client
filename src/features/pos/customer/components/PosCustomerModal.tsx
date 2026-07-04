import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Modal, FormInput, Button, ConfirmDialog, SelectInput } from "../../../../components/common";
import { useCustomer } from "../hooks/useCustomer";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";
import { FormProvider } from "react-hook-form";
import { getDecimalPart } from "../../../../utils/currency";
import { handleFocusNextInput } from "../../../../utils/keyboard";

interface PosCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosCustomerModal = ({ isOpen, onClose }: PosCustomerModalProps) => {
  const { methods, loading, saveCustomer, deleteCustomer, resetForm } = useCustomer(onClose);
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(true);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  
  const firstInputRef = useRef<HTMLInputElement>(null);

  const { register, formState: { errors }, watch } = methods;
  const customerId = watch("id");

  const handleFormSubmit = methods.handleSubmit((data) => {
    setPendingData(data);
    setShowSaveConfirm(true);
  });

  const handleConfirmSave = () => {
    if (pendingData) {
      saveCustomer(pendingData);
    }
    setShowSaveConfirm(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setIsKeyboardEnabled(true);
      setShowKeyboard(true);
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleInputFocus = () => {
    if (isKeyboardEnabled) {
      setShowKeyboard(true);
    }
  };

  const step = Math.pow(10, -getDecimalPart()).toString();

  const { ref: nameFormRef, ...nameRegister } = register("customerName");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Master"
      className="!max-w-[95vw] w-[95vw] !max-h-[95vh] h-[95vh] bg-slate-50 flex flex-col"
    >
      <FormProvider {...methods}>
        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 h-full min-h-0">
          {/* Action Bar (Top) */}
          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-4 shrink-0">
            <div>
              <button 
                type="button"
                onClick={() => {
                  const newVal = !isKeyboardEnabled;
                  setIsKeyboardEnabled(newVal);
                  setShowKeyboard(newVal);
                  setTimeout(() => firstInputRef.current?.focus(), 50);
                }}
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg border transition-all ${
                  isKeyboardEnabled 
                    ? "text-[#49293e] bg-[#49293e]/5 border-[#49293e]/20 hover:bg-[#49293e]/10" 
                    : "text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M11 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9Z"/>
                </svg>
                {isKeyboardEnabled ? "Keyboard: Touch" : "Keyboard: Physical"}
              </button>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={(e) => {
                  e.preventDefault();
                  resetForm();
                  setTimeout(() => firstInputRef.current?.focus(), 50);
                }} 
                disabled={loading} 
                isAction
                icon={<Plus size={20} />}
                tabIndex={-1}
              />
              <Button 
                variant="danger" 
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteConfirm(true);
                }} 
                disabled={loading || !customerId} 
                isAction
                icon={<Trash2 size={20} />}
                tabIndex={13}
              />
              <Button 
                type="submit"
                loading={loading} 
                isAction
                icon={<Save size={20} />}
                tabIndex={12}
              />
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1 overflow-y-auto p-2 md:p-6 bg-white rounded-xl shadow-inner border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <div className="space-y-4">
                <FormInput
                  label="Customer Code"
                  {...register("customerCode")}
                  placeholder="AUTO"
                  readOnly
                  inputMode="none"
                  tabIndex={-1}
                />
                <FormInput
                  label="Customer Name"
                  required
                  {...nameRegister}
                  ref={(el) => {
                    nameFormRef(el);
                    (firstInputRef as any).current = el;
                  }}
                  error={errors.customerName?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={1}
                />
                <FormInput
                  label="Arabic Name"
                  {...register("arabicName")}
                  error={errors.arabicName?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputClassName="text-right font-arabic"
                  inputMode="none"
                  tabIndex={3}
                />
                <FormInput
                  label="Mobile No"
                  required
                  {...register("mobileNo")}
                  error={errors.mobileNo?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={5}
                />
                <FormInput
                  label="Tel No"
                  {...register("telNo")}
                  error={errors.telNo?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={7}
                />
                <FormInput
                  label="Email"
                  type="email"
                  {...register("email")}
                  error={errors.email?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={9}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1 w-full mb-1 relative">
                  <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5 min-w-0">
                    Address
                    {errors.address && (
                      <span className="text-[10px] text-red-500 font-bold ml-2 normal-case truncate shrink">
                        ({errors.address.message})
                      </span>
                    )}
                  </label>
                  <textarea
                    {...register("address")}
                    onFocus={handleInputFocus}
                    onClick={handleInputFocus}
                    className={`w-full px-4 py-2 text-sm rounded-md border outline-none transition resize-y min-h-[80px] ${
                      errors.address ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"
                    } focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20`}
                    placeholder="Enter full address"
                    inputMode="none"
                    tabIndex={2}
                  />
                </div>

                <FormInput
                  label="Area"
                  {...register("area")}
                  error={errors.area?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={4}
                />
                <FormInput
                  label="Identity No"
                  {...register("identityNo")}
                  error={errors.identityNo?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={6}
                />
                <FormInput
                  label="TRN No"
                  {...register("trnNo")}
                  error={errors.trnNo?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={8}
                />
                <SelectInput
                  label="Branch"
                  placeholder="Select Branch..."
                  {...register("branch")}
                  error={errors.branch?.message}
                  tabIndex={10}
                  onFocus={(e) => {
                    try {
                      e.target.showPicker();
                    } catch (err) {
                      // Fallback for older browsers
                    }
                  }}
                  onChange={(e) => {
                    register("branch").onChange(e);
                    setTimeout(() => {
                      handleFocusNextInput(e.target as HTMLElement);
                    }, 50);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      setTimeout(() => {
                        handleFocusNextInput(e.target as HTMLElement);
                      }, 50);
                    }
                  }}
                  options={[
                    { label: "Main Branch", value: "main" }
                  ]}
                />
                <FormInput
                  label="Opening Balance"
                  type="number"
                  step={step}
                  {...register("openingBalance")}
                  error={errors.openingBalance?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputClassName="text-right"
                  inputMode="none"
                  tabIndex={11}
                />
              </div>
            </div>
          </div>

          {/* Keyboard Section - Participates in layout to allow scrolling to covered inputs */}
          {showKeyboard && (
            <div className="bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 p-2 md:p-3 shrink-0">
              <TouchKeyboard
                onClose={() => setShowKeyboard(false)}
              />
            </div>
          )}
        </form>
      </FormProvider>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (customerId) deleteCustomer(Number(customerId));
          setShowDeleteConfirm(false);
        }}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
      />

      <ConfirmDialog
        isOpen={showSaveConfirm}
        onCancel={() => setShowSaveConfirm(false)}
        onConfirm={handleConfirmSave}
        title="Save Customer"
        message="Are you sure you want to save this customer?"
        confirmLabel="Save"
        confirmVariant="primary"
      />
    </Modal>
  );
};
