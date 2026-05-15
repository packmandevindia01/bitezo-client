import type { ConfigurationState } from "../types";
import { SearchableSelect, Toggle, SelectInput } from "../../../../components/common";
import type { ConfigurationEmployeeOption } from "../hooks/useConfigurationManager";

interface Props {
  form: ConfigurationState;
  employeeOptions: ConfigurationEmployeeOption[];
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
}

const PosSettingsTab = ({ form, employeeOptions, onChange }: Props) => {
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
        <h3 className="text-sm font-bold text-[#49293e] border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">General POS</h3>
        
        <div className="grid gap-4">
          <Toggle 
            id="conf-pos-company"
            label="Company Name (KOT)" 
            enabled={form.companyNameKOT} 
            onChange={(val) => onChange("companyNameKOT", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-location")}
          />
          <Toggle 
            id="conf-pos-location"
            label="Location Wise Price" 
            enabled={form.locationWisePrice} 
            onChange={(val) => onChange("locationWisePrice", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-alt")}
          />
          
          <SelectInput
            id="conf-pos-alt"
            label="Alternative Price"
            autoFocus
            value={form.alternativeOrder}
            onChange={(e) => onChange("alternativeOrder", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-default-employee")}
            options={[
              { value: "Id", label: "Id" },
              { value: "Name", label: "Name" },
              { value: "Price", label: "Price" },
            ]}
          />

          <Toggle
            id="conf-pos-default-employee"
            label="Default Employee"
            enabled={form.defaultEmployee}
            onChange={(val) => onChange("defaultEmployee", val)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-employee")}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Employee</label>
            <SearchableSelect
              id="conf-pos-employee"
              options={employeeOptions}
              value={form.employeeId}
              onChange={(value) => onChange("employeeId", value)}
              placeholder="Select employee"
              disabled={!form.defaultEmployee}
            />
          </div>

          <Toggle
            id="conf-pos-group-menu"
            label="Group in Menu"
            enabled={form.groupInMenu}
            onChange={(val) => onChange("groupInMenu", val)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-disc")}
          />

          <SelectInput
            id="conf-pos-disc"
            label="Discount Calculation"
            value={form.discCalc}
            onChange={(e) => onChange("discCalc", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-priceview")}
            options={[
              { value: "Inclusive", label: "Inclusive" },
              { value: "Exclusive", label: "Exclusive" },
            ]}
          />

          <SelectInput
            id="conf-pos-priceview"
            label="Price View"
            value={form.priceView}
            onChange={(e) => onChange("priceView", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-cashdrawer")}
            options={[
              { value: "Inclusive", label: "Inclusive" },
              { value: "Exclusive", label: "Exclusive" },
            ]}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#49293e] border-b border-gray-100 pb-2 mb-4 uppercase tracking-wider">Operational Flags</h3>
        
        <div className="grid gap-4">
          <SelectInput
            id="conf-pos-cashdrawer"
            label="Cashdrawer Type"
            value={form.cashdrawer}
            onChange={(e) => onChange("cashdrawer", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-print")}
            options={[
              { value: "Default", label: "Default" },
              { value: "Normal", label: "Normal" },
            ]}
          />

          <SelectInput
            id="conf-pos-print"
            label="Print Price"
            value={form.printPrice}
            onChange={(e) => onChange("printPrice", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-recipe")}
            options={[
              { value: "Inclusive", label: "Inclusive" },
              { value: "Exclusive", label: "Exclusive" },
            ]}
          />

          <Toggle 
            id="conf-pos-recipe"
            label="Enable Recipe" 
            enabled={form.recipe} 
            onChange={(val) => onChange("recipe", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-multi")}
          />
          <Toggle 
            id="conf-pos-multi"
            label="Multi Employee (Table)" 
            enabled={form.multiEmployeeTable} 
            onChange={(val) => onChange("multiEmployeeTable", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-customer")}
          />
          <Toggle 
            id="conf-pos-customer"
            label="Customer (Takeout)" 
            enabled={form.customerTakeout} 
            onChange={(val) => onChange("customerTakeout", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-settle")}
          />
          <Toggle 
            id="conf-pos-settle"
            label="Delivery Settle" 
            enabled={form.deliverySettle} 
            onChange={(val) => onChange("deliverySettle", val)} 
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-recall")}
          />
          <Toggle 
            id="conf-pos-recall"
            label="Show Delivery (Recall)" 
            enabled={form.showDeliveryRecall} 
            onChange={(val) => onChange("showDeliveryRecall", val)} 
          />
        </div>
      </div>
    </div>
  );
};
  );
};

export default PosSettingsTab;
