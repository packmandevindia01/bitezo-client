import { useState, useRef, useEffect } from "react";
import { Modal, FormInput, Checkbox } from "../../../../components/common";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";
import { Search, Save, RotateCcw, Plus, X } from "lucide-react";
import { useDelivery } from "../hooks/useDelivery";
import { PosMoreAddressModal } from "./PosMoreAddressModal";
import type { DeliveryAddress } from "../types/delivery";

interface PosDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosDeliveryModal = ({ isOpen, onClose }: PosDeliveryModalProps) => {
  const { loading, fetchAddressByMobile, saveAddress } = useDelivery();
  const [isMoreAddressOpen, setIsMoreAddressOpen] = useState(false);
  
  const [form, setForm] = useState({
    mobileNo: "",
    customerName: "",
    isComing: false,
    flatNo: "",
    buildingNo: "",
    roadNo: "",
    blockNo: "",
    area: "",
    note: "",
    callBack: "",
    isMissedCall: false,
    keepChanges: ""
  });

  const [activeField, setActiveField] = useState<keyof typeof form | null>("mobileNo");
  const [showKeyboard, setShowKeyboard] = useState(true);
  const mobileRef = useRef<HTMLInputElement>(null);

  const handleClearForm = () => {
    setForm({
      mobileNo: "",
      customerName: "",
      isComing: false,
      flatNo: "",
      buildingNo: "",
      roadNo: "",
      blockNo: "",
      area: "",
      note: "",
      callBack: "",
      isMissedCall: false,
      keepChanges: ""
    });
    setTimeout(() => mobileRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (isOpen) {
      handleClearForm();
      setTimeout(() => mobileRef.current?.focus(), 100);
      setActiveField("mobileNo");
      setShowKeyboard(true); 
    }
  }, [isOpen]);

  // Lookup address when mobileNo changes
  useEffect(() => {
    const lookupMobile = async () => {
      if (form.mobileNo.length >= 8) { 
        const response = await fetchAddressByMobile(form.mobileNo);
        if (response && response.length > 0) {
          const existingAddress = response[0];
          setForm(prev => ({
            ...prev,
            customerName: existingAddress.customerName || "",
            flatNo: existingAddress.flatNo || "",
            buildingNo: existingAddress.buildingNo || "",
            roadNo: existingAddress.roadNo || "",
            blockNo: existingAddress.blockNo || "",
            area: existingAddress.area || "",
            note: existingAddress.note || ""
          }));
        }
      }
    };
    lookupMobile();
  }, [form.mobileNo, fetchAddressByMobile]);

  const handleInput = (val: string) => {
    if (!activeField) return;
    if (typeof form[activeField] === "string") {
      setForm({ ...form, [activeField]: (form[activeField] as string) + val });
    }
  };

  const handleBackspace = () => {
    if (!activeField) return;
    if (typeof form[activeField] === "string") {
      setForm({ ...form, [activeField]: (form[activeField] as string).slice(0, -1) });
    }
  };

  const handleClearKey = () => {
    if (!activeField) return;
    if (typeof form[activeField] === "string") {
      setForm({ ...form, [activeField]: "" });
    }
  };

  const handleFieldFocus = (field: keyof typeof form) => {
    setActiveField(field);
    setShowKeyboard(true);
  };

  const handleSave = async () => {
    if (!form.mobileNo) return;
    
    const success = await saveAddress({
      mobileNo: form.mobileNo,
      flatNo: form.flatNo,
      buildingNo: form.buildingNo,
      roadNo: form.roadNo,
      blockNo: form.blockNo,
      area: form.area,
      customerName: form.customerName,
      note: form.note
    });

    if (success) {
      onClose();
    }
  };

