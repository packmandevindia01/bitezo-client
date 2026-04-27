import type { ConfigurationState } from "../types";
import { Toggle, SelectInput, FormInput } from "../../../../components/common";

interface Props {
  form: ConfigurationState;
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
}

const PrintingTab = ({ form, onChange }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#49293e] border-b pb-2 mb-4">KOT Settings</h3>
        
        <SelectInput
          label="KOT Header Style"
          value={form.kotHeader}
          options={[
            { label: "QTY, DESCRIPTION", value: "QTY,DESCRIPTION" },
            { label: "QTY, DESCRIPTION, AMT", value: "QTY,DESCRIPTION,AMT" },
            { label: "DESCRIPTION, QTY, AMT", value: "DESCRIPTION,QTY,AMT" },
          ]}
          onChange={(e) => onChange("kotHeader", e.target.value as any)}
        />
        
        <Toggle 
          label="KOT Arabic" 
          enabled={form.kotArabic} 
          onChange={(val) => onChange("kotArabic", val)} 
        />
        <Toggle 
          label="KOT Print (Settle)" 
          enabled={form.kotPrintSettle} 
          onChange={(val) => onChange("kotPrintSettle", val)} 
        />
        <Toggle 
          label="Standard KOT Print" 
          enabled={form.kotPrint} 
          onChange={(val) => onChange("kotPrint", val)} 
        />
        <Toggle 
          label="Master KOT" 
          enabled={form.masterKot} 
          onChange={(val) => onChange("masterKot", val)} 
        />
        <Toggle 
          label="Master KOT (Bill Printer)" 
          enabled={form.masterKotBillPrinter} 
          onChange={(val) => onChange("masterKotBillPrinter", val)} 
        />
        <Toggle 
          label="Item Separation (After Edit)" 
          enabled={form.itemSeparationAfterEdit} 
          onChange={(val) => onChange("itemSeparationAfterEdit", val)} 
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#49293e] border-b pb-2 mb-4">Bill & Packager</h3>
        
        <FormInput
          label="Bill Copies"
          type="number"
          value={String(form.billCopies)}
          onChange={(e) => onChange("billCopies", parseInt(e.target.value) || 1)}
        />
        <Toggle 
          label="Bill Arabic" 
          enabled={form.billArabic} 
          onChange={(val) => onChange("billArabic", val)} 
        />
        <Toggle 
          label="Packager Header" 
          enabled={form.packagerHeader} 
          onChange={(val) => onChange("packagerHeader", val)} 
        />
        <Toggle 
          label="Packager Print" 
          enabled={form.packagerPrint} 
          onChange={(val) => onChange("packagerPrint", val)} 
        />
        <Toggle 
          label="Color Change (Guest Print)" 
          enabled={form.colorChangeGuestPrint} 
          onChange={(val) => onChange("colorChangeGuestPrint", val)} 
        />
        
        <div className="pt-4 space-y-4">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Device Ports</h4>
          <FormInput
            label="Caller ID Port"
            value={form.callerIdPort}
            onChange={(e) => onChange("callerIdPort", e.target.value)}
          />
          <FormInput
            label="Display Port"
            value={form.displayPort}
            onChange={(e) => onChange("displayPort", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default PrintingTab;
