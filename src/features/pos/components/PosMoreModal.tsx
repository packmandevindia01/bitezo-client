import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Settings, 
  Edit, 
  Printer, 
  LayoutGrid, 
  Clock, 
  Lock, 
  Truck, 
  Palette, 
  Paintbrush, 
  BarChart, 
  Shield, 
  PenTool as Tool, 
  DollarSign, 
  Archive, 
  Pipette, 
  PlusCircle,
  FileText,
  History,
  Users,
  Search,
  Layers3,
  SlidersHorizontal,
  ListTree,
  Shapes,
  Grid2x2,
} from 'lucide-react';


interface PosMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MORE_ITEMS = [
  { label: 'SECTION', icon: Layers3, color: 'bg-[#49293e]', path: '/dashboard/sections' },
  { label: 'MODIFIER TYPE', icon: SlidersHorizontal, color: 'bg-[#2d1a26]', path: '/dashboard/modifier-type' },
  { label: 'MODIFIER', icon: SlidersHorizontal, color: 'bg-[#49293e]', path: '/dashboard/modifiers' },
  { label: 'EXTRAS TYPE', icon: ListTree, color: 'bg-[#2d1a26]', path: '/dashboard/extras-type' },
  { label: 'EXTRAS MASTER', icon: Shapes, color: 'bg-[#2d1a26]', path: '/dashboard/extras-master' },
  { label: 'TABLE MASTER', icon: Grid2x2, color: 'bg-[#49293e]', path: '/dashboard/tables' },
  { label: 'CONFIGURATION', icon: Settings, color: 'bg-[#2d1a26]', path: '/dashboard/configuration' },
  { label: 'REPORT', icon: BarChart, color: 'bg-[#49293e]', path: '/dashboard/reports' },
  { label: 'PRIVILEGES', icon: Shield, color: 'bg-[#49293e]', path: '/dashboard/user-roles' },
  { label: 'PRINTER', icon: Printer, color: 'bg-[#2d1a26]', path: '#' },
  { label: 'CASH DRAWER', icon: Archive, color: 'bg-[#49293e]', path: '#' },
  { label: 'CHARGES', icon: DollarSign, color: 'bg-[#2d1a26]', path: '#' },
];


const ORDER_ITEMS = [
  { label: 'ORDER HISTORY', icon: History, color: 'bg-emerald-800' },
  { label: 'ACTIVE ORDERS', icon: FileText, color: 'bg-emerald-700' },
  { label: 'TABLE STATUS', icon: LayoutGrid, color: 'bg-emerald-600' },
  { label: 'CUSTOMER SEARCH', icon: Search, color: 'bg-emerald-500' },
];

const PosMoreModal: React.FC<PosMoreModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleItemClick = (path: string) => {
    if (path === '#') return;
    navigate(path);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">

        {/* Header */}
        <div className="bg-[#49293e] text-white px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center shrink-0">
          <h2 className="text-base sm:text-xl font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase truncate">Configuration & Orders</h2>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto flex-1">

          {/* Order Section (as requested) */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <span className="w-8 h-px bg-slate-200"></span>
              Order Management
              <span className="w-8 h-px bg-slate-200"></span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">

              {ORDER_ITEMS.map((item) => (
                <button
                  key={item.label}
                  className={`${item.color} hover:opacity-90 text-white p-4 sm:p-6 rounded-xl flex flex-col items-center justify-center gap-2 sm:gap-3 transition-all active:scale-95 shadow-lg border border-white/10`}
                >
                  <item.icon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                  <span className="text-[10px] sm:text-xs font-bold tracking-wider text-center uppercase">{item.label}</span>
                </button>

              ))}
            </div>
          </div>

          {/* Configuration Grid (from image) */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <span className="w-8 h-px bg-slate-200"></span>
              System Configuration
              <span className="w-8 h-px bg-slate-200"></span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-0.5 sm:gap-1">

              {MORE_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(item.path)}
                  className={`${item.color} hover:brightness-110 text-white h-24 sm:h-32 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all active:scale-[0.98] border border-white/5`}
                >
                  <item.icon className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={1.5} className="opacity-80" />
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.05em] sm:tracking-[0.1em] text-center px-1 sm:px-2">{item.label}</span>
                </button>
              ))}
            </div>


          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-200 shrink-0">
           <button 
             onClick={() => { navigate('/dashboard/users'); onClose(); }}
             className="flex items-center gap-2 text-[#49293e] font-bold text-[10px] sm:text-sm uppercase tracking-widest hover:underline order-2 sm:order-1"

           >
             <Users size={18} />
             Switch User
           </button>
           <button 
             onClick={() => { navigate('/dashboard'); onClose(); }}
             className="w-full sm:w-auto bg-[#49293e] text-white px-6 sm:px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#49293e]/20 order-1 sm:order-2"

           >
             Open Backoffice
           </button>

        </div>
      </div>
    </div>
  );
};

export default PosMoreModal;
