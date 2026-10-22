import React from "react";
import type { ConfigurationState } from "../types";
import { SearchableSelect, SelectInput } from "../../../../components/common";
import Checkbox from "../../../../components/common/Checkbox";
import type { ConfigurationEmployeeOption } from "../hooks/useConfigurationManager";
import { t } from "../../../pos/utils/posLocalization";

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

  const localizedOrderTypes = defaultOrderTypes.map(ot => ({
    value: ot.value,
    label: t(ot.label, form.posLanguage),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 border-b border-gray-100 pb-2 mb-4 uppercase tracking-widest">
          {t("General POS", form.posLanguage)}
        </h3>
        
        <div className="grid gap-y-3">
          <Checkbox 
            id="conf-pos-company"
            label={t("Company Name (KOT)", form.posLanguage)} 
            checked={form.companyNameKOT} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("companyNameKOT", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-vat")}
          />
          <Checkbox 
            id="conf-pos-vat"
            label={t("Enable VAT (Guest Print)", form.posLanguage)} 
            checked={!!form.enableVat} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("enableVat", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-location")}
          />
          <Checkbox 
            id="conf-pos-location"
            label={t("Location Wise Price", form.posLanguage)} 
            checked={form.locationWisePrice} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("locationWisePrice", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-alt")}
          />
          
          <SelectInput
            id="conf-pos-alt"
            label={t("Alternative Price", form.posLanguage)}
            autoFocus
            value={form.alternativeOrder}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("alternativeOrder", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-order-type")}
            options={[
              { value: "Id", label: t("Id", form.posLanguage) },
              { value: "Name", label: t("Name", form.posLanguage) },
              { value: "Price", label: t("Price", form.posLanguage) },
            ]}
          />

          <SelectInput
            id="conf-pos-order-type"
            label={t("Default Order Type", form.posLanguage)}
            placeholder=""
            value={form.defaultOrderTypeId && form.defaultOrderTypeId !== "0" ? form.defaultOrderTypeId : "1"}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("defaultOrderTypeId", e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-default-employee")}
            options={localizedOrderTypes}
          />

          <Checkbox
            id="conf-pos-default-employee"
            label={t("Default Employee", form.posLanguage)}
            checked={form.defaultEmployee}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("defaultEmployee", e.target.checked)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-employee")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {t("Employee", form.posLanguage)}
            </label>
            <SearchableSelect
              id="conf-pos-employee"
              options={employeeOptions}
              value={form.employeeId}
              onChange={(value) => onChange("employeeId", value)}
              placeholder={t("Select Employee", form.posLanguage)}
              disabled={!form.defaultEmployee}
            />
          </div>

          <SelectInput
            id="conf-pos-disc"
            label={t("Discount Calculation", form.posLanguage)}
            value={form.discCalc}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("discCalc", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-priceview")}
            options={[
              { value: "Inclusive", label: t("Inclusive", form.posLanguage) },
              { value: "Exclusive", label: t("Exclusive", form.posLanguage) },
            ]}
          />

          <SelectInput
            id="conf-pos-priceview"
            label={t("Price View", form.posLanguage)}
            value={form.priceView}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("priceView", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-language")}
            options={[
              { value: "Inclusive", label: t("Inclusive", form.posLanguage) },
              { value: "Exclusive", label: t("Exclusive", form.posLanguage) },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 border-b border-gray-100 pb-2 mb-4 uppercase tracking-widest">
          {t("Operational Flags", form.posLanguage)}
        </h3>
        
        <div className="grid gap-y-3">
          <SelectInput
            id="conf-pos-language"
            label={t("POS Language", form.posLanguage)}
            value={form.posLanguage || "English"}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const newLang = e.target.value as any;
              onChange("posLanguage", newLang);
              localStorage.setItem("posLanguage", newLang);
              window.dispatchEvent(new Event("storage"));
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-product-view")}
            options={[
              { value: "English", label: t("English", form.posLanguage) },
              { value: "Arabic", label: t("Arabic", form.posLanguage) },
              { value: "Thai", label: t("Thai", form.posLanguage) },
            ]}
          />

          <SelectInput
            id="conf-pos-product-view"
            label={t("Product View", form.posLanguage)}
            value={form.productView || "English"}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const newView = e.target.value as any;
              onChange("productView", newView);
              localStorage.setItem("productView", newView);
              window.dispatchEvent(new Event("storage"));
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-cashdrawer")}
            options={[
              { value: "English", label: t("English", form.posLanguage) },
              { value: "Arabic", label: t("Arabic", form.posLanguage) },
              { value: "English and Arabic", label: t("English and Arabic", form.posLanguage) },
            ]}
          />

          <SelectInput
            id="conf-pos-cashdrawer"
            label={t("Cashdrawer Type", form.posLanguage)}
            value={form.cashdrawer}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("cashdrawer", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-print")}
            options={[
              { value: "Default", label: t("Default", form.posLanguage) },
              { value: "Normal", label: t("Normal", form.posLanguage) },
            ]}
          />

          <SelectInput
            id="conf-pos-print"
            label={t("Print Price", form.posLanguage)}
            value={form.printPrice}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("printPrice", e.target.value as any)}
            onKeyDown={(e: React.KeyboardEvent<HTMLSelectElement>) => handleKeyDown(e, "conf-pos-item-seperation")}
            options={[
              { value: "Inclusive", label: t("Inclusive", form.posLanguage) },
              { value: "Exclusive", label: t("Exclusive", form.posLanguage) },
            ]}
          />

          <Checkbox 
            id="conf-pos-item-seperation"
            label={t("Item Separation", form.posLanguage)} 
            checked={!!form.itemSeperation} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("itemSeperation", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-recipe")}
          />

          <Checkbox 
            id="conf-pos-recipe"
            label={t("Enable Recipe", form.posLanguage)} 
            checked={form.recipe} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("recipe", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-daydate")}
          />
          <Checkbox 
            id="conf-pos-daydate"
            label={t("Enable Day Date", form.posLanguage)} 
            checked={form.dayDate} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("dayDate", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-multi")}
          />
          <Checkbox 
            id="conf-pos-multi"
            label={t("Multi Employee (Table)", form.posLanguage)} 
            checked={form.multiEmployeeTable} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("multiEmployeeTable", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-customer")}
          />
          <Checkbox 
            id="conf-pos-customer"
            label={t("Customer (Takeout)", form.posLanguage)} 
            checked={form.customerTakeout} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("customerTakeout", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-settle")}
          />
          <Checkbox 
            id="conf-pos-settle"
            label={t("Delivery Settle", form.posLanguage)} 
            checked={form.deliverySettle} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("deliverySettle", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-recall")}
          />
          <Checkbox 
            id="conf-pos-recall"
            label={t("Show Delivery (Recall)", form.posLanguage)} 
            checked={form.showDeliveryRecall} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("showDeliveryRecall", e.target.checked)} 
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, "conf-pos-provider-menu-status")}
          />
          <Checkbox 
            id="conf-pos-provider-menu-status"
            label={t("Provider Own Menu Status", form.posLanguage)} 
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
