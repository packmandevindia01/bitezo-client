import { useState, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import PosTopNav from "../components/PosTopNav";
import PosCategoryRail from "../components/PosCategoryRail";
import PosGroupTabs from "../components/PosGroupTabs";
import PosOrderPanel from "../components/PosOrderPanel";
import PosProductGrid from "../components/PosProductGrid";
import { POS_CART_ACTIONS, POS_MORE_ACTIONS } from "../../constants";
import { usePosTerminal } from "../hooks/usePosTerminal";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePosShortcuts } from "../hooks/usePosShortcuts";
import ErrorBoundary from "../../../../components/common/ErrorBoundary";
import { useToast } from "../../../../app/providers/useToast";
import { formatCurrency } from "../../../../utils/formatters";
import type { PosProduct, PosAlternative } from "../../types";
import { ConfirmDialog } from "../../../../components/common";
import { menuApi } from "../../services/menuApi";
import PosMoreModal from "../components/PosMoreModal";
import { useCashierLog } from "../../cashier";


const PosTerminalPage = () => {
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const { status, isLoading } = useCashierLog();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Alternative selection state
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [alternatives, setAlternatives] = useState<PosAlternative[]>([]);
  const [fetchingAlts, setFetchingAlts] = useState(false);

  useEffect(() => {
    const state = location.state as { openMoreModal?: boolean };
    if (state?.openMoreModal) {
      setIsMoreModalOpen(true);
      // Clear state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);


  const {
    groups,
    categories,
    subCategories,
    activeGroupId,
    activeCategoryId,
    activeSubCategoryId,
    cartDetails,
    itemCount,
    search,
    total,
    visibleProducts,
    loading,
    setGroup,
    setCategory,
    setSubCategory,
    setSearch,
    addProduct,
    addProductBySku,
    clearCart,
    decrementItem,
    incrementItem,
  } = usePosTerminal();

  // Handle product click - check for alternatives
  const handleProductSelect = async (productId: number) => {
    const product = visibleProducts.find(p => p.id === productId);
    if (!product) return;

    setFetchingAlts(true);
    try {
      const alts = await menuApi.getAlternatives(productId);
      
      if (alts && alts.length > 0) {
        setAlternatives(alts);
        setSelectedProduct(product);
      } else {
        // No alternatives, add directly
        addProduct(productId);
      }
    } catch (err) {
      // Fallback: add directly if API fails
      addProduct(productId);
    } finally {
      setFetchingAlts(false);
    }
  };

  const handleAltSelect = (variant: PosAlternative) => {
    if (selectedProduct) {
      addProduct(selectedProduct.id, variant.altName, variant.price);
    }
  };

  const handleGridBack = () => {
    if (alternatives.length > 0) {
      setAlternatives([]);
      setSelectedProduct(null);
    } else {
      setSubCategory(null);
    }
  };

  // 1. Hardware Barcode Scanner Integration
  useBarcodeScanner((barcode) => {
    const success = addProductBySku(barcode);
    if (success) showToast(barcode, "success");
    else showToast("Not Found", "error");
  });

  // 2. Keyboard Hotkeys
  usePosShortcuts({
    onClearCart: clearCart,
    onHoldTicket: () => showToast("Held", "success"),
    onCheckout: () => {
      if (itemCount > 0) showToast("Processing...", "success");
      else showToast("Empty", "error");
    }
  });

  // Loading state
  if (isLoading && !status) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fcf9fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#49293e] uppercase tracking-widest">Checking Cashier Status...</p>
        </div>
      </div>
    );
  }

  // MANDATORY FLOW: If day or shift is closed, go to dashboard
  if (status && (status.isDayClosed || status.isShiftClosed)) {
    return <Navigate to="/cashier/out" replace />;
  }

  return (
    <div className="flex h-screen flex-col bg-[#fcf9fb] font-sans text-slate-900 overflow-hidden relative">
      <PosTopNav 
        onNewOrder={clearCart} 
        onMore={() => setIsMoreModalOpen(true)} 
        onCashierOut={() => {
          if (status && (!status.isDayClosed || !status.isShiftClosed)) {
            setIsLogoutConfirmOpen(true);
          } else {
            navigate("/cashier/out");
          }
        }}
        status={status}
      />
      <div className="flex flex-col xl:flex-row xl:items-center bg-white border-b border-slate-100 overflow-hidden shrink-0 px-4 xl:px-6">
        <div className="shrink-0">
          <PosGroupTabs 
            groups={groups} 
            activeGroupId={activeGroupId} 
            onSelect={setGroup} 
          />
        </div>
        
        <div className="flex-1 flex items-center justify-end py-2 xl:py-0">
          <div className="relative w-full max-w-md group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-[#49293e] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-10 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/10 transition-all outline-none"
            />
          </div>
          
          <div className="hidden xl:flex items-center gap-2 ml-4 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</span>
            <span className="text-sm font-bold text-[#49293e]">{visibleProducts.length}</span>
          </div>
        </div>
      </div>

      {(loading || fetchingAlts) && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[#49293e] uppercase tracking-widest">
              {fetchingAlts ? "Fetching Variations..." : "Updating Menu..."}
            </p>
          </div>
        </div>
      )}

      <main className="flex flex-col flex-1 overflow-hidden xl:grid xl:grid-cols-[220px_minmax(0,1fr)_460px]">
        {/* Left Column: Categories */}
        <PosCategoryRail
          categories={categories}
          activeCategoryId={activeCategoryId ? activeCategoryId.toString() : ""}
          onSelect={(id) => setCategory(parseInt(id, 10))}
        />

        {/* Middle Column: Grid */}
        <div className="flex flex-col flex-1 overflow-hidden bg-[#fcf9fb]">
          <div className="flex-1 flex flex-col p-3 xl:p-4 overflow-hidden pb-24 xl:pb-4">
            <ErrorBoundary name="Product Grid">
              <PosProductGrid
                products={visibleProducts}
                subCategories={subCategories}
                alternatives={alternatives}
                activeSubCategoryId={activeSubCategoryId}
                onSelectSubCategory={setSubCategory}
                onBack={handleGridBack}
                onAdd={handleProductSelect}
                onSelectAlt={handleAltSelect}
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
      <PosMoreModal 
        isOpen={isMoreModalOpen} 
        onClose={() => setIsMoreModalOpen(false)} 
        onCashierOut={() => navigate("/cashier/out")}
      />

      {/* Mobile Overlay */}
      {isCartOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Logout Reminder Dialog */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          navigate("/cashier/out");
        }}
        title="Active Session"
        message="Your shift is still open. Go to close session?"
        confirmLabel="Go to Close"
        cancelLabel="Stay"
        onCancel={() => setIsLogoutConfirmOpen(false)}
        confirmVariant="secondary"
      />

    </div>
  );
};

export default PosTerminalPage;
