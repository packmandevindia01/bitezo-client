import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PosActionButton from "../components/PosActionButton";
import PosCategoryRail from "../components/PosCategoryRail";
import PosOrderPanel from "../components/PosOrderPanel";
import PosProductGrid from "../components/PosProductGrid";
import { POS_CART_ACTIONS, POS_MORE_ACTIONS } from "../constants";
import { usePosTerminal } from "../hooks/usePosTerminal";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePosShortcuts } from "../hooks/usePosShortcuts";
import ErrorBoundary from "../../../components/common/ErrorBoundary";
import { useToast } from "../../../app/providers/useToast";


const PosTerminalPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const {
    categories,
    tenderOptions,
    activeCategory,
    activeCategoryId,
    cartDetails,
    discount,
    itemCount,
    search,
    selectedTender,
    subtotal,
    tax,
    total,
    visibleProducts,
    setActiveCategoryId,
    setSearch,
    setSelectedTender,
    addProduct,
    addProductBySku,
    clearCart,
    decrementItem,
    incrementItem,
  } = usePosTerminal();

  // 1. Hardware Barcode Scanner Integration
  useBarcodeScanner((barcode) => {
    const success = addProductBySku(barcode);
    if (success) {
      showToast(`Scanned: ${barcode}`, "success");
    } else {
      showToast(`SKU not found: ${barcode}`, "error");
    }
  });

  // 2. Keyboard Hotkeys for Power Users
  usePosShortcuts({
    onClearCart: clearCart,
    onHoldTicket: () => showToast("Ticket put on hold", "success"),
    onCheckout: () => {
      if (itemCount > 0) {
        showToast(`Processing ${selectedTender} payment for ₹${total}`, "success");
      } else {
        showToast("Cart is empty", "error");
      }
    }
  });

  return (
    <div className="flex h-screen flex-col bg-slate-100 font-sans text-slate-900 overflow-hidden relative">
      {/* 1. PREMIUM TOP NAVBAR */}
      <nav className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2 shadow-sm shrink-0">
        <div className="flex items-center gap-4 xl:gap-6">
          <div className="flex items-center justify-center p-1 border-2 border-slate-100 rounded-lg bg-white overflow-hidden w-12 h-12 xl:w-20 xl:h-20 shadow-sm">
            <img src="/bitezo-logo-hq.png" alt="Bitezo" className="w-10 h-10 xl:w-16 xl:h-16 object-contain" />
          </div>
          
          <PosActionButton accent="orange" size="lg" className="rounded-xl px-4 h-10 xl:h-12 shadow-md flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
            <span className="hidden sm:inline">New Order</span>
          </PosActionButton>

          <div className="hidden md:flex gap-1 ml-2">
              {["Dine In", "Take Out", "Drive Thru", "Delivery", "Provider"].map((type) => (
                <PosActionButton
                  key={type}
                  accent={type === "Dine In" ? "orange" : "gray"}
                  className="h-10 xl:h-12 px-3 rounded-xl text-[10px] min-w-max shadow-sm"
                >
                  {type}
                </PosActionButton>
              ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PosActionButton accent="orange" noPadding className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md" title="Split">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M12 12 21 3" /><path d="m12 12-9 9" /></svg>
          </PosActionButton>
          <PosActionButton accent="orange" noPadding className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md" title="Combine">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 3-9 9" /><path d="m3 21 9-9" /><path d="M16 12h5V7" /><path d="M8 12H3v5" /></svg>
          </PosActionButton>
          <PosActionButton accent="orange" noPadding className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md" title="Recall">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </PosActionButton>
          
          <div className="w-px h-8 xl:h-10 bg-slate-200 mx-1" />

          <PosActionButton
            accent="red"
            noPadding
            className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md"
            onClick={() => navigate("/cashier/out")}
            title="Logout"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
          </PosActionButton>
        </div>
      </nav>

      {/* 2. MAIN LAYOUT */}
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
             <div className="flex items-center gap-4 shrink-0">
               <div className="space-y-0.5">
                 <h2 className="text-2xl xl:text-3xl font-bold text-[#49293e] tracking-tight whitespace-nowrap">{activeCategory?.name || "All Items"}</h2>
                 <p className="hidden sm:block text-[10px] xl:text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">{visibleProducts.length} Items Available</p>
               </div>
               <div className="hidden xl:block w-px h-10 bg-slate-100" />
             </div>

             <div className="relative w-full group max-w-2xl">
               <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-[#49293e] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
               </div>
               <input
                 type="text"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search products..."
                 className="
                   w-full bg-slate-50 border border-slate-200 rounded-xl py-2 xl:py-3 px-12 shadow-sm
                   text-sm xl:text-base font-bold text-slate-700 placeholder:text-slate-400
                   focus:bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/10 transition-all outline-none
                 "
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

        {/* Right Column: Order Panel (Drawer on mobile) */}
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
              itemCount={itemCount}
              subtotal={subtotal}
              discount={discount}
              tax={tax}
              total={total}
              tenderOptions={tenderOptions}
              selectedTender={selectedTender}
              onSelectTender={setSelectedTender}
              onIncrement={incrementItem}
              onDecrement={decrementItem}
              onClearCart={clearCart}
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
          <span className="text-xl font-bold">₹{(total || 0).toFixed(2)}</span>
        </button>
      </div>

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
