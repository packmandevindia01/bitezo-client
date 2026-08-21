import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Search, Save, RotateCcw, Truck, Keyboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FormInput, Checkbox, Button } from "../../../../components/common";
import { PosDeliveryKeyboard } from "../components/PosDeliveryKeyboard";
import { useDelivery } from "../hooks/useDelivery";
import { PosMoreAddressModal } from "../components/PosMoreAddressModal";
import type { DeliveryAddress } from "../types/delivery";
import { useAppDispatch } from "../../../../app/hooks";
import {
  setOrderTypeByName,
  setAddressId,
  setContactNo,
  setNote,
  setMissedCall,
  setIsComing,
  setChange
} from "../../terminal/store/posSlice";
import { useToast } from "../../../../app/providers/useToast";

interface PosDeliveryPageProps {
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const PosDeliveryPage: React.FC<PosDeliveryPageProps> = ({
  isModal = false,
  onCloseModal,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { loading, fetchAddressByMobile, saveAddress } = useDelivery();

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
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  // Focus refs
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

  const handleBack = () => {
    if (isModal && onCloseModal) {
      onCloseModal();
    } else {
      navigate("/pos", { state: { skipAutoDineIn: true } });
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
    handleClearForm();
    setTimeout(() => mobileRef.current?.focus(), 100);
    setActiveField("mobileNo");
    setShowKeyboard(true);
  }, []);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsCompactViewport(window.innerWidth < 1200 || window.innerHeight < 820);
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  // Mobile address lookup
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

  const handleFieldChange = (field: keyof typeof form, val: string) => {
    if (field === "mobileNo" || field === "callBack") {
      if (!/^[0-9]*$/.test(val)) return;
      if (val.length > 15) return;
    } else if (field === "customerName") {
      if (!/^[a-zA-Z\s'-]*$/.test(val)) return;
      if (val.length > 50) return;
    } else if (["flatNo", "buildingNo", "roadNo", "blockNo", "area"].includes(field as string)) {
      if (!/^[a-zA-Z0-9\s,#-]*$/.test(val)) return;
      if (val.length > 30) return;
    } else if (field === "note") {
      if (val.length > 100) return;
    } else if (field === "keepChanges") {
      if (!/^[0-9.]*$/.test(val)) return;
      if (val.length > 10) return;
    }
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleInput = (val: string) => {
    if (!activeField) return;
    if (typeof form[activeField] === "string") {
      const currentVal = form[activeField] as string;
      handleFieldChange(activeField, currentVal + val);
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

  const applyDeliveryFieldsToStore = () => {
    dispatch(setContactNo(form.mobileNo));
    dispatch(setNote(form.note));
    dispatch(setMissedCall(form.isMissedCall));
    dispatch(setIsComing(form.isComing));
    dispatch(setChange(form.keepChanges));
  };

  const handleSave = async () => {
    if (!form.mobileNo.trim() || !form.customerName.trim()) {
      showToast("Both Mobile No and Customer Name are required", "error");
      return;
    }

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
      applyDeliveryFieldsToStore();
      dispatch(setAddressId(currentAddressId));
      dispatch(setOrderTypeByName("Delivery"));
      handleBack();
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
      applyDeliveryFieldsToStore();
      if (responseData.id) {
        dispatch(setAddressId(responseData.id));
      } else if (currentAddressId) {
        dispatch(setAddressId(currentAddressId));
      }
      dispatch(setOrderTypeByName("Delivery"));
      handleBack();
    } else if (currentAddressId) {
      applyDeliveryFieldsToStore();
      dispatch(setAddressId(currentAddressId));
      dispatch(setOrderTypeByName("Delivery"));
      handleBack();
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
    <div className="w-screen h-screen min-h-screen bg-slate-100 flex flex-col overflow-hidden select-none z-[100] fixed inset-0">
      {/* POS Page Header Bar - Deep Burgundy */}
      <header className="flex items-center justify-between bg-[#49293e] px-4 md:px-6 h-[54px] md:h-[60px] text-white shrink-0 shadow-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all text-xs font-bold"
          >
            <ChevronLeft size={18} />
            <span>POS</span>
          </button>
          <div className="h-5 w-[1px] bg-white/20" />
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-amber-400" />
            <h1 className="text-sm md:text-base font-black tracking-[0.15em] uppercase">Delivery Details</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleClearForm}
            variant="secondary"
            isAction
            tabIndex={-1}
            icon={<RotateCcw size={16} />}
            className="!h-9 text-xs"
          >
            Clear
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !form.mobileNo}
            loading={loading}
            isAction
            icon={<Save size={16} />}
            className="!h-9 bg-emerald-600 hover:bg-emerald-500 border-transparent text-white font-bold text-xs"
          >
            Save Delivery
          </Button>
        </div>
      </header>

      {/* Main Page Layout Container */}
      <main className="flex-1 flex flex-col justify-between overflow-hidden min-h-0 bg-[#f4f0f2]">
        
        {/* Form Fields Canvas */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 pt-2 sm:pt-3 md:pt-4 flex flex-col justify-start max-w-[1300px] w-full mx-auto">
          
          {/* Unified Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4.5 md:p-5 shadow-sm flex flex-col gap-3 sm:gap-3.5 md:gap-4 w-full">
            
            {/* Row 1: Primary Identity (Mobile No + Search & Customer Name & Coming Toggle) */}
            <div className="grid grid-cols-12 gap-3 md:gap-4 items-end">
              <div className="col-span-12 md:col-span-4">
                <FormInput
                  label="Mobile No"
                  required
                  value={form.mobileNo}
                  onChange={(e) => handleFieldChange("mobileNo", e.target.value)}
                  onFocus={() => handleFieldFocus("mobileNo")}
                  onClick={() => setShowKeyboard(true)}
                  ref={mobileRef}
                  onKeyDown={(e) => handleEnterKey(e, nameRef)}
                  inputMode="none"
                  autoFocus={window.innerWidth > 1024}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => fetchAddressByMobile(form.mobileNo)}
                      title="Search Customer Address"
                      className="px-2.5 py-1 bg-[#49293e] hover:bg-[#381f30] text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <Search size={13} strokeWidth={2.5} />
                      <span>Search</span>
                    </button>
                  }
                  inputClassName={
                    activeField === "mobileNo"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div className="col-span-12 md:col-span-5">
                <FormInput
                  label="Customer Name"
                  required
                  ref={nameRef}
                  value={form.customerName}
                  onChange={(e) => handleFieldChange("customerName", e.target.value)}
                  onFocus={() => handleFieldFocus("customerName")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, flatRef)}
                  inputMode="none"
                  inputClassName={
                    activeField === "customerName"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div className="col-span-12 md:col-span-3 flex flex-col justify-end pb-[4px]">
                <label
                  onClick={() => setForm({ ...form, isComing: !form.isComing })}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-2.5 cursor-pointer hover:bg-slate-100 transition-all select-none"
                >
                  <Checkbox checked={form.isComing} onChange={(e) => setForm({ ...form, isComing: e.target.checked })} />
                  <span className="text-[#49293e] font-extrabold text-[10px] tracking-wider uppercase whitespace-nowrap">
                    Coming (Come & Collect)
                  </span>
                </label>
              </div>
            </div>

            {/* Row 2: Address Grid (5 Equal Fields) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              <div>
                <FormInput
                  label="Flat No"
                  ref={flatRef}
                  value={form.flatNo}
                  onChange={(e) => handleFieldChange("flatNo", e.target.value)}
                  onFocus={() => handleFieldFocus("flatNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, buildingRef)}
                  inputMode="none"
                  inputClassName={
                    activeField === "flatNo"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div>
                <FormInput
                  label="Building No"
                  ref={buildingRef}
                  value={form.buildingNo}
                  onChange={(e) => handleFieldChange("buildingNo", e.target.value)}
                  onFocus={() => handleFieldFocus("buildingNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, roadRef)}
                  inputMode="none"
                  inputClassName={
                    activeField === "buildingNo"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div>
                <FormInput
                  label="Road"
                  ref={roadRef}
                  value={form.roadNo}
                  onChange={(e) => handleFieldChange("roadNo", e.target.value)}
                  onFocus={() => handleFieldFocus("roadNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, blockRef)}
                  inputMode="none"
                  inputClassName={
                    activeField === "roadNo"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div>
                <FormInput
                  label="Block"
                  ref={blockRef}
                  value={form.blockNo}
                  onChange={(e) => handleFieldChange("blockNo", e.target.value)}
                  onFocus={() => handleFieldFocus("blockNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, areaRef)}
                  inputMode="none"
                  inputClassName={
                    activeField === "blockNo"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div>
                <FormInput
                  label="Area"
                  ref={areaRef}
                  value={form.area}
                  onChange={(e) => handleFieldChange("area", e.target.value)}
                  onFocus={() => handleFieldFocus("area")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, noteRef)}
                  inputMode="none"
                  inputClassName={
                    activeField === "area"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>
            </div>

            {/* Row 3: Notes & Quick Actions */}
            <div className="grid grid-cols-12 gap-3 md:gap-4 items-end">
              <div className="col-span-12 md:col-span-4">
                <FormInput
                  label="Notes"
                  ref={noteRef}
                  value={form.note}
                  onChange={(e) => handleFieldChange("note", e.target.value)}
                  onFocus={() => handleFieldFocus("note")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, callBackRef)}
                  inputMode="none"
                  inputClassName={
                    activeField === "note"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div className="col-span-12 md:col-span-3">
                <FormInput
                  label="Call Back"
                  ref={callBackRef}
                  value={form.callBack}
                  onChange={(e) => handleFieldChange("callBack", e.target.value)}
                  onFocus={() => handleFieldFocus("callBack")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, keepChangesRef)}
                  inputMode="none"
                  inputClassName={
                    activeField === "callBack"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div className="col-span-12 md:col-span-2 flex flex-col justify-end pb-[4px]">
                <label
                  onClick={() => setForm({ ...form, isMissedCall: !form.isMissedCall })}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-2.5 cursor-pointer hover:bg-slate-100 transition-all select-none"
                >
                  <Checkbox checked={form.isMissedCall} onChange={(e) => setForm({ ...form, isMissedCall: e.target.checked })} />
                  <span className="text-[#49293e] font-extrabold text-[10px] tracking-wider uppercase whitespace-nowrap">
                    Missed Call
                  </span>
                </label>
              </div>

              <div className="col-span-12 md:col-span-3 grid grid-cols-2 gap-2 pb-[4px]">
                <button
                  onClick={handleSave}
                  disabled={loading || !form.mobileNo}
                  className="h-9 bg-[#49293e] hover:bg-[#381f30] text-white font-extrabold text-[10px] tracking-wider uppercase rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
                >
                  Update
                </button>
                <button
                  onClick={() => setIsMoreAddressOpen(true)}
                  className="h-9 bg-[#49293e] hover:bg-[#381f30] text-white font-extrabold text-[10px] tracking-wider uppercase rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center"
                >
                  More Address
                </button>
              </div>
            </div>

            {/* Row 4: Keep Changes & Quick Amounts */}
            <div className="grid grid-cols-12 gap-3 md:gap-4 items-end">
              <div className="col-span-12 md:col-span-4">
                <FormInput
                  label="Keep Changes"
                  ref={keepChangesRef}
                  value={form.keepChanges}
                  onChange={(e) => handleFieldChange("keepChanges", e.target.value)}
                  onFocus={() => handleFieldFocus("keepChanges")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, "save")}
                  inputMode="none"
                  inputClassName={
                    activeField === "keepChanges"
                      ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs sm:text-sm"
                      : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs sm:text-sm"
                  }
                />
              </div>

              <div className="col-span-12 md:col-span-5 flex flex-col justify-end pb-[4px]">
                <div className="grid grid-cols-3 gap-2 h-9">
                  {["5.000", "10.000", "20.000"].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setForm({ ...form, keepChanges: amt })}
                      className="bg-[#49293e]/10 hover:bg-[#49293e]/20 text-[#49293e] font-black text-[10px] sm:text-[11px] tracking-wider rounded-lg border border-[#49293e]/20 shadow-sm transition-all active:scale-95 flex items-center justify-center"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-12 md:col-span-3 flex flex-col justify-end pb-[4px]">
                <button
                  onClick={() => alert("Logs Clicked")}
                  className="h-9 w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] tracking-wider uppercase rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center"
                >
                  Logs
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Dedicated Integrated POS Keyboard Panel at Bottom */}
        {showKeyboard ? (
          <footer className="shrink-0 w-full bg-[#f4f0f2] px-2 pb-3 sm:px-4 sm:pb-4 mt-auto">
            <PosDeliveryKeyboard
              onInput={handleInput}
              onBackspace={handleBackspace}
              onClear={handleClearKey}
              onClose={() => setShowKeyboard(false)}
              isCompactViewport={isCompactViewport}
            />
          </footer>
        ) : (
          <button
            onClick={() => setShowKeyboard(true)}
            className="fixed bottom-4 right-6 bg-[#49293e] hover:bg-[#381f30] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 font-black text-xs uppercase tracking-wider active:scale-95 transition-all z-[100] border border-white/20"
            title="Open Touch Keyboard"
          >
            <Keyboard size={18} />
            <span>Show Keyboard</span>
          </button>
        )}

        <PosMoreAddressModal
          isOpen={isMoreAddressOpen}
          onClose={() => setIsMoreAddressOpen(false)}
          mobileNo={form.mobileNo}
          customerName={form.customerName}
          onSelectAddress={handleSelectAddressFromMore}
        />
      </main>
    </div>
  );
};

export default PosDeliveryPage;
