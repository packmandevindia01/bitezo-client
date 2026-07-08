import { useState, useEffect, useRef } from "react";
import { Modal, FormInput, Button } from "../../../../components/common";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";
import { X, Plus, RotateCcw, CheckCircle2 } from "lucide-react";
import { useDelivery } from "../hooks/useDelivery";
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
  // High-density sequential focus refs for smooth cashier navigation
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const flatRef = useRef<HTMLInputElement>(null);
  const buildingRef = useRef<HTMLInputElement>(null);
  const roadRef = useRef<HTMLInputElement>(null);
  const blockRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);

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

  // Instantly selects on single tap, removing the need for selectedId state and side effects

  const handleInput = (val: string) => {
    if (!activeField) return;
    setForm((prev) => ({ ...prev, [activeField]: prev[activeField] + val }));
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

  // Saved successfully, returns new address and closes modal

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
      className="!max-w-[98vw] lg:!max-w-[1200px] w-full h-[95vh] !max-h-full bg-[#f8f9fa] flex flex-col shadow-2xl overflow-hidden z-[200]"
    >
      {/* Header — identical to PosDeliveryModal */}
      <div className="flex items-center justify-between bg-[#49293e] px-6 py-3 text-white shrink-0 border-b border-white/10 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Plus size={18} className="text-white" />
          </div>
          <h2 className="text-sm font-black tracking-[0.2em] uppercase">Manage Additional Addresses</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-90"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between bg-white overflow-hidden min-h-0">
        {/* Responsive Flex/Grid Layout */}
        <div className={`${isCompactViewport ? "p-2 gap-3" : "p-3 lg:p-4 gap-4"} flex-1 overflow-y-auto flex flex-col md:grid md:grid-cols-12 md:items-stretch`}>
          {/* Left Column: Form Fields (Col span 7 on md+) */}
          <div className={`md:col-span-7 flex flex-col gap-y-3 bg-[#f8f9fa] border border-slate-100 rounded-xl ${isCompactViewport ? "p-2" : "p-3 lg:p-4"}`}>
            {/* Form row 1: Mobile, Phone, Customer Name */}
            <div className="grid grid-cols-4 gap-1.5 lg:gap-2">
              <div className="col-span-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase ml-1 block mb-0.5">Mobile</span>
                <FormInput
                  value={form.mobileNo}
                  readOnly
                  className="!mb-0"
                  inputClassName="!h-8 border-slate-200 bg-slate-50 text-slate-500 font-bold"
                />
              </div>
              <div className="col-span-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase ml-1 block mb-0.5">Phone</span>
                <FormInput
                  ref={phoneRef}
                  value={form.phoneNo}
                  onChange={(e) => setForm({ ...form, phoneNo: e.target.value })}
                  onFocus={() => setActiveField("phoneNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, nameRef)}
                  inputMode="none"
                  className="!mb-0"
                  inputClassName="!h-8 border-slate-200"
                />
              </div>
              <div className="col-span-2">
                <span className="text-[9px] font-bold text-slate-600 uppercase ml-1 block mb-0.5">Customer Name</span>
                <FormInput
                  ref={nameRef}
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  onFocus={() => setActiveField("customerName")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, flatRef)}
                  inputMode="none"
                  className="!mb-0"
                  inputClassName="!h-8 border-slate-200"
                />
              </div>
            </div>

            {/* Form row 2: Flat, Building, Road, Block, Area */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 lg:gap-3 shrink-0">
              <div className="col-span-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase ml-1 block mb-0.5">Flat No</span>
                <FormInput
                  ref={flatRef}
                  value={form.flatNo}
                  onChange={(e) => setForm({ ...form, flatNo: e.target.value })}
                  onFocus={() => setActiveField("flatNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, buildingRef)}
                  inputMode="none"
                  className="!mb-0"
                  inputClassName="!h-8 border-slate-200"
                />
              </div>
              <div className="col-span-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase ml-1 block mb-0.5">Bldg No</span>
                <FormInput
                  ref={buildingRef}
                  value={form.buildingNo}
                  onChange={(e) => setForm({ ...form, buildingNo: e.target.value })}
                  onFocus={() => setActiveField("buildingNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, roadRef)}
                  inputMode="none"
                  className="!mb-0"
                  inputClassName="!h-8 border-slate-200"
                />
              </div>
              <div className="col-span-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase ml-1 block mb-0.5">Road</span>
                <FormInput
                  ref={roadRef}
                  value={form.roadNo}
                  onChange={(e) => setForm({ ...form, roadNo: e.target.value })}
                  onFocus={() => setActiveField("roadNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, blockRef)}
                  inputMode="none"
                  className="!mb-0"
                  inputClassName="!h-8 border-slate-200"
                />
              </div>
              <div className="col-span-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase ml-1 block mb-0.5">Block</span>
                <FormInput
                  ref={blockRef}
                  value={form.blockNo}
                  onChange={(e) => setForm({ ...form, blockNo: e.target.value })}
                  onFocus={() => setActiveField("blockNo")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, areaRef)}
                  inputMode="none"
                  className="!mb-0"
                  inputClassName="!h-8 border-slate-200"
                />
              </div>
              <div className="col-span-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase ml-1 block mb-0.5">Area</span>
                <FormInput
                  ref={areaRef}
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  onFocus={() => setActiveField("area")}
                  onClick={() => setShowKeyboard(true)}
                  onKeyDown={(e) => handleEnterKey(e, "save")}
                  inputMode="none"
                  className="!mb-0"
                  inputClassName="!h-8 border-slate-200"
                />
              </div>
            </div>

            {/* Form row 5 (Clear & Add buttons) */}
            <div className="mt-auto pt-2 flex justify-end gap-3 shrink-0">
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
                variant="primary"
                loading={loading}
                isAction
                icon={<Plus size={16} />}
              >
                Add Now
              </Button>
            </div>
          </div>

          {/* Right Column: Address History Table (Col span 5 on md+) */}
          <div className={`md:col-span-5 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col shrink-0 min-h-[250px] md:h-full`}>
            <div className="bg-slate-50 px-2.5 py-1.5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Address History</span>
              <span className="bg-[#49293e] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {addressList.length} Records
              </span>
            </div>
            <div className="flex-grow overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px] sm:text-[11px]">
                    <th className="px-2 py-2 w-8">No</th>
                    <th className="px-2 py-2">Flat</th>
                    <th className="px-2 py-2">Bldg</th>
                    <th className="px-2 py-2">Road/Blk</th>
                    <th className="px-2 py-2">Area</th>
                    <th className="px-2 py-2 text-right w-12">Select</th>
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
                          className="group cursor-pointer border-b border-slate-100 transition-all duration-150 hover:bg-amber-50 hover:text-[#49293e]"
                        >
                          <td className="px-2 py-2 text-[10px] sm:text-xs font-semibold text-slate-400">
                            <div className="flex items-center gap-1">
                              <span>{idx + 1}</span>
                              {idx === 0 && (
                                <span className="px-1 py-0.5 rounded text-[8px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-wider hidden sm:inline-block">
                                  Def
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-[11px] sm:text-[13px] text-slate-900 font-bold group-hover:text-[#49293e]">{addr.flatNo || '-'}</td>
                          <td className="px-2 py-2 text-[11px] sm:text-[13px] text-slate-800 group-hover:text-[#49293e]">{addr.buildingNo || '-'}</td>
                          <td className="px-2 py-2 text-[11px] sm:text-[13px] text-slate-800 leading-normal group-hover:text-[#49293e]">
                            R: {addr.roadNo || '-'}, Blk: {addr.blockNo || '-'}
                          </td>
                          <td className="px-2 py-2 text-[11px] sm:text-[13px] text-slate-800 font-semibold group-hover:text-[#49293e]">{addr.area || '-'}</td>
                          <td className="px-2 py-2 text-right">
                            <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-300 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-150">
                              <CheckCircle2 size={12} />
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

        {/* Row 5: Touch Keyboard (Full width below the panels, size="md") */}
        {showKeyboard && (
          <div className={`shrink-0 w-full bg-[#f8f9fa] border-t border-slate-100 mt-auto ${isCompactViewport ? "px-2 pb-1" : "px-3 lg:px-4 pb-1.5"}`}>
            <div className={`w-full mx-auto bg-gradient-to-b from-[#faf8f9] to-[#f3edf0] border border-slate-300 shadow-lg rounded-xl ${isCompactViewport ? "max-w-[860px] p-1.5" : "max-w-[1000px] p-2 lg:p-2.5"}`}>
              <TouchKeyboard
                onInput={handleInput}
                onBackspace={handleBackspace}
                onClear={handleClearKey}
                onClose={() => setShowKeyboard(false)}
                size={isCompactViewport ? "md" : "lg"}
                embedded={true}
              />
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};