import type { ConfigurationState } from "../types";
import { SearchableSelect, Toggle } from "../../../../components/common";
import type { ConfigurationEmployeeOption } from "../hooks/useConfigurationManager";

interface Props {
  form: ConfigurationState;
  employeeOptions: ConfigurationEmployeeOption[];
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
}

const PosSettingsTab = ({ form, employeeOptions, onChange }: Props) => {
  const inlineLabelClass = "w-36 shrink-0 text-xs font-medium text-gray-700 md:text-sm";
  const inlineSelectClass =
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
        <h3 className="text-lg font-bold text-[#49293e] border-b pb-2 mb-4">General POS</h3>
        
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
        
        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="conf-pos-alt" className={inlineLabelClass}>
            Alternative Price
          </label>
          <select
            id="conf-pos-alt"
            autoFocus
            value={form.alternativeOrder}
            onChange={(e) => onChange("alternativeOrder", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-default-employee")}
            className={inlineSelectClass}
          >
            <option value="">Select</option>
            <option value="Id">Id</option>
            <option value="Name">Name</option>
            <option value="Price">Price</option>
          </select>
        </div>

        <Toggle
          id="conf-pos-default-employee"
          label="Default Employee"
          enabled={form.defaultEmployee}
          onChange={(val) => onChange("defaultEmployee", val)}
          onKeyDown={(e) => handleKeyDown(e, "conf-pos-employee")}
        />

        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="conf-pos-employee" className={inlineLabelClass}>
            Employee
          </label>
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

        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="conf-pos-disc" className={inlineLabelClass}>
            Discount Calculation
          </label>
          <select
            id="conf-pos-disc"
            value={form.discCalc}
            onChange={(e) => onChange("discCalc", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-priceview")}
            className={inlineSelectClass}
          >
            <option value="">Select</option>
            <option value="Inclusive">Inclusive</option>
            <option value="Exclusive">Exclusive</option>
          </select>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="conf-pos-priceview" className={inlineLabelClass}>
            Price View
          </label>
          <select
            id="conf-pos-priceview"
            value={form.priceView}
            onChange={(e) => onChange("priceView", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-cashdrawer")}
            className={inlineSelectClass}
          >
            <option value="">Select</option>
            <option value="Inclusive">Inclusive</option>
            <option value="Exclusive">Exclusive</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#49293e] border-b pb-2 mb-4">Operational Flags</h3>
        
        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="conf-pos-cashdrawer" className={inlineLabelClass}>
            Cashdrawer Type
          </label>
          <select
            id="conf-pos-cashdrawer"
            value={form.cashdrawer}
            onChange={(e) => onChange("cashdrawer", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-print")}
            className={inlineSelectClass}
          >
            <option value="">Select</option>
            <option value="Default">Default</option>
            <option value="Normal">Normal</option>
          </select>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="conf-pos-print" className={inlineLabelClass}>
            Print Price
          </label>
          <select
            id="conf-pos-print"
            value={form.printPrice}
            onChange={(e) => onChange("printPrice", e.target.value as any)}
            onKeyDown={(e) => handleKeyDown(e, "conf-pos-recipe")}
            className={inlineSelectClass}
          >
            <option value="">Select</option>
            <option value="Inclusive">Inclusive</option>
            <option value="Exclusive">Exclusive</option>
          </select>
        </div>

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
  );
};

export default PosSettingsTab;
