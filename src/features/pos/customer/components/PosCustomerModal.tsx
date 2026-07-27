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
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  
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
      if (window.innerWidth > 1024) {
        setTimeout(() => firstInputRef.current?.focus(), 100);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsCompactViewport(window.innerWidth < 1200 || window.innerHeight < 820);
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  const handleInputFocus = () => {
    if (isKeyboardEnabled) {
      setShowKeyboard(true);
    }
  };

  const step = Math.pow(10, -getDecimalPart()).toString();
  
  const { ref: codeFormRef, ...codeRegister } = register("customerCode");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noScroll
      noPadding
      className="!max-w-[95vw] w-[95vw] !max-h-[95vh] h-[95vh] !rounded-none !m-0 bg-[#f8f9fa] flex flex-col shadow-none overflow-hidden z-[100]"
    >
      <FormProvider {...methods}>
        <form 
          onSubmit={handleFormSubmit} 
          className="flex flex-col flex-1 h-full min-h-0 bg-slate-50"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const target = e.target as HTMLElement;
              
              if (target.tagName !== "BUTTON") {
                // Allow Shift+Enter for new lines in textarea
                if (target.tagName === "TEXTAREA" && e.shiftKey) {
                  return;
                }
                e.preventDefault();
                handleFocusNextInput(target);
              }
            }
          }}
        >
          
          {/* Header - Premium Maroon */}
          <div className="flex items-center justify-between bg-[#49293e] px-4 py-3 text-white shrink-0 border-b border-white/10 relative flex-wrap gap-4 shadow-md z-20">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
              </div>
              <h2 className="text-sm font-black tracking-[0.2em] uppercase whitespace-nowrap">Customer Master</h2>
            </div>
            
            <div className="flex items-center gap-3 ml-auto">
              <button 
                type="button"
                onClick={() => {
                  const newVal = !isKeyboardEnabled;
                  setIsKeyboardEnabled(newVal);
                  setShowKeyboard(newVal);
                  setTimeout(() => firstInputRef.current?.focus(), 50);
                }}
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-all border ${
                  isKeyboardEnabled 
                    ? "text-[#49293e] bg-white border-white hover:bg-slate-100 shadow-sm" 
                    : "text-white/70 bg-white/10 border-white/20 hover:bg-white/20"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M11 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9Z"/>
                </svg>
                {isKeyboardEnabled ? "Touch Keyboard" : "Physical Keyboard"}
              </button>

              <div className="w-px h-6 bg-white/20 mx-1"></div>

              <Button 
                variant="secondary" 
                onClick={(e) => {
                  e.preventDefault();
                  resetForm();
                  setTimeout(() => firstInputRef.current?.focus(), 50);
                }} 
                disabled={loading} 
                isAction
                icon={<Plus size={18} />}
                tabIndex={13}
              >
                New
              </Button>
              <Button 
                variant="danger" 
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteConfirm(true);
                }} 
                disabled={loading || !customerId} 
                isAction
                icon={<Trash2 size={18} />}
                tabIndex={14}
              >
                Delete
              </Button>
              <Button 
                type="submit"
                loading={loading} 
                isAction
                icon={<Save size={18} />}
                tabIndex={15}
                className="!bg-green-600 hover:!bg-green-700 !border-green-600"
              >
                Save
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
                tabIndex={16}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 hide-scrollbar relative z-10">
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Primary Details Card */}
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/60">
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Primary Details</h3>
                </div>
                
                <div className="space-y-4">
                <FormInput
                  label="Customer Code"
                  required
                  {...codeRegister}
                  ref={(el) => {
                    codeFormRef(el);
                    (firstInputRef as any).current = el;
                  }}
                  error={errors.customerCode?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  placeholder="Enter Code"
                  inputMode="none"
                  tabIndex={1}
                />
                <FormInput
                  label="Customer Name"
                  required
                  {...register("customerName")}
                  error={errors.customerName?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={2}
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
                  tabIndex={4}
                />
                <FormInput
                  label="Tel No"
                  {...register("telNo")}
                  error={errors.telNo?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={5}
                />
                <FormInput
                  label="Email"
                  {...register("email")}
                  error={errors.email?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={6}
                />
              </div>
              </div>
              
              {/* Address & Billing Card */}
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/60">
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Address & Billing</h3>
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
                    tabIndex={7}
                  />
                </div>

                <FormInput
                  label="Area"
                  {...register("area")}
                  error={errors.area?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={8}
                />
                <FormInput
                  label="Identity No"
                  {...register("identityNo")}
                  error={errors.identityNo?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={9}
                />
                <FormInput
                  label="TRN No"
                  {...register("trnNo")}
                  error={errors.trnNo?.message}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  inputMode="none"
                  tabIndex={10}
                />
                <SelectInput
                  label="Branch"
                  placeholder="Select Branch..."
                  {...register("branch")}
                  error={errors.branch?.message}
                  tabIndex={11}
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
                  tabIndex={12}
                />
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Section */}
          {showKeyboard && (
            <div className={`shrink-0 w-full bg-[#f8f9fa] mt-auto ${isCompactViewport ? "px-1 pb-1" : "px-3 lg:px-4 pb-2"} border-t border-slate-100`}>
              <div className={`w-full ${isCompactViewport ? "max-w-[900px]" : "max-w-[1000px]"} mx-auto bg-gradient-to-b from-[#faf8f9] to-[#f3edf0] border border-slate-300 shadow-[0_15px_40px_rgba(73,41,62,0.08)] rounded-2xl ${isCompactViewport ? "p-1" : "p-2 lg:p-2.5"}`}>
                <TouchKeyboard
                  onClose={() => setShowKeyboard(false)}
                  size={isCompactViewport ? "md" : "lg"}
                  embedded={true}
                />
              </div>
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
