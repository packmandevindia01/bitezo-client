import { FormInput, SelectInput } from "../../../../../components/common";
import type { ExtrasMasterForm as ExtrasMasterFormType } from "../../types";
import { formatAmount, sanitizeAmountInput } from "../../../../../utils/formatters";
import { useAppSelector } from "../../../../../app/hooks";
import { selectDecimalPart } from "../../../../auth/store/authSlice";

interface ExtrasBasicFieldsProps {
  form: ExtrasMasterFormType;
  typeOptions: { label: string; value: string }[];
  onChange: <K extends keyof ExtrasMasterFormType>(
    key: K,
    value: ExtrasMasterFormType[K]
  ) => void;
  onKeyDown?: (e: React.KeyboardEvent, nextId?: string) => void;
}

const ExtrasBasicFields = ({ form, typeOptions, onChange, onKeyDown }: ExtrasBasicFieldsProps) => {
  const decimalPart = useAppSelector(selectDecimalPart);

  const handleEnter = (e: React.KeyboardEvent, nextId?: string) => {
    if (onKeyDown) {
      onKeyDown(e, nextId);
    }
  };

  return (
    <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
      <FormInput
        id="ext-name"
        label="Name"
        required
        placeholder="e.g. Extra Mayo"
        value={form.name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("name", e.target.value)}
        onKeyDown={(e) => handleEnter(e, "ext-arabic")}
        autoFocus
      />

      <FormInput
        id="ext-arabic"
        label="Arabic"
        placeholder="الاسم بالعربي"
        value={form.arabic}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("arabic", e.target.value)}
        onKeyDown={(e) => handleEnter(e, "ext-type")}
      />



      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Display Color</label>
        <div className="flex h-10.5 items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 transition-colors focus-within:border-[#49293e] focus-within:ring-1 focus-within:ring-[#49293e]/10">
          <input
            type="color"
            value={form.color}
            onChange={(e) => onChange("color", e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border-none bg-transparent p-0"
          />
          <span className="text-xs font-mono uppercase text-gray-500">{form.color}</span>
        </div>
      </div>
    </div>
  );
};

export default ExtrasBasicFields;
