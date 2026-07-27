import React from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '../../../../components/common';
import LockItemContent from './LockItemContent';

export interface LockItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string;
  onSuccess?: () => void;
}

const LockItemModal: React.FC<LockItemModalProps> = ({ isOpen, onClose, initialProductId, onSuccess }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      className="!w-[95vw] lg:!w-[90vw] !max-w-[1200px] !rounded-3xl shadow-2xl overflow-hidden bg-[#f4f5f7] border-0"
    >
      <div className="flex flex-col h-[85vh] lg:h-[80vh] max-h-[800px] bg-[#f4f5f7]">
        {/* Custom Sleek Header */}
        <div className="relative bg-slate-900 px-6 py-5 shrink-0 flex items-center justify-between overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-purple-500/10 pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-40 h-40 bg-red-500/20 rounded-full blur-[50px] pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(248,113,113,0.3)] backdrop-blur-md">
              <Lock size={22} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-[0.1em] uppercase">Access Control</h2>
              <p className="text-xs font-semibold text-slate-400 tracking-wider">Manage Product Availability</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="relative z-10 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/5 hover:border-white/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Main Content Area */}
        {isOpen && (
          <LockItemContent 
            initialProductId={initialProductId} 
            onSuccess={onSuccess} 
            onClose={onClose} 
          />
        )}
      </div>
    </Modal>
  );
};

export default LockItemModal;
