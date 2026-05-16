import { useState, useEffect } from "react";
import { Modal, FormInput, Button } from "../../../../components/common";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";
import { X, Plus, Save, RotateCcw, CheckCircle2 } from "lucide-react";
import { useDelivery } from "../hooks/useDelivery";
import type { DeliveryAddress } from "../types/delivery";

interface PosMoreAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  mobileNo: string;
  onSelectAddress: (address: DeliveryAddress) => void;
}

export const PosMoreAddressModal = ({ 
  isOpen, 
  onClose, 
  mobileNo,
  onSelectAddress 
}: PosMoreAddressModalProps) => {
  const { loading, addressList, fetchAddressByMobile, saveAddress } = useDelivery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    mobileNo: mobileNo,
    phoneNo: "",
    customerName: "",
    flatNo: "",
    buildingNo: "",
    roadNo: "",
    blockNo: "",
    area: ""
  });

  const [activeField, setActiveField] = useState<keyof typeof form | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(true);

  // Load addresses on open
  useEffect(() => {
    if (isOpen && mobileNo) {
      setForm(prev => ({ ...prev, mobileNo }));
      fetchAddressByMobile(mobileNo);
    }
  }, [isOpen, mobileNo, fetchAddressByMobile]);

  const handleInput = (val: string) => {
    if (!activeField) return;
    setForm({ ...form, [activeField]: form[activeField] + val });
  };

  const handleBackspace = () => {
    if (!activeField) return;
    setForm({ ...form, [activeField]: form[activeField].slice(0, -1) });
  };

  const handleClearKey = () => {
    if (!activeField) return;
    setForm({ ...form, [activeField]: "" });
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
      note: "" // Note is not in this specific form but required by API
    });
    if (success) {
      handleClearForm();
    }
  };

  const handleSelect = () => {
    const selected = addressList.find(a => (a as any).addressId === selectedId);
    if (selected) {
      onSelectAddress(selected);
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
      area: ""
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      className="!max-w-[98vw] w-[98vw] xl:!max-w-[1300px] !max-h-[98vh] h-auto bg-[#f8f9fa] flex flex-col overflow-hidden z-[60] rounded-2xl shadow-2xl"
    >
      {/* Header - Compact */}
      <div className="flex items-center justify-between bg-[#49293e] px-4 py-2 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white/20 rounded">
            <Plus size={14} />
          </div>
          <h2 className="text-[11px] font-black tracking-widest uppercase">Manage Additional Addresses</h2>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-all">
          <X size={18} strokeWidth={3} />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2 overflow-hidden h-full">
        {/* Split Section: Form & Table */}
        <div className="flex flex-col xl:flex-row gap-3 min-h-0 h-auto">
          
          {/* Left: Form Area (42%) */}
          <div className="w-full xl:w-[42%] flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
            <h3 className="text-[10px] font-black text-[#49293e] uppercase tracking-widest border-b pb-1">New Address Entry</h3>
            
            <div className="grid grid-cols-3 gap-2">
              <FormInput label="Mobile" value={form.mobileNo} readOnly className="!mb-0" />
              <FormInput label="Phone" autoFocus value={form.phoneNo} onChange={(e) => setForm({ ...form, phoneNo: e.target.value })} onFocus={() => setActiveField("phoneNo")} inputMode="none" className="!mb-0" />
              <FormInput label="Name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} onFocus={() => setActiveField("customerName")} inputMode="none" className="!mb-0" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <FormInput label="Flat" value={form.flatNo} onChange={(e) => setForm({ ...form, flatNo: e.target.value })} onFocus={() => setActiveField("flatNo")} inputMode="none" className="!mb-0" />
              <FormInput label="Building" value={form.buildingNo} onChange={(e) => setForm({ ...form, buildingNo: e.target.value })} onFocus={() => setActiveField("buildingNo")} inputMode="none" className="!mb-0" />
              <FormInput label="Road" value={form.roadNo} onChange={(e) => setForm({ ...form, roadNo: e.target.value })} onFocus={() => setActiveField("roadNo")} inputMode="none" className="!mb-0" />
              <FormInput label="Block" value={form.blockNo} onChange={(e) => setForm({ ...form, blockNo: e.target.value })} onFocus={() => setActiveField("blockNo")} inputMode="none" className="!mb-0" />
              <FormInput label="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} onFocus={() => setActiveField("area")} inputMode="none" className="!mb-0" />
              <div className="flex items-end">
                <Button 
                  className="w-full !h-10.5 bg-[#49293e] text-[11px] font-black uppercase"
                  onClick={handleSave}
                  loading={loading}
                  icon={<Plus size={14} />}
                >
                  Add Now
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Table Area (58%) */}
          <div className="w-full xl:w-[58%] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Address History</h3>
              <span className="bg-[#49293e] text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{addressList.length} Records</span>
            </div>
            <div className="overflow-y-auto max-h-[140px] flex-1">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="px-3 py-2">No</th>
                    <th className="px-3 py-2">Flat/Bld</th>
                    <th className="px-3 py-2">Road/Block</th>
                    <th className="px-3 py-2">Area</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {addressList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-400">No history found</td>
                    </tr>
                  ) : (
                    addressList.map((addr, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedId((addr as any).addressId)}
                        className={`cursor-pointer hover:bg-slate-50 border-b border-slate-100 transition-colors ${selectedId === (addr as any).addressId ? "bg-amber-50" : ""}`}
                      >
                        <td className="px-3 py-1.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-1.5">
                          <div className="font-bold text-slate-700">{addr.flatNo}</div>
                          <div className="text-[9px] text-slate-400">Bld: {addr.buildingNo}</div>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="text-slate-700">R: {addr.roadNo}</div>
                          <div className="text-[9px] text-slate-400">B: {addr.blockNo}</div>
                        </td>
                        <td className="px-3 py-1.5 font-medium">{addr.area}</td>
                        <td className="px-3 py-1.5 text-right">
                          <div className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${selectedId === (addr as any).addressId ? "bg-green-500 text-white" : "bg-slate-100 text-slate-300"}`}>
                            <CheckCircle2 size={12} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Section: Keyboard - Exclusive Rule-Breaking Alignment */}
        {showKeyboard && (
          <div className="mt-auto shrink-0 flex justify-center pt-1">
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

      {/* Footer - Smaller Buttons */}
      <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2 shrink-0">
        <Button 
          onClick={handleClearForm}
          variant="secondary"
          className="!h-10 !w-28 !text-[11px] bg-white"
          tabIndex={-1}
          icon={<RotateCcw size={16} />}
        >
          Clear
        </Button>
        <Button 
          onClick={handleSelect}
          variant="secondary"
          className="!h-10 !w-32 !text-[11px] bg-white border-amber-200 text-amber-700"
          disabled={!selectedId}
          icon={<CheckCircle2 size={16} />}
        >
          Select
        </Button>
        <Button 
          onClick={handleSave}
          className="!h-10 !w-36 !text-[11px] bg-[#49293e]"
          loading={loading}
          icon={<Save size={16} />}
        >
          Save Details
        </Button>
      </div>
    </Modal>
  );
};
