import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, LayoutGrid, Printer, DollarSign, CalendarDays, Save, Keyboard 
} from 'lucide-react';
import { Button } from '../../../../components/common';
import { TouchKeyboard } from '../../../../components/common/TouchKeyboard';
import { usePosConfiguration } from '../hooks/usePosConfiguration';
import PosSettingsTab from '../../../general/configuration/components/PosSettingsTab';
import PrintingTab from '../../../general/configuration/components/PrintingTab';
import ChargesTab from '../../../general/configuration/components/ChargesTab';
import DayEndTab from '../../../general/configuration/components/DayEndTab';

type PosConfigTab = "pos" | "printing" | "charges" | "dayend";

export const PosConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PosConfigTab>("pos");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  const { 
    form, 
    employeeOptions, 
    orderTypeOptions,
    saving, 
    setField, 
    setDayEndField, 
    addDeliveryCharge, 
    removeDeliveryCharge, 
    handleSave 
  } = usePosConfiguration();

  const handleBack = () => {
    navigate('/pos', { state: { openMoreModal: true } });
  };

  React.useEffect(() => {
    const updateViewportMode = () => {
      setIsCompactViewport(window.innerWidth < 1200 || window.innerHeight < 820);
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  const getSubtitle = () => {
    switch (activeTab) {
      case 'pos': return "General POS Settings";
      case 'printing': return "KOT & Printing Routing";
      case 'charges': return "Additional Charges & Fees";
      case 'dayend': return "Day End Closing Rules";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-[#fcf9fb] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-500 hover:text-[#49293e]"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-[#49293e] uppercase tracking-tight">
              POS Configuration
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {getSubtitle()}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
          {[
            { id: 'pos', label: 'POS Settings', icon: <LayoutGrid size={14} /> },
            { id: 'printing', label: 'KOT & Printing', icon: <Printer size={14} /> },
            { id: 'charges', label: 'Charges', icon: <DollarSign size={14} /> },
            { id: 'dayend', label: 'Day End', icon: <CalendarDays size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PosConfigTab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-[#49293e] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyboard(!showKeyboard)}
            className={`p-2 rounded-lg border transition-all ${
              showKeyboard ? "bg-[#49293e] text-white border-[#49293e]" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
            title="Toggle Virtual Keyboard"
          >
            <Keyboard size={18} />
          </button>
          <Button 
            id="btn-save-pos-config"
            onClick={handleSave} 
            disabled={saving} 
            isAction
            loading={saving}
            icon={<Save size={18} />}
          >
            Save Changes
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-7xl mx-auto h-full w-full relative">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 min-h-[500px]">
            {activeTab === "pos" && (
              <PosSettingsTab 
                form={form} 
                employeeOptions={employeeOptions} 
                orderTypeOptions={orderTypeOptions}
                onChange={setField} 
              />
            )}
            {activeTab === "printing" && (
              <PrintingTab 
                form={form} 
                onChange={setField} 
                onInputFocus={() => setShowKeyboard(true)}
              />
            )}
            {activeTab === "charges" && (
              <ChargesTab 
                form={form} 
                onChange={setField} 
                onAddDelivery={addDeliveryCharge} 
                onRemoveDelivery={removeDeliveryCharge} 
                onInputFocus={() => setShowKeyboard(true)}
              />
            )}
            {activeTab === "dayend" && (
              <DayEndTab 
                form={form} 
                onChange={setDayEndField} 
              />
            )}
          </div>
        </div>
      </main>

      {showKeyboard && (
        <div className={`shrink-0 w-full bg-[#f8f9fa] mt-auto ${isCompactViewport ? "px-1 pb-1" : "px-3 lg:px-4 pb-2"} border-t border-slate-200 animate-in slide-in-from-bottom-2`}>
          <div className={`w-full ${isCompactViewport ? "max-w-[900px]" : "max-w-[1000px]"} mx-auto bg-gradient-to-b from-[#faf8f9] to-[#f3edf0] border border-slate-300 shadow-[0_15px_40px_rgba(73,41,62,0.08)] rounded-2xl ${isCompactViewport ? "p-1" : "p-2 lg:p-2.5"}`}>
            <TouchKeyboard 
              onClose={() => setShowKeyboard(false)} 
              size={isCompactViewport ? "md" : "lg"}
              embedded={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PosConfigurationPage;
