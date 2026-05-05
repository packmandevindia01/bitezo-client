import { useState } from "react";
import { Plus, Trash2, DollarSign } from "lucide-react";
import type { ConfigurationState } from "../types";
import { Button, Table } from "../../../../components/common";
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
  const chargeLabelClass = "shrink-0 text-xs font-medium text-gray-700 md:text-sm";
  const inlineFieldClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 md:px-4 md:text-base";

  const handleAdd = () => {
    onAddDelivery(newName, parseFloat(newCharge) || 0);
    setNewName("");
    setNewCharge("");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Standard Charges */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="grid grid-cols-[max-content_minmax(5rem,1fr)] items-center gap-2">
          <label htmlFor="conf-charge-service" className={chargeLabelClass}>
            Service Charge (%)
          </label>
          <input
            id="conf-charge-service"
            type="number"
            autoFocus
            min="0"
            onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
            value={String(form.serviceCharge)}
            onChange={(e) => onChange("serviceCharge", parseFloat(e.target.value) || 0)}
            className={`${inlineFieldClass} text-right`}
          />
        </div>
        <div className="grid grid-cols-[max-content_minmax(5rem,1fr)] items-center gap-2">
          <label htmlFor="conf-charge-levy" className={chargeLabelClass}>
            Levy (%)
          </label>
          <input
            id="conf-charge-levy"
            type="number"
            min="0"
            onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
            value={String(form.levy)}
            onChange={(e) => onChange("levy", parseFloat(e.target.value) || 0)}
            className={`${inlineFieldClass} text-right`}
          />
        </div>
        <div className="grid grid-cols-[max-content_minmax(5rem,1fr)] items-center gap-2">
          <label htmlFor="conf-charge-default-delivery" className={chargeLabelClass}>
            Default Delivery Charge
          </label>
          <input
            id="conf-charge-default-delivery"
            type="number"
            min="0"
            onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
            value={String(form.defaultDeliveryCharge)}
            onChange={(e) => onChange("defaultDeliveryCharge", parseFloat(e.target.value) || 0)}
            className={`${inlineFieldClass} text-right`}
          />
        </div>
      </div>

      {/* Multi Delivery Charges Section */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-[#49293e]/10 p-2 text-[#49293e]">
            <DollarSign size={18} />
          </div>
          <h3 className="text-lg font-bold text-[#49293e]">Multi Delivery Charges</h3>
        </div>

        <div className="mb-4 grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="grid grid-cols-[max-content_12rem] items-center gap-2">
            <label htmlFor="conf-charge-name" className={chargeLabelClass}>
              Charge Name
            </label>
            <input
              id="conf-charge-name"
              placeholder="e.g. Zone 1, Remote..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={inlineFieldClass}
            />
          </div>
          <div className="grid grid-cols-[max-content_12rem] items-center gap-2">
            <label htmlFor="conf-charge-amount" className={chargeLabelClass}>
              Amount
            </label>
            <input
              id="conf-charge-amount"
              type="number"
              min="0"
              onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
              placeholder="0.00"
              value={newCharge}
              onChange={(e) => setNewCharge(e.target.value)}
              className={`${inlineFieldClass} text-right`}
            />
          </div>
          <Button onClick={handleAdd} className="h-10 whitespace-nowrap">
            <Plus size={18} />
            Add Charge
          </Button>
        </div>

        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
          <Table
            columns={[
              { header: "Name", accessor: "name" },
              { 
                header: "Charge Amount", 
                accessor: "charge",
                align: "right",
                render: (row) => <span className="font-bold text-[#49293e]">{formatAmount(row.charge)}</span>
              },
              {
                header: "Actions",
                accessor: "id",
                align: "right",
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
        </div>
      </div>
    </div>
  );
};

export default ChargesTab;
