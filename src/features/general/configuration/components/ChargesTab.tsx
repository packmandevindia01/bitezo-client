import { useState } from "react";
import { Plus, Trash2, DollarSign } from "lucide-react";
import type { ConfigurationState } from "../types";
import { FormInput, Button, Table } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";

interface Props {
  form: ConfigurationState;
  onChange: <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => void;
  onAddDelivery: (name: string, charge: number) => void;
  onRemoveDelivery: (id: string) => void;
}

const ChargesTab = ({ form, onChange, onAddDelivery, onRemoveDelivery }: Props) => {
  const { formatAmount } = useCurrency();
  const [newName, setNewName] = useState("");
  const [newCharge, setNewCharge] = useState("");

  const handleAdd = () => {
    onAddDelivery(newName, parseFloat(newCharge) || 0);
    setNewName("");
    setNewCharge("");
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Standard Charges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormInput
          label="Service Charge (%)"
          type="number"
          value={String(form.serviceCharge)}
          onChange={(e) => onChange("serviceCharge", parseFloat(e.target.value) || 0)}
        />
        <FormInput
          label="Levy (%)"
          type="number"
          value={String(form.levy)}
          onChange={(e) => onChange("levy", parseFloat(e.target.value) || 0)}
        />
        <FormInput
          label="Default Delivery Charge"
          type="number"
          value={String(form.defaultDeliveryCharge)}
          onChange={(e) => onChange("defaultDeliveryCharge", parseFloat(e.target.value) || 0)}
        />
      </div>

      {/* Multi Delivery Charges Section */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-[#49293e]/10 text-[#49293e]">
            <DollarSign size={20} />
          </div>
          <h3 className="text-xl font-bold text-[#49293e]">Multi Delivery Charges</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end mb-8">
          <FormInput
            label="Charge Name"
            placeholder="e.g. Zone 1, Remote..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <FormInput
            label="Amount"
            type="number"
            placeholder="0.00"
            value={newCharge}
            onChange={(e) => setNewCharge(e.target.value)}
          />
          <Button onClick={handleAdd} className="h-10 mb-4">
            <Plus size={18} />
            Add Charge
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <Table
            columns={[
              { header: "Name", accessor: "name" },
              { 
                header: "Charge Amount", 
                accessor: "charge",
                render: (row) => <span className="font-bold text-[#49293e]">{formatAmount(row.charge)}</span>
              },
              {
                header: "Actions",
                accessor: "id",
                render: (row) => (
                  <button
                    onClick={() => onRemoveDelivery(row.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )
              }
            ]}
            data={form.multiDeliveryCharges}
            rowKey="id"
          />
          {form.multiDeliveryCharges.length === 0 && (
            <div className="p-10 text-center text-gray-400 italic">
              No delivery charges added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChargesTab;
