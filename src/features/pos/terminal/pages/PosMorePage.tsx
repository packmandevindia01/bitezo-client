import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft,
} from 'lucide-react';
import { Loader } from '../../../../components/common';
import { PrinterSettingsTab } from '../components/printer/PrinterSettingsTab';
import { ProductWisePrinterTab } from '../components/printer/ProductWisePrinterTab';
import { SectionWisePrinterTab } from '../components/printer/SectionWisePrinterTab';
import { OrderTypeWisePrinterTab } from '../components/printer/OrderTypeWisePrinterTab';
import { CategoryWisePrinterTab } from '../components/printer/CategoryWisePrinterTab';
import { usePrinterSettings } from '../hooks/usePrinterSettings';

type PrinterTab = 'GENERAL' | 'CATEGORY' | 'PRODUCT' | 'SECTION' | 'ORDER_TYPE';

export const PosMorePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PrinterTab>('GENERAL');
  
  const { 
    loading, 
    general, 
    categories, 
    products, 
    sections, 
    orderTypes,
    saveGeneral,
    saveCategoryMappings,
    saveProductMappings,
    saveSectionMappings,
    saveOrderTypeMappings
  } = usePrinterSettings();

  const handleBack = () => {
    navigate('/pos', { state: { openMoreModal: true } });
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'GENERAL': return "General Hardware Configuration";
      case 'CATEGORY': return "Category-Specific Routing";
      case 'PRODUCT': return "Product-Specific Routing";
      case 'SECTION': return "Section-Specific Routing";
      case 'ORDER_TYPE': return "Order Type Master KOT Routing";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9fb] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
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
              Printer Settings
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
            { id: 'GENERAL', label: 'General' },
            { id: 'CATEGORY', label: 'Category' },
            { id: 'PRODUCT', label: 'Product' },
            { id: 'SECTION', label: 'Section' },
            { id: 'ORDER_TYPE', label: 'Order Type' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PrinterTab)}
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-[#49293e] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="max-w-7xl mx-auto h-full w-full relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-3xl">
              <Loader text="Syncing Hardware..." />
            </div>
          )}
          
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden h-full flex flex-col">
            <div className="p-6 md:p-8 flex-1 flex flex-col overflow-hidden">
              {activeTab === 'GENERAL' && (
                <PrinterSettingsTab 
                  data={general} 
                  onSave={saveGeneral} 
                  loading={loading}
                />
              )}
              {activeTab === 'CATEGORY' && (
                <CategoryWisePrinterTab 
                  initialData={categories} 
                  onSave={saveCategoryMappings}
                  loading={loading}
                />
              )}
              {activeTab === 'PRODUCT' && (
                <ProductWisePrinterTab 
                  initialData={products} 
                  onSave={saveProductMappings}
                  loading={loading}
                />
              )}
              {activeTab === 'SECTION' && (
                <SectionWisePrinterTab 
                  initialData={sections} 
                  onSave={saveSectionMappings}
                  loading={loading}
                />
              )}
              {activeTab === 'ORDER_TYPE' && (
                <OrderTypeWisePrinterTab 
                  initialData={orderTypes} 
                  onSave={saveOrderTypeMappings}
                  loading={loading}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span>Terminal ID: POS-001</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>Printer Engine: v2.0</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600 font-black">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>Hardware Service Active</span>
        </div>
      </footer>
    </div>
  );
};

export default PosMorePage;
