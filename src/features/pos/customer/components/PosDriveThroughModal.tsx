import { useState, useRef, useEffect } from "react";
import { Modal, FormInput, Button } from "../../../../components/common";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";
import { Save, RotateCcw } from "lucide-react";
import { useAppDispatch } from "../../../../app/hooks";
import { setOrderTypeByName } from "../../terminal/store/posSlice";

interface PosDriveThroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosDriveThroughModal = ({ isOpen, onClose }: PosDriveThroughModalProps) => {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    vehicleNo: "",
    customerName: ""
  });

  const [activeField, setActiveField] = useState<keyof typeof form | null>("vehicleNo");
  const [showKeyboard, setShowKeyboard] = useState(true);

  // Focus
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
      setActiveField("vehicleNo");
      setShowKeyboard(true);
    }
  }, [isOpen]);

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

  const handleFieldFocus = (field: keyof typeof form) => {
    setActiveField(field);
    setShowKeyboard(true);
  };

  const handleFieldClick = (field: keyof typeof form) => {
    setActiveField(field);
    setShowKeyboard(true);
  };

  const handleClearForm = () => {
    setForm({
      vehicleNo: "",
      customerName: ""
    });
    setTimeout(() => firstInputRef.current?.focus(), 50);
  };

  const handleSave = () => {
    dispatch(setOrderTypeByName("DriveThru"));
    if (form.vehicleNo) {
      localStorage.setItem("driveThruVehicleNo", form.vehicleNo);
    } else {
      localStorage.removeItem("driveThruVehicleNo");
    }
    if (form.customerName) {
      localStorage.setItem("driveThruCustomerName", form.customerName);
    } else {
      localStorage.removeItem("driveThruCustomerName");
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      className="!max-w-[95vw] w-[95vw] md:!max-w-[700px] h-auto bg-[#f8f9fa] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-[#49293e] px-4 py-2.5 text-white shrink-0 border-b-2 border-white/10">
        <h2 className="text-sm md:text-base font-black tracking-widest mx-auto uppercase">VEHICLE DETAILS</h2>
        <button onClick={onClose} className="text-white hover:text-red-400 absolute right-4 transition-colors" tabIndex={-1}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 flex flex-col gap-2 overflow-y-auto min-h-0 flex-1 [&_.mb-4]:mb-0 [&_input]:h-9 md:[&_input]:h-10">
        <div className="flex flex-wrap md:flex-nowrap gap-3">
          <div className="w-full md:w-1/2">
            <FormInput
              label="Vehicle No"
              value={form.vehicleNo}
              onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
              onFocus={() => handleFieldFocus("vehicleNo")}
              onClick={() => handleFieldClick("vehicleNo")}
              ref={firstInputRef}
              inputMode="none"
            />
          </div>
          <div className="w-full md:w-1/2">
            <FormInput
              label="Customer Name"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              onFocus={() => handleFieldFocus("customerName")}
              onClick={() => handleFieldClick("customerName")}
              inputMode="none"
            />
          </div>
        </div>

        {/* Keyboard Area */}
        {showKeyboard && (
          <div className="mt-2 shrink-0 flex justify-center w-full">
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
          onClick={handleClearForm}
          variant="secondary"
          isAction
          icon={<RotateCcw size={16} />}
          tabIndex={-1}
        >
          Clear
        </Button>
        <Button
          onClick={handleSave}
          variant="primary"
          isAction
          icon={<Save size={16} />}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
};
