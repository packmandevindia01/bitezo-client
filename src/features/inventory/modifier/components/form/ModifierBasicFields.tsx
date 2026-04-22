import { FormInput, SelectInput } from "../../../../../components/common";
import type { ModifierForm } from "../../types";
import type { ModifierTypeRecord } from "../../../modifierType/types";

interface ModifierBasicFieldsProps {
  form: ModifierForm;
  modifierTypes: ModifierTypeRecord[];
  onChange: <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => void;
}

const ModifierBasicFields = ({ form, modifierTypes, onChange }: ModifierBasicFieldsProps) => {
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
        type="number"
        placeholder="0.000"
        value={form.price}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("price", e.target.value)}
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
