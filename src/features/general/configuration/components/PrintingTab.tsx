import type { ConfigurationState } from "../types";
import { Toggle, SelectInput, FormInput } from "../../../../components/common";

interface Props {
  form: ConfigurationState;
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
}

const PrintingTab = ({ form, onChange }: Props) => {
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
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#49293e] border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">KOT Settings</h3>
        
        <div className="grid gap-4">
          <SelectInput
            id="conf-print-kotheader"
            label="KOT Header Style"
            autoFocus
            value={form.kotHeader}
            onChange={(e) => onChange("kotHeader", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-print-kotarabic")}
            options={[
              { value: "QTY,DESCRIPTION", label: "QTY, DESCRIPTION" },
              { value: "QTY,DESCRIPTION,AMT", label: "QTY, DESCRIPTION, AMT" },
              { value: "DESCRIPTION,QTY,AMT", label: "DESCRIPTION, QTY, AMT" },
            ]}
          />
          
          <Toggle 
            id="conf-print-kotarabic"
            label="KOT Arabic" 
            enabled={form.kotArabic} 
            onChange={(val) => onChange("kotArabic", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-kotsettle")}
          />
          <Toggle 
            id="conf-print-kotsettle"
            label="KOT Print (Settle)" 
            enabled={form.kotPrintSettle} 
            onChange={(val) => onChange("kotPrintSettle", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-kotprint")}
          />
          <Toggle 
            id="conf-print-kotprint"
            label="Standard KOT Print" 
            enabled={form.kotPrint} 
            onChange={(val) => onChange("kotPrint", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-masterkot")}
          />
          <Toggle 
            id="conf-print-masterkot"
            label="Master KOT" 
            enabled={form.masterKot} 
            onChange={(val) => onChange("masterKot", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-masterkotbill")}
          />
          <Toggle 
            id="conf-print-masterkotbill"
            label="Master KOT (Bill Printer)" 
            enabled={form.masterKotBillPrinter} 
            onChange={(val) => onChange("masterKotBillPrinter", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-itemsep")}
          />
          <Toggle 
            id="conf-print-itemsep"
            label="Item Separation (After Edit)" 
            enabled={form.itemSeparationAfterEdit} 
            onChange={(val) => onChange("itemSeparationAfterEdit", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-billarabic")}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#49293e] border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">Bill & Packager</h3>
        
        <div className="grid gap-4">
          <Toggle 
            id="conf-print-billarabic"
            label="Bill Arabic" 
            enabled={form.billArabic} 
            onChange={(val) => onChange("billArabic", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-packagerheader")}
          />
          <Toggle 
            id="conf-print-packagerheader"
            label="Packager Header" 
            enabled={form.packagerHeader} 
            onChange={(val) => onChange("packagerHeader", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-packagerprint")}
          />
          <Toggle 
            id="conf-print-packagerprint"
            label="Packager Print" 
            enabled={form.packagerPrint} 
            onChange={(val) => onChange("packagerPrint", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-color")}
          />
          <Toggle 
            id="conf-print-color"
            label="Color Change (Guest Print)" 
            enabled={form.colorChangeGuestPrint} 
            onChange={(val) => onChange("colorChangeGuestPrint", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-print-billcopies")}
          />

          <FormInput
            id="conf-print-billcopies"
            label="Bill Copies"
            type="number"
            value={String(form.billCopies)}
            onChange={(e) => onChange("billCopies", parseInt(e.target.value) || 1)}
            onKeyDown={(e) => handleKeyDown(e, "conf-print-callerid")}
          />
          
          <div className="pt-2 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-50 pt-4">Device Ports</h4>
            <div className="grid gap-4">
              <FormInput
                id="conf-print-callerid"
                label="Caller ID Port"
                value={form.callerIdPort}
                onChange={(e) => onChange("callerIdPort", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "conf-print-display")}
              />
              <FormInput
                id="conf-print-display"
                label="Display Port"
                value={form.displayPort}
                onChange={(e) => onChange("displayPort", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingTab;
