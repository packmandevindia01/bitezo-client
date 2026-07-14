import React from "react";
import type { ConfigurationState } from "../types";
import { Checkbox, SelectInput, FormInput } from "../../../../components/common";

interface Props {
  form: ConfigurationState;
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
  onInputFocus?: () => void;
}

const PrintingTab = ({ form, onChange, onInputFocus }: Props) => {
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 border-b border-gray-100 pb-2 mb-4 uppercase tracking-widest">KOT Settings</h3>
        
        <div className="grid gap-y-3">
          <SelectInput
            id="conf-print-kotheader"
            label="KOT Header Style"
            autoFocus
            value={form.kotHeader}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("kotHeader", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-print-kotarabic")}
            options={[
              { value: "QTY,DESCRIPTION", label: "QTY, DESCRIPTION" },
              { value: "QTY,DESCRIPTION,AMT", label: "QTY, DESCRIPTION, AMT" },
              { value: "DESCRIPTION,QTY,AMT", label: "DESCRIPTION, QTY, AMT" },
            ]}
          />
          
          <Checkbox 
            id="conf-print-kotarabic"
            label="KOT Arabic" 
            checked={form.kotArabic} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("kotArabic", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-kotsettle")}
          />
          <Checkbox 
            id="conf-print-kotsettle"
            label="KOT Print (Settle)" 
            checked={form.kotPrintSettle} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("kotPrintSettle", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-kotprint")}
          />
          <Checkbox 
            id="conf-print-kotprint"
            label="Standard KOT Print" 
            checked={form.kotPrint} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("kotPrint", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-masterkot")}
          />
          <Checkbox 
            id="conf-print-masterkot"
            label="Master KOT" 
            checked={form.masterKot} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("masterKot", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-masterkotbill")}
          />
          <Checkbox 
            id="conf-print-masterkotbill"
            label="Master KOT (Bill Printer)" 
            checked={form.masterKotBillPrinter} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("masterKotBillPrinter", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-itemsep")}
          />
          <Checkbox 
            id="conf-print-itemsep"
            label="Item Separation (After Edit)" 
            checked={form.itemSeparationAfterEdit} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("itemSeparationAfterEdit", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-billarabic")}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 border-b border-gray-100 pb-2 mb-4 uppercase tracking-widest">Bill & Packager</h3>
        
        <div className="grid gap-y-3">
          <Checkbox 
            id="conf-print-billarabic"
            label="Bill Arabic" 
            checked={form.billArabic} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("billArabic", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-packagerheader")}
          />
          <Checkbox 
            id="conf-print-packagerheader"
            label="Packager Header" 
            checked={form.packagerHeader} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("packagerHeader", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-packagerprint")}
          />
          <Checkbox 
            id="conf-print-packagerprint"
            label="Packager Print" 
            checked={form.packagerPrint} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("packagerPrint", e.target.checked)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-color")}
          />
          <Checkbox 
            id="conf-print-color"
            label="Color Change (Guest Print)" 
            checked={form.colorChangeGuestPrint} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("colorChangeGuestPrint", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-print-billcopies")}
          />

          <FormInput
            id="conf-print-billcopies"
            label="Bill Copies"
            type="number"
            inputClassName="text-right"
            value={String(form.billCopies)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              onChange("billCopies", val === "" ? "" : (parseInt(val) || ""));
            }}
            onFocus={(e) => {
              e.target.select();
              onInputFocus?.();
              setTimeout(() => {
                e.target.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 150);
            }}
            onKeyDown={(e) => handleKeyDown(e, "conf-print-callerid")}
          />
          
          <div className="pt-2 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-50 pt-4">Device Ports</h4>
            <div className="grid gap-y-3">
              <FormInput
                id="conf-print-callerid"
                label="Caller ID Port"
                value={form.callerIdPort}
                onChange={(e) => onChange("callerIdPort", e.target.value)}
                onFocus={(e) => {
                  onInputFocus?.();
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 150);
                }}
                onKeyDown={(e) => handleKeyDown(e, "conf-print-display")}
              />
              <FormInput
                id="conf-print-display"
                label="Display Port"
                value={form.displayPort}
                onChange={(e) => onChange("displayPort", e.target.value)}
                onFocus={(e) => {
                  onInputFocus?.();
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 150);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingTab;
