import { useState, useEffect, useRef } from "react";
import { Modal, FormInput, Button } from "../../../../components/common";
import { PosDeliveryKeyboard } from "./PosDeliveryKeyboard";
import { X, Plus, RotateCcw, CheckCircle2, Keyboard } from "lucide-react";
import { useDelivery } from "../hooks/useDelivery";
import { useToast } from "../../../../app/providers/useToast";
import type { DeliveryAddress } from "../types/delivery";

interface PosMoreAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  mobileNo: string;
  customerName?: string;
  onSelectAddress: (address: DeliveryAddress) => void;
}

export const PosMoreAddressModal = ({
  isOpen,
  onClose,
  mobileNo,
  customerName,
  onSelectAddress,
}: PosMoreAddressModalProps) => {
  const { loading, addressList, fetchAllAddressesByMobile, saveAddress } = useDelivery();
  const { showToast } = useToast();

  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const flatRef = useRef<HTMLInputElement>(null);
  const buildingRef = useRef<HTMLInputElement>(null);
  const roadRef = useRef<HTMLInputElement>(null);
  const blockRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);

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

  const [form, setForm] = useState({
    mobileNo: mobileNo,
    phoneNo: "",
    customerName: customerName || "",
    flatNo: "",
    buildingNo: "",
    roadNo: "",
    blockNo: "",
    area: "",
  });

  const [activeField, setActiveField] = useState<keyof typeof form | null>("phoneNo");
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    if (isOpen && mobileNo) {
      setForm({
        mobileNo: mobileNo,
        phoneNo: "",
        customerName: customerName || "",
        flatNo: "",
        buildingNo: "",
        roadNo: "",
        blockNo: "",
        area: "",
      });
      fetchAllAddressesByMobile(mobileNo);
      setTimeout(() => phoneRef.current?.focus(), 150);
      setActiveField("phoneNo");
      setShowKeyboard(true);
    }
  }, [isOpen, mobileNo, customerName, fetchAllAddressesByMobile]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsCompactViewport(window.innerWidth < 1200 || window.innerHeight < 820);
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  const handleFieldChange = (field: keyof typeof form, val: string) => {
    if (field === "phoneNo") {
      if (!/^[0-9]*$/.test(val)) return;
      if (val.length > 15) return;
    } else if (field === "customerName") {
      if (!/^[a-zA-Z\s'-]*$/.test(val)) return;
      if (val.length > 50) return;
    } else if (["flatNo", "buildingNo", "roadNo", "blockNo", "area"].includes(field as string)) {
      if (!/^[a-zA-Z0-9\s,#-]*$/.test(val)) return;
      if (val.length > 30) return;
    }
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleInput = (val: string) => {
    if (!activeField) return;
    const currentVal = form[activeField] as string;
    handleFieldChange(activeField, currentVal + val);
  };

  const handleBackspace = () => {
    if (!activeField) return;
    setForm((prev) => ({ ...prev, [activeField]: prev[activeField].slice(0, -1) }));
  };

  const handleClearKey = () => {
    if (!activeField) return;
    setForm((prev) => ({ ...prev, [activeField]: "" }));
  };

  const handleSave = async () => {
    if (!form.mobileNo) return;
    if (!form.customerName.trim()) {
      showToast("Customer Name is required", "error");
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
      note: "",
    });
    if (responseData) {
      const newAddress: DeliveryAddress = {
        addressId: responseData.id || undefined,
        mobileNo: form.mobileNo,
        flatNo: form.flatNo,
        buildingNo: form.buildingNo,
        roadNo: form.roadNo,
        blockNo: form.blockNo,
        area: form.area,
        customerName: form.customerName,
        note: "",
      };
      onSelectAddress(newAddress);
      handleClearForm();
      onClose();
    }
  };

  const handleClearForm = () => {
    setForm({
      mobileNo: mobileNo,
      phoneNo: "",
      customerName: "",
      flatNo: "",
      buildingNo: "",
      roadNo: "",
      blockNo: "",
      area: "",
    });
    setTimeout(() => phoneRef.current?.focus(), 50);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      className="!max-w-[98vw] lg:!max-w-[1240px] w-full h-[95vh] !max-h-full bg-[#f8f9fa] flex flex-col shadow-2xl overflow-hidden z-[200]"
    >
      {/* Header — identical to PosDeliveryPage */}
      <div className="flex items-center justify-between bg-[#49293e] px-4 sm:px-6 py-3 text-white shrink-0 border-b border-white/10 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Plus size={18} className="text-white" />
          </div>
          <h2 className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase">Manage Additional Addresses</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-90"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between bg-[#f4f0f2] overflow-hidden min-h-0">
        {/* Responsive Flex/Grid Layout */}
        <div className={`${isCompactViewport ? "p-2 gap-3" : "p-3 lg:p-4 gap-4"} flex-1 overflow-y-auto flex flex-col md:grid md:grid-cols-12 md:items-stretch`}>
          
          {/* Left Column: Form Fields (Col span 7 on md+) */}
          <div className={`md:col-span-7 flex flex-col gap-y-3 bg-white border border-slate-200/90 rounded-2xl ${isCompactViewport ? "p-2.5" : "p-3.5 lg:p-4"} shadow-sm justify-between`}>
            
            <div className="flex flex-col gap-3">
              {/* Form row 1: Mobile, Phone, Customer Name */}
              <div className="grid grid-cols-4 gap-2 lg:gap-3">
                <div className="col-span-1">
                  <FormInput
                    label="Mobile"
                    value={form.mobileNo}
                    readOnly
                    inputClassName="!h-9 border-slate-200 bg-slate-100 text-slate-600 font-bold text-xs"
                  />
                </div>
                <div className="col-span-1">
                  <FormInput
                    label="Phone"
                    ref={phoneRef}
                    value={form.phoneNo}
                    onChange={(e) => handleFieldChange("phoneNo", e.target.value)}
                    onFocus={() => setActiveField("phoneNo")}
                    onClick={() => setShowKeyboard(true)}
                    onKeyDown={(e) => handleEnterKey(e, nameRef)}
                    inputMode="none"
                    inputClassName={
                      activeField === "phoneNo"
                        ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs"
                        : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs"
                    }
                  />
                </div>
                <div className="col-span-2">
                  <FormInput
                    label="Customer Name"
                    required
                    ref={nameRef}
                    value={form.customerName}
                    onChange={(e) => handleFieldChange("customerName", e.target.value)}
                    onFocus={() => setActiveField("customerName")}
                    onClick={() => setShowKeyboard(true)}
                    onKeyDown={(e) => handleEnterKey(e, flatRef)}
                    inputMode="none"
                    inputClassName={
                      activeField === "customerName"
                        ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs"
                        : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs"
                    }
                  />
                </div>
              </div>

              {/* Form row 2: Flat, Building, Road, Block, Area */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 lg:gap-3">
                <div>
                  <FormInput
                    label="Flat No"
                    ref={flatRef}
                    value={form.flatNo}
                    onChange={(e) => handleFieldChange("flatNo", e.target.value)}
                    onFocus={() => setActiveField("flatNo")}
                    onClick={() => setShowKeyboard(true)}
                    onKeyDown={(e) => handleEnterKey(e, buildingRef)}
                    inputMode="none"
                    inputClassName={
                      activeField === "flatNo"
                        ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs"
                        : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs"
                    }
                  />
                </div>
                <div>
                  <FormInput
                    label="Bldg No"
                    ref={buildingRef}
                    value={form.buildingNo}
                    onChange={(e) => handleFieldChange("buildingNo", e.target.value)}
                    onFocus={() => setActiveField("buildingNo")}
                    onClick={() => setShowKeyboard(true)}
                    onKeyDown={(e) => handleEnterKey(e, roadRef)}
                    inputMode="none"
                    inputClassName={
                      activeField === "buildingNo"
                        ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs"
                        : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs"
                    }
                  />
                </div>
                <div>
                  <FormInput
                    label="Road"
                    ref={roadRef}
                    value={form.roadNo}
                    onChange={(e) => handleFieldChange("roadNo", e.target.value)}
                    onFocus={() => setActiveField("roadNo")}
                    onClick={() => setShowKeyboard(true)}
                    onKeyDown={(e) => handleEnterKey(e, blockRef)}
                    inputMode="none"
                    inputClassName={
                      activeField === "roadNo"
                        ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs"
                        : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs"
                    }
                  />
                </div>
                <div>
                  <FormInput
                    label="Block"
                    ref={blockRef}
                    value={form.blockNo}
                    onChange={(e) => handleFieldChange("blockNo", e.target.value)}
                    onFocus={() => setActiveField("blockNo")}
                    onClick={() => setShowKeyboard(true)}
                    onKeyDown={(e) => handleEnterKey(e, areaRef)}
                    inputMode="none"
                    inputClassName={
                      activeField === "blockNo"
                        ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs"
                        : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs"
                    }
                  />
                </div>
                <div>
                  <FormInput
                    label="Area"
                    ref={areaRef}
                    value={form.area}
                    onChange={(e) => handleFieldChange("area", e.target.value)}
                    onFocus={() => setActiveField("area")}
                    onClick={() => setShowKeyboard(true)}
                    onKeyDown={(e) => handleEnterKey(e, "save")}
                    inputMode="none"
                    inputClassName={
                      activeField === "area"
                        ? "!h-9 border-[#49293e] ring-2 ring-[#49293e]/20 bg-white font-semibold text-slate-800 text-xs"
                        : "!h-9 border-slate-300 bg-white hover:border-slate-400 font-medium text-slate-800 text-xs"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="pt-2 flex justify-end gap-3 shrink-0 border-t border-slate-100">
              <Button
                onClick={handleClearForm}
                variant="secondary"
                isAction
                icon={<RotateCcw size={16} />}
              >
                Clear
              </Button>
              <Button
                onClick={handleSave}
                loading={loading}
                isAction
                icon={<Plus size={16} />}
                className="bg-[#49293e] hover:bg-[#381f30] text-white"
              >
                Add Now
              </Button>
            </div>
          </div>

          {/* Right Column: Address History Table (Col span 5 on md+) */}
          <div className="md:col-span-5 rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-sm flex flex-col shrink-0 min-h-[220px] md:h-full">
            <div className="bg-[#49293e] px-3 py-2 border-b border-white/10 flex justify-between items-center shrink-0">
              <span className="text-[11px] font-black text-white uppercase tracking-widest">Address History</span>
              <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {addressList.length} Records
              </span>
            </div>
            <div className="flex-grow overflow-y-auto">
              <table className="w-full text-center border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="text-slate-600 font-extrabold uppercase border-b border-slate-200 text-[10px] sm:text-[11px]">
                    <th className="px-2 py-2 text-center w-10">No</th>
                    <th className="px-2 py-2 text-center">Flat</th>
                    <th className="px-2 py-2 text-center">Bldg</th>
                    <th className="px-2 py-2 text-center">Road/Blk</th>
                    <th className="px-2 py-2 text-center">Area</th>
                    <th className="px-2 py-2 text-center w-14">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {addressList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                        No history found
                      </td>
                    </tr>
                  ) : (
                    addressList.map((addr, idx) => {
                      return (
                        <tr
                          key={idx}
                          onClick={() => {
                            onSelectAddress(addr);
                            onClose();
                          }}
                          className="group cursor-pointer border-b border-slate-100 transition-all duration-150 hover:bg-[#49293e]/10 text-center"
                        >
                          <td className="px-2 py-2 text-[10px] sm:text-xs font-semibold text-slate-500 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span>{idx + 1}</span>
                              {idx === 0 && (
                                <span className="px-1 py-0.5 rounded text-[8px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-wider hidden sm:inline-block">
                                  Def
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-[11px] sm:text-xs text-slate-900 font-bold text-center group-hover:text-[#49293e]">{addr.flatNo || '-'}</td>
                          <td className="px-2 py-2 text-[11px] sm:text-xs text-slate-800 text-center group-hover:text-[#49293e]">{addr.buildingNo || '-'}</td>
                          <td className="px-2 py-2 text-[11px] sm:text-xs text-slate-800 leading-normal text-center group-hover:text-[#49293e]">
                            R: {addr.roadNo || '-'}, Blk: {addr.blockNo || '-'}
                          </td>
                          <td className="px-2 py-2 text-[11px] sm:text-xs text-slate-800 font-semibold text-center group-hover:text-[#49293e]">{addr.area || '-'}</td>
                          <td className="px-2 py-2 text-center">
                            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 group-hover:bg-[#49293e] group-hover:text-white transition-all duration-150">
                              <CheckCircle2 size={13} />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 3: Dedicated POS Delivery Touch Keyboard */}
        {showKeyboard ? (
          <div className="shrink-0 w-full bg-[#f4f0f2] px-2 pb-3 sm:px-4 sm:pb-4 mt-auto">
            <PosDeliveryKeyboard
              onInput={handleInput}
              onBackspace={handleBackspace}
              onClear={handleClearKey}
              onClose={() => setShowKeyboard(false)}
              isCompactViewport={isCompactViewport}
            />
          </div>
        ) : (
          <div className="p-3 bg-[#f4f0f2] flex justify-end shrink-0 mt-auto">
            <button
              onClick={() => setShowKeyboard(true)}
              className="bg-[#49293e] hover:bg-[#381f30] text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-2 font-black text-xs uppercase tracking-wider active:scale-95 transition-all border border-white/20"
              title="Open Touch Keyboard"
            >
              <Keyboard size={16} />
              <span>Show Keyboard</span>
            </button>
          </div>
        )}

      </div>
    </Modal>
  );
};