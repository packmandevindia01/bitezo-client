import type { ConfigurationState } from "../types";
import { Toggle } from "../../../../components/common";

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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[#49293e]">Day End Requirements</h3>
        <p className="text-sm text-gray-500">Configure which entities must be settled or checked before performing a Day End.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 rounded-2xl border border-gray-100 bg-gray-50/30 p-6">
        {flags.map((flag) => (
          <Toggle
            key={flag.key}
            label={flag.label}
            enabled={form.dayEnd[flag.key]}
            onChange={(val) => onChange(flag.key, val)}
          />
        ))}
      </div>
    </div>
  );
};

export default DayEndTab;
