import { useState, useEffect } from "react";
import { Modal } from "../../../../components/common";
import { menuApi } from "../../services/menuApi";
import type { MenuProvider } from "../../types";

interface PosProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (provider: MenuProvider) => void;
  onClear?: () => void;
}

export const PosProviderModal = ({ isOpen, onClose, onSelect, onClear }: PosProviderModalProps) => {
  const [providers, setProviders] = useState<MenuProvider[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await menuApi.getProviders();
      setProviders(data || []);
    } catch (error) {
      console.error("Failed to fetch providers", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Provider"
      className="w-full max-w-[95vw] md:max-w-5xl"
    >
      <div className="p-4 md:p-6 min-h-[450px]">
        {loading ? (
          <div className="flex justify-center items-center h-[200px]">
            <div className="w-8 h-8 border-4 border-[#ff9500]/20 border-t-[#ff9500] rounded-full animate-spin"></div>
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
            <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm font-bold uppercase tracking-widest">No Providers Available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            {providers.map((provider) => (
              <button
                key={provider.providerId}
                onClick={() => {
                  onSelect(provider);
                  onClose();
                }}
                className="
                  group relative flex flex-col items-center justify-center p-3
                  rounded-xl border border-slate-200 bg-white text-center overflow-hidden
                  transition-all duration-300 hover:shadow-xl hover:shadow-[#49293e]/5 hover:-translate-y-1
                  h-[115px] xl:h-[125px] w-full outline-none focus:ring-2 focus:ring-[#49293e]/20
                "
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center mb-2.5 shrink-0 bg-slate-50 border border-slate-100 group-hover:border-[#ff9500] transition-colors duration-300">
                  {provider.imageUrl ? (
                    <img 
                      src={provider.imageUrl} 
                      alt={provider.providerName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-base font-black text-slate-400 uppercase select-none group-hover:text-[#ff9500] transition-colors">
                      {provider.providerName.substring(0, 2)}
                    </span>
                  )}
                </div>
                <h3 className="text-[11px] font-black text-[#49293e] tracking-widest uppercase line-clamp-2 break-words">
                  {provider.providerName}
                </h3>
              </button>
            ))}
          </div>
        )}

        {onClear && (
          <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                onClear();
                onClose();
              }}
              className="px-8 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors uppercase tracking-widest text-[10px]"
            >
              Clear Provider
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
