import { useState, useRef, useEffect } from "react";
import { Modal, FormInput, Checkbox, Button } from "../../../../components/common";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";
import { Search, Save, RotateCcw, X } from "lucide-react";
import { useDelivery } from "../hooks/useDelivery";
import { PosMoreAddressModal } from "./PosMoreAddressModal";
import type { DeliveryAddress } from "../types/delivery";
import { useAppDispatch } from "../../../../app/hooks";
import { setOrderType, setAddressId } from "../../terminal/store/posSlice";

interface PosDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosDeliveryModal = ({ isOpen, onClose }: PosDeliveryModalProps) => {
  const { loading, fetchAddressByMobile, saveAddress } = useDelivery();
  const dispatch = useAppDispatch();
  const [isMoreAddressOpen, setIsMoreAddressOpen] = useState(false);
  const [currentAddressId, setCurrentAddressId] = useState<number | null>(null);
  const lastLookedUpMobileRef = useRef("");
  const lastLoadedAddressRef = useRef<Partial<DeliveryAddress> | null>(null);
  
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

  // High-density sequential focus refs for smooth cashier navigation
  const mobileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const flatRef = useRef<HTMLInputElement>(null);
  const buildingRef = useRef<HTMLInputElement>(null);
  const roadRef = useRef<HTMLInputElement>(null);
  const blockRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const callBackRef = useRef<HTMLInputElement>(null);
  const keepChangesRef = useRef<HTMLInputElement>(null);

