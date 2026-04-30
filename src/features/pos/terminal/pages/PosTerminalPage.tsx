import { useState } from "react";
import PosTopNav from "../components/PosTopNav";
import PosCategoryRail from "../components/PosCategoryRail";
import PosOrderPanel from "../components/PosOrderPanel";
import PosProductGrid from "../components/PosProductGrid";
import { POS_CART_ACTIONS, POS_MORE_ACTIONS } from "../../constants";
import { usePosTerminal } from "../hooks/usePosTerminal";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePosShortcuts } from "../hooks/usePosShortcuts";
import ErrorBoundary from "../../../../components/common/ErrorBoundary";
import { useToast } from "../../../../app/providers/useToast";
import { formatCurrency } from "../../../../utils/formatters";
import PosMoreModal from "../components/PosMoreModal";


const PosTerminalPage = () => {
  const { showToast } = useToast();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);


  const {
    categories,
    activeCategory,
    activeCategoryId,
    cartDetails,
    itemCount,
    search,
    total,
    visibleProducts,
    setActiveCategoryId,
    setSearch,
    addProduct,
    addProductBySku,
    clearCart,
    decrementItem,
    incrementItem,
  } = usePosTerminal();

  // 1. Hardware Barcode Scanner Integration
  useBarcodeScanner((barcode) => {
    const success = addProductBySku(barcode);
    if (success) showToast(`Scanned: ${barcode}`, "success");
    else showToast(`SKU not found: ${barcode}`, "error");
  });

  // 2. Keyboard Hotkeys
  usePosShortcuts({
    onClearCart: clearCart,
    onHoldTicket: () => showToast("Ticket put on hold", "success"),
    onCheckout: () => {
      if (itemCount > 0) showToast(`Processing payment for ${formatCurrency(total)}`, "success");
      else showToast("Cart is empty", "error");
    }
  });

  return (
    <div className="flex h-screen flex-col bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
      <PosTopNav onNewOrder={clearCart} onMore={() => setIsMoreModalOpen(true)} />


      <main className="flex flex-col flex-1 overflow-hidden xl:grid xl:grid-cols-[280px_minmax(0,1fr)_460px]">
        {/* Left Column: Categories */}
        <PosCategoryRail
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelect={setActiveCategoryId}
        />

        {/* Middle Column: Search + Grid */}
        <div className="flex flex-col flex-1 overflow-hidden bg-[#fcf9fb]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between p-4 xl:px-8 xl:py-4 bg-white border-b border-slate-100 gap-4 xl:gap-10">
            <div className="flex items-center gap-3 xl:gap-4 shrink-0">
              <div className="space-y-0.5">
                <h2 className="text-xl md:text-2xl xl:text-3xl font-bold text-[#49293e] tracking-tight whitespace-nowrap">
                  {activeCategory?.name || "All Items"}
                </h2>
                <p className="hidden sm:block text-[9px] xl:text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">
                  {visibleProducts.length} Items Available
                </p>
              </div>
              <div className="hidden xl:block w-px h-10 bg-slate-100" />
            </div>


            <div className="relative w-full group max-w-2xl">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-[#49293e] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 xl:py-3 px-12 shadow-sm text-sm xl:text-base font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/10 transition-all outline-none"
              />
            </div>

            <div className="hidden xl:flex flex-col items-end bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-100 min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Total</span>
              <span className="text-xl font-bold text-[#49293e] tracking-tighter mt-0.5">{visibleProducts.length}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4 xl:p-8 overflow-hidden pb-24 xl:pb-8">
            <ErrorBoundary name="Product Grid">
              <PosProductGrid
                products={visibleProducts}
                activeCategory={activeCategory}
                search={search}
                onAdd={addProduct}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Right Column: Order Panel */}
        <div className={`
          fixed inset-y-0 right-0 z-50 w-[85%] max-w-[460px] transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
          xl:static xl:w-auto xl:translate-x-0 xl:shadow-none xl:z-auto
          ${isCartOpen ? "translate-x-0" : "translate-x-full"}
        `}>
          <ErrorBoundary name="Order Panel">
            <PosOrderPanel
              cartActions={POS_CART_ACTIONS}
              extraActions={POS_MORE_ACTIONS}
              cartDetails={cartDetails}
              total={total}
              onIncrement={incrementItem}
              onDecrement={decrementItem}
              onClose={() => setIsCartOpen(false)}
            />
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile Footer Toggle */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-lg z-40">
        <button
          onClick={() => setIsCartOpen(true)}
          className="w-full h-14 bg-[#49293e] rounded-2xl flex items-center justify-between px-6 text-white shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold">
              {itemCount} ITEMS
            </div>
            <span className="text-sm font-bold uppercase tracking-widest">View Order</span>
          </div>
          <span className="text-xl font-bold">{formatCurrency(total || 0)}</span>
        </button>
      </div>

      {/* More Modal */}
      <PosMoreModal isOpen={isMoreModalOpen} onClose={() => setIsMoreModalOpen(false)} />

      {/* Mobile Overlay */}
      {isCartOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsCartOpen(false)}
        />
      )}

    </div>
  );
};

export default PosTerminalPage;
