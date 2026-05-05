import { useState } from "react";
import { LayoutGrid, Printer, DollarSign, CalendarDays, Save } from "lucide-react";
import { PageShell, Button } from "../../../../components/common";
import { useConfigurationManager } from "../hooks/useConfigurationManager";
import PosSettingsTab from "../components/PosSettingsTab";
import PrintingTab from "../components/PrintingTab";
import ChargesTab from "../components/ChargesTab";
import DayEndTab from "../components/DayEndTab";

const ConfigurationPage = () => {
  const { form, employeeOptions, saving, setField, setDayEndField, addDeliveryCharge, removeDeliveryCharge, handleSave } = useConfigurationManager();
  const [activeTab, setActiveTab] = useState<"pos" | "printing" | "charges" | "dayend">("pos");

  const tabs = [
    { id: "pos", label: "POS Settings", icon: <LayoutGrid size={18} /> },
    { id: "printing", label: "KOT & Printing", icon: <Printer size={18} /> },
    { id: "charges", label: "Charges & Delivery", icon: <DollarSign size={18} /> },
    { id: "dayend", label: "Day End", icon: <CalendarDays size={18} /> },
  ] as const;

  return (
    <PageShell title="POS Configuration">
      <div className="flex flex-col gap-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 shadow-inner">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white text-[#49293e] shadow-md"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <Button onClick={handleSave} disabled={saving} className="shadow-lg">
            <Save size={18} />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>

        {/* Tab Content */}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl min-h-[600px]">
          {activeTab === "pos" && (
            <PosSettingsTab form={form} employeeOptions={employeeOptions} onChange={setField} />
          )}
          {activeTab === "printing" && (
            <PrintingTab form={form} onChange={setField} />
          )}
          {activeTab === "charges" && (
            <ChargesTab 
              form={form} 
              onChange={setField} 
              onAddDelivery={addDeliveryCharge} 
              onRemoveDelivery={removeDeliveryCharge} 
            />
          )}
          {activeTab === "dayend" && (
            <DayEndTab form={form} onChange={setDayEndField} />
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default ConfigurationPage;
