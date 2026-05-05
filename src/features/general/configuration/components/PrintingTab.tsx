import type { ConfigurationState } from "../types";
import { Toggle } from "../../../../components/common";

interface Props {
  form: ConfigurationState;
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
}

const PrintingTab = ({ form, onChange }: Props) => {
  const inlineLabelClass = "w-36 shrink-0 text-xs font-medium text-gray-700 md:text-sm";
  const inlineFieldClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 md:px-4 md:text-base";

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#49293e] border-b pb-2 mb-4">KOT Settings</h3>
        
        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="conf-print-kotheader" className={inlineLabelClass}>
            KOT Header Style
          </label>
          <select
            id="conf-print-kotheader"
            autoFocus
            value={form.kotHeader}
            onChange={(e) => onChange("kotHeader", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-print-kotarabic")}
            className={inlineFieldClass}
          >
            <option value="">Select</option>
            <option value="QTY,DESCRIPTION">QTY, DESCRIPTION</option>
            <option value="QTY,DESCRIPTION,AMT">QTY, DESCRIPTION, AMT</option>
            <option value="DESCRIPTION,QTY,AMT">DESCRIPTION, QTY, AMT</option>
          </select>
        </div>
        
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

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#49293e] border-b pb-2 mb-4">Bill & Packager</h3>
        
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

        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="conf-print-billcopies" className={inlineLabelClass}>
            Bill Copies
          </label>
          <input
            id="conf-print-billcopies"
            type="number"
            value={String(form.billCopies)}
            onChange={(e) => onChange("billCopies", parseInt(e.target.value) || 1)}
            onKeyDown={(e) => handleKeyDown(e, "conf-print-callerid")}
            className={inlineFieldClass}
          />
        </div>
        
        <div className="pt-4 space-y-4">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Device Ports</h4>
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="conf-print-callerid" className={inlineLabelClass}>
              Caller ID Port
            </label>
            <input
              id="conf-print-callerid"
              value={form.callerIdPort}
              onChange={(e) => onChange("callerIdPort", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "conf-print-display")}
              className={inlineFieldClass}
            />
          </div>
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="conf-print-display" className={inlineLabelClass}>
              Display Port
            </label>
            <input
              id="conf-print-display"
              value={form.displayPort}
              onChange={(e) => onChange("displayPort", e.target.value)}
              className={inlineFieldClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingTab;
