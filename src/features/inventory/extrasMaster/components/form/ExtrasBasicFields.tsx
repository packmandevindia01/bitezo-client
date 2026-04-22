import { FormInput, SelectInput } from "../../../../../components/common";
import type { ExtrasMasterForm as ExtrasMasterFormType } from "../../types";

interface ExtrasBasicFieldsProps {
  form: ExtrasMasterFormType;
  typeOptions: { label: string; value: string }[];
  onChange: <K extends keyof ExtrasMasterFormType>(
    key: K,
    value: ExtrasMasterFormType[K]
  ) => void;
}

const ExtrasBasicFields = ({ form, typeOptions, onChange }: ExtrasBasicFieldsProps) => {
  return (
    <div className="grid max-w-2xl gap-4 md:grid-cols-2">
      <FormInput
        label="Name"
        required
        placeholder="e.g. Extra Mayo"
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
        label="Price (Incl)"
        type="number"
        step="0.001"
        placeholder="0.000"
        value={form.price}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange("price", e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-xs md:text-sm font-medium text-gray-700">Display Color</label>
        <div className="flex h-[42px] items-center gap-3 rounded-lg border border-gray-300 bg-white px-3">
          <input
            type="color"
            value={form.color}
            onChange={(e) => onChange("color", e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border-none bg-transparent p-0"
          />
          <span className="text-xs font-mono uppercase text-gray-500">{form.color}</span>
        </div>
      </div>
    </div>
  );
};

export default ExtrasBasicFields;
