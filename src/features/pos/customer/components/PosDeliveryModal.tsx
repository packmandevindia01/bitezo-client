import { useState, useRef, useEffect } from "react";
import { Modal, FormInput, Button, Checkbox } from "../../../../components/common";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";
import { Search } from "lucide-react";
import { useDelivery } from "../hooks/useDelivery";

interface PosDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosDeliveryModal = ({ isOpen, onClose }: PosDeliveryModalProps) => {
  const { loading, fetchAddressByMobile, saveAddress } = useDelivery();
  
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
  // Focus
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
      handleClearForm(); // Clear form on every open
      setTimeout(() => mobileRef.current?.focus(), 100);
      setActiveField("mobileNo");
      setShowKeyboard(true); 
    } else {
      handleClearForm(); // Clear form on close as well
    }
  }, [isOpen]);

  // Lookup address when mobileNo changes
  useEffect(() => {
    const lookupMobile = async () => {
      if (form.mobileNo.length >= 4) { // Trigger lookup for mobile numbers like '1234'
        const existingAddress = await fetchAddressByMobile(form.mobileNo);
        if (existingAddress) {
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

  const handleFieldClick = (field: keyof typeof form) => {
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
      // Logic after successful save if needed
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      className="!max-w-[95vw] w-[95vw] xl:!max-w-[900px] !max-h-[95vh] h-auto bg-[#f8f9fa] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-[#49293e] px-4 py-2.5 text-white shrink-0 border-b-2 border-white/10">
        <h2 className="text-sm md:text-base font-black tracking-widest mx-auto uppercase">DELIVERY DETAILS</h2>
        <button onClick={onClose} className="text-white hover:text-red-400 absolute right-4 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-2 md:p-3 flex flex-col gap-1.5 overflow-y-auto min-h-0 flex-1 [&_.mb-4]:mb-0 [&_label]:text-[10px] [&_label]:md:text-xs [&_input]:h-8 [&_input]:md:h-9 [&_.h-12]:h-9 [&_.h-12]:md:h-10">
        {/* Row 1 */}
        <div className="flex flex-wrap md:flex-nowrap items-end gap-1.5">
          <div className="w-full md:w-[25%]">
            <FormInput
              label="Mobile No"
              value={form.mobileNo}
              onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
              onFocus={() => handleFieldFocus("mobileNo")}
              onClick={() => handleFieldClick("mobileNo")}
              ref={mobileRef}
              inputMode="none"
              autoFocus
            />
          </div>
          <div className="w-full md:w-[45%]">
            <FormInput
              label="Customer Name"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              onFocus={() => handleFieldFocus("customerName")}
              onClick={() => handleFieldClick("customerName")}
              inputMode="none"
            />
          </div>
          <div className="flex items-center gap-2 mb-0.5 md:w-[30%] shrink-0">
            <Checkbox
              label=""
              checked={form.isComing}
              onChange={(e) => setForm({ ...form, isComing: e.target.checked })}
            />
            <span className="text-[#9c142c] font-bold text-[10px] md:text-xs shrink-0">Coming(Come and Collect)</span>
            
            <button 
              className="ml-auto flex items-center justify-center w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg text-white shadow-md hover:scale-105 active:scale-95 transition-all"
              onClick={() => fetchAddressByMobile(form.mobileNo)}
              disabled={loading}
            >
              <Search size={16} strokeWidth={2.5} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
          <FormInput
            label="Flat No"
            value={form.flatNo}
            onChange={(e) => setForm({ ...form, flatNo: e.target.value })}
            onFocus={() => handleFieldFocus("flatNo")}
            onClick={() => handleFieldClick("flatNo")}
            inputMode="none"
          />
          <FormInput
            label="Building No"
            value={form.buildingNo}
            onChange={(e) => setForm({ ...form, buildingNo: e.target.value })}
            onFocus={() => handleFieldFocus("buildingNo")}
            onClick={() => handleFieldClick("buildingNo")}
            inputMode="none"
          />
          <FormInput
            label="Road No"
            value={form.roadNo}
            onChange={(e) => setForm({ ...form, roadNo: e.target.value })}
            onFocus={() => handleFieldFocus("roadNo")}
            onClick={() => handleFieldClick("roadNo")}
            inputMode="none"
          />
          <FormInput
            label="Block No"
            value={form.blockNo}
            onChange={(e) => setForm({ ...form, blockNo: e.target.value })}
            onFocus={() => handleFieldFocus("blockNo")}
            onClick={() => handleFieldClick("blockNo")}
            inputMode="none"
          />
          <FormInput
            label="Area"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            onFocus={() => handleFieldFocus("area")}
            onClick={() => handleFieldClick("area")}
            inputMode="none"
          />
        </div>

        {/* Row 3 */}
        <div className="flex flex-wrap md:flex-nowrap items-end gap-1.5">
          <div className="w-full md:w-[50%]">
            <FormInput
              label="Notes"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              onFocus={() => handleFieldFocus("note")}
              onClick={() => handleFieldClick("note")}
              inputMode="none"
            />
          </div>
          <div className="w-full md:w-[25%]">
            <FormInput
              label="Call Back"
              value={form.callBack}
              onChange={(e) => setForm({ ...form, callBack: e.target.value })}
              onFocus={() => handleFieldFocus("callBack")}
              onClick={() => handleFieldClick("callBack")}
              inputMode="none"
            />
          </div>
          <div className="flex items-center gap-2 mb-0.5 md:w-[25%]">
            <Checkbox
              label=""
              checked={form.isMissedCall}
              onChange={(e) => setForm({ ...form, isMissedCall: e.target.checked })}
            />
            <span className="text-[#9c142c] font-bold text-[10px] md:text-xs">Missed Call</span>
          </div>
        </div>

        {/* Row 4: Keep Changes + Action Buttons */}
        <div className="flex flex-wrap md:flex-nowrap items-end justify-between gap-1.5">
          <div className="w-full md:w-[30%]">
            <FormInput
              label="Keep Changes"
              value={form.keepChanges}
              onChange={(e) => setForm({ ...form, keepChanges: e.target.value })}
              onFocus={() => handleFieldFocus("keepChanges")}
              onClick={() => handleFieldClick("keepChanges")}
              inputClassName="text-right"
              inputMode="none"
            />
          </div>

          <div className="flex gap-1 mb-0.5">
            {["5.000", "10.000", "20.000"].map((amt) => (
              <button 
                key={amt}
                onClick={() => {
                  setForm({ ...form, keepChanges: amt });
                  setActiveField("keepChanges");
                }}
                className="bg-[#49293e] hover:bg-[#3a2131] text-white font-bold text-[10px] md:text-xs py-1.5 px-3 md:px-5 rounded shadow active:scale-95 transition-all"
              >
                {amt}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 w-full md:w-auto mb-0.5">
            <div className="flex gap-1">
              <button className="flex-1 bg-[#49293e] hover:bg-[#3a2131] text-white font-bold text-[10px] md:text-xs py-1.5 px-2 md:px-4 rounded shadow active:scale-95 transition-all">
                Update
              </button>
              <button className="flex-1 bg-[#49293e] hover:bg-[#3a2131] text-white font-bold text-[10px] md:text-xs py-1.5 px-2 md:px-4 rounded shadow active:scale-95 transition-all">
                More Address
              </button>
            </div>
            <button className="w-full bg-[#49293e] hover:bg-[#3a2131] text-white font-bold text-[10px] md:text-xs py-1.5 px-4 rounded shadow active:scale-95 transition-all">
              Logs
            </button>
          </div>
        </div>
        
        {/* Keyboard Area */}
        {showKeyboard && (
          <div className="mt-1 shrink-0 bg-white border border-slate-200 rounded-xl shadow-inner p-1 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
            <TouchKeyboard
              onInput={handleInput}
              onBackspace={handleBackspace}
              onClear={handleClearKey}
              onClose={() => setShowKeyboard(false)}
            />
          </div>
        )}

      </div>

      {/* Footer Actions */}
      <div className="bg-slate-200 p-3 flex justify-end gap-3 shrink-0 rounded-b-xl border-t border-slate-300">
        <Button 
          onClick={handleSave} 
          className="bg-[#49293e] hover:bg-[#3a2131] px-10 shadow-md min-w-[120px]"
          loading={loading}
          disabled={loading || !form.mobileNo}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button onClick={handleClearForm} className="bg-[#49293e] hover:bg-[#3a2131] px-10 shadow-md">
          Clear
        </Button>
      </div>

    </Modal>
  );
};

