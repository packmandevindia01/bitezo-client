import React from "react";
import type { ConfigurationState } from "../types";
import { SearchableSelect, SelectInput } from "../../../../components/common";
import Checkbox from "../../../../components/common/Checkbox";
import type { ConfigurationEmployeeOption } from "../hooks/useConfigurationManager";

interface Props {
  form: ConfigurationState;
  employeeOptions: ConfigurationEmployeeOption[];
  orderTypeOptions?: { label: string; value: string }[];
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
}

const PosSettingsTab = ({ form, employeeOptions, orderTypeOptions = [], onChange }: Props) => {
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  const validOrderTypes = orderTypeOptions.filter(o => o.label && o.label.trim() !== "" && o.value && o.value !== "0");
  const defaultOrderTypes = validOrderTypes.length > 0 ? validOrderTypes : [
    { value: "1", label: "Dine In" },
    { value: "2", label: "Take Out" },
    { value: "3", label: "Drive Thru" },
    { value: "4", label: "Delivery" },
    { value: "6", label: "Coming" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 border-b border-gray-100 pb-2 mb-4 uppercase tracking-widest">General POS</h3>
        
        <div className="grid gap-y-3">
          <Checkbox 
            id="conf-pos-company"
            label="Company Name (KOT)" 
            checked={form.companyNameKOT} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("companyNameKOT", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-vat")}
          />
          <Checkbox 
            id="conf-pos-vat"
            label="Enable VAT (Guest Print)" 
            checked={!!form.enableVat} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("enableVat", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-location")}
          />
          <Checkbox 
            id="conf-pos-location"
            label="Location Wise Price" 
            checked={form.locationWisePrice} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("locationWisePrice", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-alt")}
          />
          
          <SelectInput
            id="conf-pos-alt"
            label="Alternative Price"
            autoFocus
            value={form.alternativeOrder}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("alternativeOrder", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-order-type")}
            options={[
              { value: "Id", label: "Id" },
              { value: "Name", label: "Name" },
              { value: "Price", label: "Price" },
            ]}
          />

          <SelectInput
            id="conf-pos-order-type"
            label="Default Order Type"
            placeholder=""
            value={form.defaultOrderTypeId && form.defaultOrderTypeId !== "0" ? form.defaultOrderTypeId : "1"}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("defaultOrderTypeId", e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-default-employee")}
            options={defaultOrderTypes}
          />

          <Checkbox
            id="conf-pos-default-employee"
            label="Default Employee"
            checked={form.defaultEmployee}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("defaultEmployee", e.target.checked)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-employee")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Employee</label>
            <SearchableSelect
              id="conf-pos-employee"
              options={employeeOptions}
              value={form.employeeId}
              onChange={(value) => onChange("employeeId", value)}
              placeholder="Select employee"
              disabled={!form.defaultEmployee}
            />
          </div>

          <Checkbox
            id="conf-pos-group-menu"
            label="Group in Menu"
            checked={form.groupInMenu}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("groupInMenu", e.target.checked)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-disc")}
          />

          <SelectInput
            id="conf-pos-disc"
            label="Discount Calculation"
            value={form.discCalc}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("discCalc", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-priceview")}
            options={[
              { value: "Inclusive", label: "Inclusive" },
              { value: "Exclusive", label: "Exclusive" },
            ]}
          />

          <SelectInput
            id="conf-pos-priceview"
            label="Price View"
            value={form.priceView}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("priceView", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-cashdrawer")}
            options={[
              { value: "Inclusive", label: "Inclusive" },
              { value: "Exclusive", label: "Exclusive" },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 border-b border-gray-100 pb-2 mb-4 uppercase tracking-widest">Operational Flags</h3>
        
        <div className="grid gap-y-3">
          <SelectInput
            id="conf-pos-cashdrawer"
            label="Cashdrawer Type"
            value={form.cashdrawer}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("cashdrawer", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-print")}
            options={[
              { value: "Default", label: "Default" },
              { value: "Normal", label: "Normal" },
            ]}
          />

          <SelectInput
            id="conf-pos-print"
            label="Print Price"
            value={form.printPrice}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("printPrice", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-recipe")}
            options={[
              { value: "Inclusive", label: "Inclusive" },
              { value: "Exclusive", label: "Exclusive" },
            ]}
          />

          <Checkbox 
            id="conf-pos-recipe"
            label="Enable Recipe" 
            checked={form.recipe} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("recipe", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-daydate")}
          />
          <Checkbox 
            id="conf-pos-daydate"
            label="Enable Day Date" 
            checked={form.dayDate} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("dayDate", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-multi")}
          />
          <Checkbox 
            id="conf-pos-multi"
            label="Multi Employee (Table)" 
            checked={form.multiEmployeeTable} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("multiEmployeeTable", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-customer")}
          />
          <Checkbox 
            id="conf-pos-customer"
            label="Customer (Takeout)" 
            checked={form.customerTakeout} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("customerTakeout", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-settle")}
          />
          <Checkbox 
            id="conf-pos-settle"
            label="Delivery Settle" 
            checked={form.deliverySettle} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("deliverySettle", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-recall")}
          />
          <Checkbox 
            id="conf-pos-recall"
            label="Show Delivery (Recall)" 
            checked={form.showDeliveryRecall} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("showDeliveryRecall", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-provider-menu-status")}
          />
          <Checkbox 
            id="conf-pos-provider-menu-status"
            label="Provider Own Menu Status" 
            checked={form.providerOwnMenuStatus} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("providerOwnMenuStatus", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "btn-save-pos-config")}
          />
        </div>
      </div>
    </div>
  );
};

export default PosSettingsTab;
