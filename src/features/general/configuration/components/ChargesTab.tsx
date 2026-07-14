import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ConfigurationState } from "../types";
import { Button, Table, FormInput } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";

interface Props {
  form: ConfigurationState;
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
  onAddDelivery: (name: string, charge: number) => void;
  onRemoveDelivery: (id: string) => void;
  onInputFocus?: () => void;
}

const ChargesTab = ({ form, onChange, onAddDelivery, onRemoveDelivery, onInputFocus }: Props) => {
  const { formatAmount } = useCurrency();
  const [newName, setNewName] = useState("");
  const [newCharge, setNewCharge] = useState("");

  const handleAdd = () => {
    onAddDelivery(newName, parseFloat(newCharge) || 0);
    setNewName("");
    setNewCharge("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Standard Charges */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Global Percentage Charges</h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
          <FormInput
            id="conf-charge-service"
            label="Service Charge (%)"
            type="number"
            autoFocus
            inputClassName="text-right"
            value={String(form.serviceCharge)}
            onChange={(e) => onChange("serviceCharge", parseFloat(e.target.value) || 0)}
            onFocus={(e) => {
              onInputFocus?.();
              setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
            }}
          />
          <FormInput
            id="conf-charge-levy"
            label="Levy (%)"
            type="number"
            inputClassName="text-right"
            value={String(form.levy)}
            onChange={(e) => onChange("levy", parseFloat(e.target.value) || 0)}
            onFocus={(e) => {
              onInputFocus?.();
              setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
            }}
          />
          <FormInput
            id="conf-charge-default-delivery"
            label="Default Delivery Charge"
            type="number"
            inputClassName="text-right"
            value={String(form.defaultDeliveryCharge)}
            onChange={(e) => onChange("defaultDeliveryCharge", parseFloat(e.target.value) || 0)}
            onFocus={(e) => {
              onInputFocus?.();
              setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
            }}
          />
        </div>
      </div>

      {/* Multi Delivery Charges Section */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-[#49293e]/60 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Multi Delivery Zones</h3>
        
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1.5fr_1fr_auto]">
            <FormInput
              id="conf-charge-name"
              label="Zone/Charge Name"
              placeholder="e.g. Zone 1, Remote..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onFocus={(e) => {
                onInputFocus?.();
                setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
              }}
            />
            <FormInput
              id="conf-charge-amount"
              label="Amount"
              type="number"
              inputClassName="text-right"
              placeholder="0.00"
              value={newCharge}
              onChange={(e) => setNewCharge(e.target.value)}
              onFocus={(e) => {
                onInputFocus?.();
                setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
              }}
            />
            <div className="pb-1">
              <Button onClick={handleAdd} className="h-10.5 whitespace-nowrap px-6" icon={<Plus size={18} />}>
                Add Zone
              </Button>
            </div>
          </div>

          <div className="mt-3 max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
            <Table
              columns={[
                { 
                  header: "NAME", 
                  accessor: "name",
                  render: (row) => <span className="text-[11px] font-bold text-gray-600">{row.name}</span>
                },
                { 
                  header: "AMOUNT", 
                  accessor: "charge",
                  align: "right",
                  render: (row) => <span className="font-bold text-[#49293e]">{formatAmount(row.charge)}</span>
                },
                {
                  header: "ACTIONS",
                  accessor: "id",
                  align: "right",
                  render: (row) => (
                    <button
                      onClick={() => onRemoveDelivery(row.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )
                }
              ]}
              data={form.multiDeliveryCharges}
              rowKey="id"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargesTab;
