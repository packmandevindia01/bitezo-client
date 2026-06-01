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
  onKeyDown?: (e: React.KeyboardEvent, nextId?: string) => void;
}

const ModifierBasicFields = ({ form, modifierTypes, onChange, onKeyDown }: ModifierBasicFieldsProps) => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const typeOptions = modifierTypes.map(t => ({ 
    label: t.name, 
    value: String(t.typeId || (t as any).id) 
  }));

  const handleEnter = (e: React.KeyboardEvent, nextId?: string) => {
    if (onKeyDown) {
      onKeyDown(e, nextId);
    }
  };

  return (
    <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
      <FormInput 
        id="mod-name"
        label="Name" 
        placeholder="e.g. Extra Cheese"
        required
        value={form.name} 
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("name", e.target.value)} 
        onKeyDown={(e) => handleEnter(e, "mod-arabic")}
        autoFocus
      />
      
      <FormInput
        id="mod-arabic"
        label="Arabic"
        placeholder="الاسم بالعربي"
        value={form.arabic}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("arabic", e.target.value)}
        onKeyDown={(e) => handleEnter(e, "mod-type")}
      />

      <SelectInput
        id="mod-type"
        label="Type"
        required
        options={typeOptions}
        value={form.typeId}
        placeholder="Select type"
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange("typeId", e.target.value)}
        onKeyDown={(e) => handleEnter(e, "mod-price")}
      />

      <FormInput
        id="mod-price"
        label="Price"
        type="text"
        inputMode="decimal"
        inputClassName="text-right"
        placeholder={formatAmount(0, decimalPart)}
        value={form.price}
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
      />

      <div className="flex flex-col gap-1.5">
         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Display Color</label>
         <div className="flex items-center gap-3">
           <input
             type="color"
             value={form.color}
             onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("color", e.target.value)}
             className="h-10.5 w-20 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
           />
           <span className="text-xs font-mono text-gray-500 uppercase">{form.color}</span>
         </div>
      </div>
    </div>
  );
};

export default ModifierBasicFields;
