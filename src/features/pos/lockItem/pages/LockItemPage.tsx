import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LockItemContent from '../components/LockItemContent';

const LockItemPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/pos', { state: { openMoreModal: true } })}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-[#49293e] tracking-widest uppercase">POS Product Locking</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Inventory Control</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full flex flex-col gap-4 overflow-hidden">
        {/* We place the Content directly here */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden">
           <LockItemContent />
        </div>
      </div>
    </div>
  );
};

export default LockItemPage;
