
import { FormInput } from "../../../../../components/common";
import type { ModifierForm } from "../../types";

interface ModifierBasicFieldsProps {
  form: ModifierForm;
  onChange: <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => void;
  onKeyDown?: (e: React.KeyboardEvent, nextId?: string) => void;
}

const ModifierBasicFields = ({ form, onChange, onKeyDown }: ModifierBasicFieldsProps) => {
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