  const handleSelectAddressFromMore = (address: DeliveryAddress) => {
    setForm(prev => ({
      ...prev,
      flatNo: address.flatNo || "",
      buildingNo: address.buildingNo || "",
      roadNo: address.roadNo || "",
      blockNo: address.blockNo || "",
      area: address.area || "",
      customerName: address.customerName || "",
      note: address.note || ""
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      className="!max-w-full w-screen !max-h-full h-screen !rounded-none !m-0 bg-[#f8f9fa] flex flex-col shadow-none overflow-hidden z-[100]"
    >
      {/* Header - Premium Maroon */}
      <div className="flex items-center justify-between bg-[#49293e] px-6 py-3 text-white shrink-0 border-b border-white/10 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Search size={18} className="text-white" />
          </div>
          <h2 className="text-sm font-black tracking-[0.2em] uppercase">Delivery Details</h2>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-90">
          <X size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Content Area - Restored Original Vertical Design (High Density) */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          
          {/* Row 1: Primary Identity */}
          <div className="grid grid-cols-12 gap-4 items-end shrink-0">
            <div className="col-span-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Mobile Number</span>
              <FormInput
                value={form.mobileNo}
                onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
                onFocus={() => handleFieldFocus("mobileNo")}
                ref={mobileRef}
                inputMode="none"
                autoFocus
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
            <div className="col-span-6">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Customer Name</span>
              <FormInput
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                onFocus={() => handleFieldFocus("customerName")}
                inputMode="none"
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
            <div className="col-span-3 flex items-center gap-3 bg-slate-50 px-3 h-10 rounded-lg border border-slate-200">
               <Checkbox checked={form.isComing} onChange={(e) => setForm({ ...form, isComing: e.target.checked })} />
               <span className="text-[#9c142c] font-black text-[10px] uppercase">Coming</span>
               <button className="w-8 h-8 bg-[#49293e] rounded text-white flex items-center justify-center ml-auto" onClick={() => fetchAddressByMobile(form.mobileNo)}>
                 <Search size={16} />
               </button>
            </div>
          </div>

          {/* Row 2: Address Grid (5 Fields) */}
          <div className="grid grid-cols-5 gap-4 shrink-0">
            {[
              { id: 'flatNo', label: 'Flat' },
              { id: 'buildingNo', label: 'Building' },
              { id: 'roadNo', label: 'Road' },
              { id: 'blockNo', label: 'Block' },
              { id: 'area', label: 'Area' }
            ].map((field) => (
              <div key={field.id}>
                <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">{field.label}</span>
                <FormInput
                  value={(form as any)[field.id]}
                  onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
                  onFocus={() => handleFieldFocus(field.id as any)}
                  inputMode="none"
                  className="!mb-0"
                  inputClassName="!h-10 border-slate-200"
                />
              </div>
            ))}
          </div>

          {/* Row 3: Notes & Quick Actions */}
          <div className="grid grid-cols-12 gap-4 items-start shrink-0">
            <div className="col-span-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Notes</span>
              <FormInput 
                value={form.note} 
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                onFocus={() => handleFieldFocus("note")} 
                inputMode="none" 
                className="!mb-0" 
                inputClassName="!h-10 border-slate-200" 
              />
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Call Back</span>
              <FormInput 
                value={form.callBack} 
                onChange={(e) => setForm({ ...form, callBack: e.target.value })}
                onFocus={() => handleFieldFocus("callBack")} 
                inputMode="none" 
                className="!mb-0" 
                inputClassName="!h-10 border-slate-200" 
              />
            </div>
            <div className="col-span-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Changes</span>
              <div className="flex gap-2 h-10">
                {["5.000", "10.000", "20.000"].map((amt) => (
                  <button key={amt} onClick={() => setForm({ ...form, keepChanges: amt })} className="flex-1 bg-slate-50 hover:bg-[#49293e] hover:text-white text-slate-600 font-black text-[10px] rounded-lg border border-slate-200 transition-all">{amt}</button>
                ))}
              </div>
            </div>
            <div className="col-span-3 flex flex-col gap-2 pt-5">
              <button onClick={() => setIsMoreAddressOpen(true)} className="h-10 w-full bg-slate-800 text-white font-black text-[10px] uppercase rounded-lg flex items-center justify-center gap-2">
                <Plus size={14} /> More Address
              </button>
            </div>
          </div>

          {/* Row 4: Custom Exclusive Keyboard (Zero-Waste Alignment) */}
          {showKeyboard && (
            <div className="mt-auto shrink-0 flex justify-center">
              <div className="w-full max-w-[980px] bg-slate-900 rounded-2xl p-1.5 shadow-2xl border border-white/10 [&_button]:!h-14 [&_button]:!text-base [&_div]:!gap-1 [&_button]:!px-2 [&_.mb-3]:!hidden">
                <TouchKeyboard
                  onInput={handleInput}
                  onBackspace={handleBackspace}
                  onClear={handleClearKey}
                  onClose={() => setShowKeyboard(false)}
                  size="md"
                />
              </div>
            </div>
          )}
        </div>

        <PosMoreAddressModal
          isOpen={isMoreAddressOpen}
          onClose={() => setIsMoreAddressOpen(false)}
          mobileNo={form.mobileNo}
          onSelectAddress={handleSelectAddressFromMore}
        />

        {/* Action Footer */}
        <div className="bg-slate-100 p-3 flex justify-end gap-3 shrink-0 border-t border-slate-200">
          <button onClick={handleClearForm} className="h-11 px-8 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase rounded-xl border border-slate-200">Clear Form</button>
          <button 
            onClick={handleSave} 
            disabled={loading || !form.mobileNo}
            className="h-11 px-12 bg-[#49293e] hover:bg-[#633854] text-white font-black text-xs uppercase rounded-xl shadow-lg flex items-center gap-2"
          >
            {loading ? <RotateCcw className="animate-spin" size={16} /> : <Save size={16} />}
            Save Details
          </button>
        </div>
      </div>
    </Modal>
  );
};