  // Seamless Enter key focus router with text auto-selection
  const handleEnterKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    nextFieldRef: React.RefObject<HTMLInputElement | null> | "save"
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldRef === "save") {
        handleSave();
      } else {
        const nextEl = nextFieldRef.current;
        if (nextEl) {
          nextEl.focus();
          setTimeout(() => {
            try {
              nextEl.setSelectionRange(0, nextEl.value.length);
            } catch (err) {
              nextEl.select?.();
            }
          }, 20);
        }
      }
    }
  };

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
    setCurrentAddressId(null);
    lastLookedUpMobileRef.current = "";
    lastLoadedAddressRef.current = null;
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
      const trimmed = form.mobileNo.trim();
      if (trimmed.length >= 8 && trimmed !== lastLookedUpMobileRef.current) { 
        lastLookedUpMobileRef.current = trimmed;
        const response = await fetchAddressByMobile(trimmed);
        if (response && response.length > 0) {
          const existingAddress = response[0];
          const addrData = {
            customerName: existingAddress.customerName || "",
            flatNo: existingAddress.flatNo || "",
            buildingNo: existingAddress.buildingNo || "",
            roadNo: existingAddress.roadNo || "",
            blockNo: existingAddress.blockNo || "",
            area: existingAddress.area || "",
            note: existingAddress.note || ""
          };
          setForm(prev => ({
            ...prev,
            ...addrData
          }));
          if (existingAddress.addressId) {
            setCurrentAddressId(existingAddress.addressId);
            lastLoadedAddressRef.current = { ...addrData, addressId: existingAddress.addressId };
          }
        }
      } else if (trimmed.length < 8) {
        lastLookedUpMobileRef.current = "";
        setCurrentAddressId(null);
        lastLoadedAddressRef.current = null;
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
    
    // Check if the current form matches the last loaded/saved address exactly
    const isUnchanged = lastLoadedAddressRef.current &&
      currentAddressId === lastLoadedAddressRef.current.addressId &&
      form.customerName === (lastLoadedAddressRef.current.customerName || "") &&
      form.flatNo === (lastLoadedAddressRef.current.flatNo || "") &&
      form.buildingNo === (lastLoadedAddressRef.current.buildingNo || "") &&
      form.roadNo === (lastLoadedAddressRef.current.roadNo || "") &&
      form.blockNo === (lastLoadedAddressRef.current.blockNo || "") &&
      form.area === (lastLoadedAddressRef.current.area || "") &&
      form.note === (lastLoadedAddressRef.current.note || "");

    if (isUnchanged && currentAddressId) {
      // Bypasses the POST API to prevent duplicate records!
      dispatch(setAddressId(currentAddressId));
      dispatch(setOrderType("delivery"));
      onClose();
      return;
    }
    
    const responseData = await saveAddress({
      mobileNo: form.mobileNo,
      flatNo: form.flatNo,
      buildingNo: form.buildingNo,
      roadNo: form.roadNo,
      blockNo: form.blockNo,
      area: form.area,
      customerName: form.customerName,
      note: form.note
    });

    if (responseData) {
      if (responseData.id) {
        dispatch(setAddressId(responseData.id));
      } else if (currentAddressId) {
        dispatch(setAddressId(currentAddressId));
      }
      dispatch(setOrderType("delivery"));
      onClose();
    } else if (currentAddressId) {
      dispatch(setAddressId(currentAddressId));
      dispatch(setOrderType("delivery"));
      onClose();
    }
  };

  const handleSelectAddressFromMore = (address: DeliveryAddress) => {
    const addrData = {
      flatNo: address.flatNo || "",
      buildingNo: address.buildingNo || "",
      roadNo: address.roadNo || "",
      blockNo: address.blockNo || "",
      area: address.area || "",
      customerName: address.customerName || "",
      note: address.note || ""
    };
    setForm(prev => ({
      ...prev,
      ...addrData
    }));
    if (address.addressId) {
      setCurrentAddressId(address.addressId);
      lastLoadedAddressRef.current = { ...addrData, addressId: address.addressId };
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      className="!max-w-full w-screen !max-h-full h-[100dvh] max-h-[100dvh] !rounded-none !m-0 bg-[#f8f9fa] flex flex-col shadow-none overflow-hidden z-[100]"
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

      {/* Content Area - Carbon Copy Layout from Reference Image (High Density) */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Scrollable Form Fields (prevents clipping on smaller viewports!) */}
        <div className="flex-1 overflow-y-auto p-4 gap-y-3.5 flex flex-col">
          
          {/* Row 1: Primary Identity & Round Search Icon */}
          <div className="grid grid-cols-12 gap-3 items-end shrink-0">
            <div className="col-span-3">
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Mobile No</span>
              <FormInput
                value={form.mobileNo}
                onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
                onFocus={() => handleFieldFocus("mobileNo")}
                onClick={() => setShowKeyboard(true)}
                ref={mobileRef}
                onKeyDown={(e) => handleEnterKey(e, nameRef)}
                inputMode="none"
                autoFocus
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
            <div className="col-span-5">
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Customer Name</span>
              <FormInput
                ref={nameRef}
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                onFocus={() => handleFieldFocus("customerName")}
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, flatRef)}
                inputMode="none"
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
            <div className="col-span-3 flex items-center gap-2 h-10 self-end pb-2">
               <Checkbox checked={form.isComing} onChange={(e) => setForm({ ...form, isComing: e.target.checked })} />
               <span className="text-[#9c142c] font-black text-[10px] uppercase">Coming(Come and Collect)</span>
            </div>
            <div className="col-span-1 flex justify-end">
               <button 
                 onClick={() => fetchAddressByMobile(form.mobileNo)}
                 className="w-10 h-10 bg-[#e01a4f] hover:bg-[#c91241] rounded-full text-white flex items-center justify-center shadow-lg active:scale-95 transition-all self-end"
               >
                 <Search size={18} strokeWidth={3} />
               </button>
            </div>
          </div>

          {/* Row 2: Address Grid (5 Fields - explicitly mapped for precise Enter progression) */}
          <div className="grid grid-cols-5 gap-3 shrink-0">
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Flat No</span>
              <FormInput
                ref={flatRef}
                value={form.flatNo}
                onChange={(e) => setForm({ ...form, flatNo: e.target.value })}
                onFocus={() => handleFieldFocus("flatNo")}
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, buildingRef)}
                inputMode="none"
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Building No</span>
              <FormInput
                ref={buildingRef}
                value={form.buildingNo}
                onChange={(e) => setForm({ ...form, buildingNo: e.target.value })}
                onFocus={() => handleFieldFocus("buildingNo")}
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, roadRef)}
                inputMode="none"
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Road</span>
              <FormInput
                ref={roadRef}
                value={form.roadNo}
                onChange={(e) => setForm({ ...form, roadNo: e.target.value })}
                onFocus={() => handleFieldFocus("roadNo")}
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, blockRef)}
                inputMode="none"
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Block</span>
              <FormInput
                ref={blockRef}
                value={form.blockNo}
                onChange={(e) => setForm({ ...form, blockNo: e.target.value })}
                onFocus={() => handleFieldFocus("blockNo")}
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, areaRef)}
                inputMode="none"
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Area</span>
              <FormInput
                ref={areaRef}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                onFocus={() => handleFieldFocus("area")}
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, noteRef)}
                inputMode="none"
                className="!mb-0"
                inputClassName="!h-10 border-slate-200"
              />
            </div>
          </div>

          {/* Row 3: Notes & Quick Actions */}
          <div className="grid grid-cols-12 gap-3 items-end shrink-0">
            <div className="col-span-4">
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Notes</span>
              <FormInput 
                ref={noteRef}
                value={form.note} 
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                onFocus={() => handleFieldFocus("note")} 
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, callBackRef)}
                inputMode="none" 
                className="!mb-0" 
                inputClassName="!h-10 border-slate-200" 
              />
            </div>
            <div className="col-span-3">
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Call Back</span>
              <FormInput 
                ref={callBackRef}
                value={form.callBack} 
                onChange={(e) => setForm({ ...form, callBack: e.target.value })}
                onFocus={() => handleFieldFocus("callBack")} 
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, keepChangesRef)}
                inputMode="none" 
                className="!mb-0" 
                inputClassName="!h-10 border-slate-200" 
              />
            </div>
            <div className="col-span-2 flex items-center gap-2 h-10 pb-2">
               <Checkbox checked={form.isMissedCall} onChange={(e) => setForm({ ...form, isMissedCall: e.target.checked })} />
               <span className="text-[#9c142c] font-black text-[10px] uppercase">Missed Call</span>
            </div>
            <div className="col-span-3 grid grid-cols-2 gap-2">
              <button 
                onClick={handleSave} 
                disabled={loading || !form.mobileNo}
                className="h-10 bg-[#1d2736] hover:bg-[#2b3a4f] text-white font-black text-[10px] uppercase rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
              >
                Update
              </button>
              <button 
                onClick={() => setIsMoreAddressOpen(true)} 
                className="h-10 bg-[#1d2736] hover:bg-[#2b3a4f] text-white font-black text-[10px] uppercase rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center"
              >
                More Address
              </button>
            </div>
          </div>

          {/* Row 4: Keep Changes, Currency, Logs */}
          <div className="grid grid-cols-12 gap-3 items-end shrink-0">
            <div className="col-span-4">
              <span className="text-[10px] font-bold text-slate-600 uppercase ml-1 block mb-1">Keep Changes</span>
              <FormInput 
                ref={keepChangesRef}
                value={form.keepChanges} 
                onChange={(e) => setForm({ ...form, keepChanges: e.target.value })}
                onFocus={() => handleFieldFocus("keepChanges")} 
                onClick={() => setShowKeyboard(true)}
                onKeyDown={(e) => handleEnterKey(e, "save")}
                inputMode="none" 
                className="!mb-0" 
                inputClassName="!h-10 border-slate-200" 
              />
            </div>
            <div className="col-span-5">
              <div className="grid grid-cols-3 gap-2 h-10">
                {["5.000", "10.000", "20.000"].map((amt) => (
                  <button 
                    key={amt} 
                    onClick={() => setForm({ ...form, keepChanges: amt })} 
                    className="bg-[#1d2736] hover:bg-[#2b3a4f] text-white font-black text-[10px] rounded-lg shadow-md transition-all active:scale-95"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-3">
              <button 
                onClick={() => alert("Logs Clicked")}
                className="h-10 w-full bg-[#1d2736] hover:bg-[#2b3a4f] text-white font-black text-[10px] uppercase rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center"
              >
                Logs
              </button>
            </div>
          </div>
        </div>

        {/* Row 5: Touch Keyboard (Centered, Spacious Native Chassis - Zero Overlapping) */}
        {showKeyboard && (
          <div className="shrink-0 w-full bg-[#f8f9fa] px-4 pb-2 border-t border-slate-100">
            <div className="w-full bg-gradient-to-b from-[#2c1924] to-[#170c12] border border-[#49293e]/40 shadow-xl rounded-2xl p-3 sm:p-4">
              <TouchKeyboard
                onInput={handleInput}
                onBackspace={handleBackspace}
                onClear={handleClearKey}
                onClose={() => setShowKeyboard(false)}
                size="md"
                embedded={true}
              />
            </div>
          </div>
        )}

        <PosMoreAddressModal
          isOpen={isMoreAddressOpen}
          onClose={() => setIsMoreAddressOpen(false)}
          mobileNo={form.mobileNo}
          customerName={form.customerName}
          onSelectAddress={handleSelectAddressFromMore}
        />

        {/* Action Footer - High Density, Elegant Buttons */}
        <div className="bg-slate-100 p-3 flex justify-end gap-3 shrink-0 border-t border-slate-200">
          <Button 
            onClick={handleClearForm} 
            variant="secondary"
            isAction
            tabIndex={-1}
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !form.mobileNo}
            loading={loading}
            isAction
            icon={<Save size={18} />}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};
