import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Modal, FormInput, Button, ConfirmDialog, SelectInput } from "../../../../components/common";
import { useCustomer } from "../hooks/useCustomer";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";

interface PosCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosCustomerModal = ({ isOpen, onClose }: PosCustomerModalProps) => {
  const { form, setForm, loading, saveCustomer, deleteCustomer, resetForm } = useCustomer();
  const [activeField, setActiveField] = useState<keyof typeof form | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleInput = (val: string) => {
    if (!activeField) return;
    setForm({ ...form, [activeField]: (form[activeField] as string) + val });
  };

  const handleBackspace = () => {
    if (!activeField) return;
    setForm({ ...form, [activeField]: (form[activeField] as string).slice(0, -1) });
  };

  const handleClear = () => {
    if (!activeField) return;
    setForm({ ...form, [activeField]: "" });
  };

  const handleFieldFocus = (field: keyof typeof form) => {
    setActiveField(field);
    setShowKeyboard(true);
  };

  const handleFieldClick = (field: keyof typeof form) => {
    setActiveField(field);
    setShowKeyboard(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Master"
      className="!max-w-[95vw] w-[95vw] !max-h-[95vh] h-[95vh] bg-slate-50 flex flex-col"
    >
      <div className="flex flex-col flex-1 h-full min-h-0">
        {/* Action Bar (Top) */}
        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm mb-4 shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-black text-[#9c142c] uppercase animate-pulse">
            {showKeyboard && (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9Z"/></svg>
                Keyboard Active
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => {
                resetForm();
                setTimeout(() => firstInputRef.current?.focus(), 50);
              }} 
              disabled={loading} 
              isAction
              icon={<Plus size={20} />}
            />
            <Button 
              variant="danger" 
              onClick={() => setShowDeleteConfirm(true)} 
              disabled={loading || !form.id} 
              isAction
              icon={<Trash2 size={20} />}
            />
            <Button 
              onClick={saveCustomer} 
              loading={loading} 
              isAction
              icon={<Save size={20} />}
            />
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 overflow-y-auto p-2 md:p-6 bg-white rounded-xl shadow-inner border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            <div className="space-y-4">
              <FormInput
                label="Customer Code"
                value={form.customerCode}
                onChange={(e) => setForm({ ...form, customerCode: e.target.value.toUpperCase() })}
                onFocus={() => handleFieldFocus("customerCode")}
                onClick={() => handleFieldClick("customerCode")}
                placeholder="AUTO"
                readOnly
                inputMode="none"
              />
              <FormInput
                label="Customer Name"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                onFocus={() => handleFieldFocus("customerName")}
                onClick={() => handleFieldClick("customerName")}
                ref={firstInputRef}
                autoFocus
                required
                inputMode="none"
              />
              <FormInput
                label="Arabic Name"
                value={form.arabicName}
                onChange={(e) => setForm({ ...form, arabicName: e.target.value })}
                onFocus={() => handleFieldFocus("arabicName")}
                onClick={() => handleFieldClick("arabicName")}
                inputClassName="text-right font-arabic"
                inputMode="none"
              />
              <FormInput
                label="Mobile No"
                value={form.mobileNo}
                onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
                onFocus={() => handleFieldFocus("mobileNo")}
                onClick={() => handleFieldClick("mobileNo")}
                required
                inputMode="none"
              />
              <FormInput
                label="Tel No"
                value={form.telNo}
                onChange={(e) => setForm({ ...form, telNo: e.target.value })}
                onFocus={() => handleFieldFocus("telNo")}
                onClick={() => handleFieldClick("telNo")}
                inputMode="none"
              />
              <FormInput
                label="Email"
                value={form.email}
                type="email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onFocus={() => handleFieldFocus("email")}
                onClick={() => handleFieldClick("email")}
                inputMode="none"
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1 w-full mb-4">
                <label className="text-xs md:text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  onFocus={() => handleFieldFocus("address")}
                  onClick={() => handleFieldClick("address")}
                  className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 resize-y min-h-[80px]"
                  placeholder="Enter full address"
                />
              </div>

              <FormInput
                label="Area"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                onFocus={() => handleFieldFocus("area")}
                onClick={() => handleFieldClick("area")}
                inputMode="none"
              />
              <FormInput
                label="Identity No"
                value={form.identityNo}
                onChange={(e) => setForm({ ...form, identityNo: e.target.value })}
                onFocus={() => handleFieldFocus("identityNo")}
                onClick={() => handleFieldClick("identityNo")}
                inputMode="none"
              />
              <FormInput
                label="TRN No"
                value={form.trnNo}
                onChange={(e) => setForm({ ...form, trnNo: e.target.value })}
                onFocus={() => handleFieldFocus("trnNo")}
                onClick={() => handleFieldClick("trnNo")}
                inputMode="none"
              />
              <SelectInput
                label="Branch"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                options={[{ label: "Select Branch...", value: "" }, { label: "Main Branch", value: "main" }]}
              />
              <FormInput
                label="Opening Balance"
                type="number"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                onFocus={() => handleFieldFocus("openingBalance")}
                onClick={() => handleFieldClick("openingBalance")}
                inputClassName="text-right"
                inputMode="none"
              />
            </div>
          </div>
        </div>

        {/* Keyboard Section - Slides up over content */}
        {showKeyboard && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[-0_-10px_40px_rgba(0,0,0,0.1)] z-10 transition-transform duration-300 transform translate-y-0 p-2 md:p-3">
            <TouchKeyboard
              onInput={handleInput}
              onBackspace={handleBackspace}
              onClear={handleClear}
              onClose={() => setShowKeyboard(false)}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (form.id) deleteCustomer(form.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
      />
    </Modal>
  );
};
