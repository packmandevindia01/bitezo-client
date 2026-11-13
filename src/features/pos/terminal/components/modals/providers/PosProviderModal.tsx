import { useState, useEffect } from "react";
import { Modal } from "../../../../../../components/common";
import { menuApi } from "../../../../services/menuApi";
import type { MenuProvider } from "../../../../types";

interface PosProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (provider: MenuProvider) => void;
  /** Shown only when the order already has a provider (removes it; the X just closes the window). */
  onClear?: () => void;
  /** The order's current provider, marked in the list. */
  activeProviderId?: number | null;
}

export const PosProviderModal = ({ isOpen, onClose, onSelect, onClear, activeProviderId }: PosProviderModalProps) => {
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

  const handleSelectProvider = async (provider: MenuProvider) => {
    const fullProvider = { ...provider };
    if (fullProvider.paymodeId === undefined || fullProvider.postAccountId === undefined) {
      try {
        const { fetchProviderById } = await import("../../../../../general/provider/services/providerService");
        const detail = await fetchProviderById(provider.providerId);
        if (detail?.provider) {
          fullProvider.paymodeId = detail.provider.paymodeId;
          fullProvider.postAccountId = detail.provider.postAccountId;
          fullProvider.paymode = (detail.provider as any).paymode;
        }
      } catch (err) {
        console.error("Failed to fetch detailed provider info:", err);
      }
    }
    onSelect(fullProvider);
    onClose();
  };

  const activeProvider = providers.find((p) => p.providerId === activeProviderId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Provider"
      className="w-full max-w-[95vw] md:max-w-4xl"
      footer={
        onClear ? (
          // Only when the order has a provider: takes it off the order. Closing without a change is the X.
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-400 truncate">
              {activeProvider ? <>Current: <span className="font-black text-[#49293e] uppercase">{activeProvider.providerName}</span></> : null}
            </span>
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="inline-flex shrink-0 items-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 font-bold uppercase tracking-widest text-[11px] hover:bg-red-100 hover:border-red-300 transition-colors"
            >
              {/* user-minus: removes the provider from the order (not the same as closing) */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 11h-6" />
              </svg>
              Clear Provider
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col">
        <p className="mb-4 text-xs font-semibold text-slate-400">
          Choose the delivery partner for this order.
        </p>

        {/* Room for two rows of four (8 providers) without scrolling; more scroll inside the window. */}
        <div className="min-h-[256px]">
          {loading ? (
            <div className="flex h-[256px] justify-center items-center">
              <div className="w-8 h-8 border-4 border-[#ff9500]/20 border-t-[#ff9500] rounded-full animate-spin"></div>
            </div>
          ) : providers.length === 0 ? (
            <div className="flex h-[256px] flex-col items-center justify-center text-slate-400">
              <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm font-bold uppercase tracking-widest">No Providers Available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {providers.map((provider) => {
                const isCurrent = provider.providerId === activeProviderId;
                return (
                  <button
                    key={provider.providerId}
                    type="button"
                    onClick={() => handleSelectProvider(provider)}
                    title={provider.providerName}
                    className={`
                      group relative flex flex-col items-center justify-center gap-2.5 p-3
                      rounded-2xl border bg-white text-center shadow-sm transition-all duration-200
                      hover:border-[#ff9500] hover:shadow-lg hover:shadow-[#ff9500]/10 hover:-translate-y-0.5
                      active:translate-y-0 active:shadow-sm
                      h-[120px] w-full outline-none focus-visible:ring-2 focus-visible:ring-[#ff9500]/40
                      ${isCurrent ? "border-[#ff9500] ring-2 ring-[#ff9500]/25" : "border-slate-200"}
                    `}
                  >
                    {isCurrent && (
                      <span className="absolute top-2 right-2 rounded-full bg-[#ff9500] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                        Current
                      </span>
                    )}
                    <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 bg-slate-50 ring-1 ring-slate-100 group-hover:ring-[#ff9500]/40 transition-all duration-200">
                      {provider.imageUrl ? (
                        <img
                          src={provider.imageUrl}
                          alt={provider.providerName}
                          // contain, not cover: wide logos (e.g. Zomato) were cut off at the sides.
                          className="w-full h-full object-contain"
                          onError={() => {
                            // Broken or missing file: show the initials instead of an empty box.
                            setProviders((prev) =>
                              prev.map((p) => (p.providerId === provider.providerId ? { ...p, imageUrl: null } : p))
                            );
                          }}
                        />
                      ) : (
                        <span className="text-lg font-black text-slate-400 uppercase select-none group-hover:text-[#ff9500] transition-colors">
                          {provider.providerName.substring(0, 2)}
                        </span>
                      )}
                    </div>
                    <h3 className="w-full text-[12px] font-black text-[#49293e] tracking-wider uppercase truncate px-1">
                      {provider.providerName}
                    </h3>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
