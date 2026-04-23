import { FormInput, SelectInput } from "../../../../../components/common";
import type { ModifierForm } from "../../types";
import type { ModifierTypeRecord } from "../../../modifierType/types";
import { formatAmount, sanitizeAmountInput } from "../../../../../utils/formatters";
import { useAppSelector } from "../../../../../app/hooks";
import { selectDecimalPart } from "../../../../auth/store/authSlice";

interface ModifierBasicFieldsProps {
  form: ModifierForm;
  modifierTypes: ModifierTypeRecord[];
  onChange: <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => void;
}

const ModifierBasicFields = ({ form, modifierTypes, onChange }: ModifierBasicFieldsProps) => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const typeOptions = modifierTypes.map(t => ({ 
    label: t.name, 
    value: String(t.typeId || (t as any).id) 
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormInput 
        label="Name" 
        placeholder="e.g. Extra Cheese"
        required
        value={form.name} 
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("name", e.target.value)} 
        autoFocus
      />
      
      <FormInput
        label="Arabic"
        placeholder="الاسم بالعربي"
        value={form.arabic}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("arabic", e.target.value)}
      />

      <SelectInput
        label="Type"
        required
        options={typeOptions}
        value={form.typeId}
        placeholder="Select type"
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("typeId", e.target.value)}
      />

      <FormInput
        label="Price"
        type="text"
        inputMode="decimal"
        placeholder={formatAmount(0, decimalPart)}
        value={form.price === "0" ? formatAmount(0, decimalPart) : form.price}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const next = sanitizeAmountInput(e.target.value, decimalPart);
          if (next !== null) onChange("price", next);
        }}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          if (e.target.value !== "" && e.target.value !== ".") {
            onChange("price", formatAmount(e.target.value, decimalPart));
          }
        }}
        className="font-mono"
      />

      <div className="flex flex-col gap-2">
         <label className="text-sm font-medium text-gray-700">Display Color</label>
         <div className="flex items-center gap-3">
           <input
             type="color"
             value={form.color}
             onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("color", e.target.value)}
             className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
           />
           <span className="text-xs font-mono text-gray-500 uppercase">{form.color}</span>
         </div>
      </div>
    </div>
  );
};

export default ModifierBasicFields;
