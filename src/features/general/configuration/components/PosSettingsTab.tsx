import type { ConfigurationState } from "../types";
import { Toggle, SelectInput } from "../../../../components/common";

interface Props {
  form: ConfigurationState;
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
}

const PosSettingsTab = ({ form, onChange }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#49293e] border-b pb-2 mb-4">General POS</h3>
        
        <Toggle 
          label="Company Name (KOT)" 
          enabled={form.companyNameKOT} 
          onChange={(val) => onChange("companyNameKOT", val)} 
        />
        <Toggle 
          label="Location Wise Price" 
          enabled={form.locationWisePrice} 
          onChange={(val) => onChange("locationWisePrice", val)} 
        />
        
        <SelectInput
          label="Alternative Order"
          value={form.alternativeOrder}
          options={[
            { label: "Id", value: "Id" },
            { label: "Name", value: "Name" },
            { label: "Price", value: "Price" },
          ]}
          onChange={(e) => onChange("alternativeOrder", e.target.value as any)}
        />

        <SelectInput
          label="Discount Calculation"
          value={form.discCalc}
          options={[
            { label: "Inclusive", value: "Inclusive" },
            { label: "Exclusive", value: "Exclusive" },
          ]}
          onChange={(e) => onChange("discCalc", e.target.value as any)}
        />

        <SelectInput
          label="Price View"
          value={form.priceView}
          options={[
            { label: "Inclusive", value: "Inclusive" },
            { label: "Exclusive", value: "Exclusive" },
          ]}
          onChange={(e) => onChange("priceView", e.target.value as any)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#49293e] border-b pb-2 mb-4">Operational Flags</h3>
        
        <SelectInput
          label="Cashdrawer Type"
          value={form.cashdrawer}
          options={[
            { label: "Default", value: "Default" },
            { label: "Normal", value: "Normal" },
          ]}
          onChange={(e) => onChange("cashdrawer", e.target.value as any)}
        />

        <Toggle 
          label="Enable Recipe" 
          enabled={form.recipe} 
          onChange={(val) => onChange("recipe", val)} 
        />
        <Toggle 
          label="Multi Employee (Table)" 
          enabled={form.multiEmployeeTable} 
          onChange={(val) => onChange("multiEmployeeTable", val)} 
        />
        <Toggle 
          label="Customer (Takeout)" 
          enabled={form.customerTakeout} 
          onChange={(val) => onChange("customerTakeout", val)} 
        />
        <Toggle 
          label="Delivery Settle" 
          enabled={form.deliverySettle} 
          onChange={(val) => onChange("deliverySettle", val)} 
        />
        <Toggle 
          label="Show Delivery (Recall)" 
          enabled={form.showDeliveryRecall} 
          onChange={(val) => onChange("showDeliveryRecall", val)} 
        />
        <SelectInput
          label="Print Price"
          value={form.printPrice}
          options={[
            { label: "Inclusive", value: "Inclusive" },
            { label: "Exclusive", value: "Exclusive" },
          ]}
          onChange={(e) => onChange("printPrice", e.target.value as any)}
        />
      </div>
    </div>
  );
};

export default PosSettingsTab;
