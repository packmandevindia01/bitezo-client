import type { ConfigurationState } from "../types";
import { Checkbox } from "../../../../components/common";

interface Props {
  form: ConfigurationState;
  onChange: (key: keyof ConfigurationState["dayEnd"], value: boolean) => void;
}

const DayEndTab = ({ form, onChange }: Props) => {
  const flags = [
    { key: "category", label: "Category" },
    { key: "voucherEntry", label: "Voucher Entry" },
    { key: "orderType", label: "Order Type" },
    { key: "employee", label: "Employee" },
    { key: "voidItem", label: "Void Item" },
    { key: "denomination", label: "Denomination" },
    { key: "product", label: "Product" },
    { key: "group", label: "Group" },
    { key: "driver", label: "Driver" },
  ] as const;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 uppercase tracking-widest border-b border-gray-100 pb-2">Day End Requirements</h3>
        <p className="mt-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider opacity-70">Configure which entities must be settled or checked before performing a Day End.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 rounded-2xl border border-gray-100 bg-gray-50/30 p-6 shadow-sm">
        {flags.map((flag) => (
          <Checkbox
            key={flag.key}
            label={flag.label}
            checked={form.dayEnd[flag.key]}
            onChange={(e) => onChange(flag.key, e.target.checked)}
          />
        ))}
      </div>
    </div>
  );
};

export default DayEndTab;
