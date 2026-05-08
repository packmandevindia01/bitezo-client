import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft,
} from 'lucide-react';
import { Button } from '../../../../components/common';
import { PrinterSettingsTab } from '../components/PrinterSettingsTab';

export const PosMorePage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/pos', { state: { openMoreModal: true } });
  };

  return (
    <div className="min-h-screen bg-[#fcf9fb] flex flex-col">
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Hardware & Terminal Printing Configuration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="primary"
            onClick={handleBack}
            className="px-8 shadow-md"
          >
            Save Settings
          </Button>
          <Button 
            variant="secondary"
            onClick={handleBack}
            className="px-6"
          >
            Back to Terminal
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6 md:p-10">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 md:p-12">
              <PrinterSettingsTab onBack={handleBack} />
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
