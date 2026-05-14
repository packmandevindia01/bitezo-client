import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import PosTopNav from "../components/PosTopNav";
import PosCategoryRail from "../components/PosCategoryRail";
import PosGroupTabs from "../components/PosGroupTabs";
import { PosOrderPanel } from "../components/PosOrderPanel";
import PosProductGrid from "../components/PosProductGrid";
import { POS_CART_ACTIONS, POS_MORE_ACTIONS } from "../../constants";
import { usePosTerminal } from "../hooks/usePosTerminal";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePosShortcuts } from "../hooks/usePosShortcuts";
import ErrorBoundary from "../../../../components/common/ErrorBoundary";
import { formatCurrency } from "../../../../utils/formatters";
import type { PosProduct, PosAlternative } from "../../types";
import { ConfirmDialog, Modal } from "../../../../components/common";
import { menuApi } from "../../services/menuApi";
import { PosMoreModal } from "../components/PosMoreModal";
import { PosCustomerModal } from "../../customer/components/PosCustomerModal";
import { PosExtrasModifierModal } from "../components/PosExtrasModifierModal";
import { PosDeliveryModal } from "../../customer/components/PosDeliveryModal";
import { PosDriveThroughModal } from "../../customer/components/PosDriveThroughModal";
import { PosRecallModal } from "../components/PosRecallModal";
import { useCashierLog } from "../../cashier";
import { Tag, Receipt, XCircle, Percent, Banknote, ChevronRight, Check } from "lucide-react";
import { useToast } from "../../../../app/providers/useToast";

export const PosTerminalPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDriveThroughModalOpen, setIsDriveThroughModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const { status, isLoading } = useCashierLog();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const { showToast } = useToast();

  // Alternative selection state
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [alternatives, setAlternatives] = useState<PosAlternative[]>([]);
  const [fetchingAlts, setFetchingAlts] = useState(false);

  // Row selection state
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Discount Flow States
  const [discountStep, setDiscountStep] = useState<'none' | 'choice' | 'value'>('none');
  const [discountType, setDiscountType] = useState<'bill' | 'item'>('bill');
  const [discountMode, setDiscountMode] = useState<'percentage' | 'amount'>('percentage');
  const [discountInputValue, setDiscountInputValue] = useState("");

  // Price Flow States
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceInputValue, setPriceInputValue] = useState("");

  // Extras & Modifiers Flow States
  const [extrasModifierType, setExtrasModifierType] = useState<'none' | 'extras' | 'modifiers'>('none');

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
    subtotal,
    discount,
    tax,
    charges,
    total,
    totalExtras,
    baseSubtotal,
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
    removeItem,
    setBillDiscount,
    setItemDiscount,
    updateItemPrice,
    setItemCustomizations,
    orderLoading,
    submitOrder,
  } = usePosTerminal();

  // Handle Order Submission
  const handleOrder = async () => {
    if (!status) return;
    await submitOrder({
      dayId: status.dayId,
      shiftId: status.shiftId,
      userId: status.userId
    });
  };

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
        addProduct(productId);
      }
    } catch {
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
    addProductBySku(barcode);
  });

  // 2. Keyboard Hotkeys
  usePosShortcuts({
    onClearCart: clearCart,
    onHoldTicket: () => {},
    onCheckout: () => {}
  });

  const handleApplyDiscount = (value: string) => {
    const numValue = parseFloat(value);
    const finalValue = isNaN(numValue) ? 0 : numValue;

    if (discountType === 'bill') {
      setBillDiscount(finalValue, discountMode);
    } else if (selectedKey) {
      const [idPart, ...variantParts] = selectedKey.split('-');
      const productId = parseInt(idPart, 10);
      const variantName = variantParts.join('-') === 'main' ? undefined : variantParts.join('-');
      setItemDiscount(productId, variantName, finalValue, discountMode);
    }
    setDiscountStep('none');
  };

  const handleApplyPrice = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    if (selectedKey) {
      const [idPart, ...variantParts] = selectedKey.split('-');
      const productId = parseInt(idPart, 10);
      const variantName = variantParts.join('-') === 'main' ? undefined : variantParts.join('-');
      updateItemPrice(productId, variantName, numValue);
    }
    setIsPriceModalOpen(false);
  };

  const currentSelectedItem = useMemo(() => {
    if (!selectedKey) return null;
    return cartDetails.find((item) => {
      const key = `${item.productId}-${item.variantName || "main"}`;
      // Support both indexed and non-indexed keys for robustness
      return key === selectedKey || selectedKey.startsWith(`${key}-`);
    });
  }, [selectedKey, cartDetails]);

  const initialSelections = useMemo(() => {
    if (!currentSelectedItem) return [];
    return extrasModifierType === 'extras'
      ? (currentSelectedItem.extras || [])
      : (currentSelectedItem.modifiers || []);
  }, [currentSelectedItem, extrasModifierType]);

  const openPriceModal = () => {
    if (!selectedKey) return;
    const currentPrice = currentSelectedItem?.product.price || 0;
    setPriceInputValue(currentPrice.toString());
    setIsPriceModalOpen(true);
  };

  const openDiscountChoice = () => {
    if (itemCount === 0) return;
    setDiscountStep('choice');
  };

  const openDiscountInput = (type: 'bill' | 'item') => {
    setDiscountType(type);
    setDiscountInputValue("");
    setDiscountStep('value');
  };

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

  if (status && (status.isDayClosed || status.isShiftClosed)) {
    return <Navigate to="/cashier/out" replace />;
  }

  return (
    <div className="flex h-screen flex-col bg-[#fcf9fb] font-sans text-slate-900 overflow-hidden relative">
      <PosTopNav 
        onNewOrder={clearCart} 
        onMore={() => setIsMoreModalOpen(true)} 
        onCustomerMaster={() => setIsCustomerModalOpen(true)}
        onDelivery={() => setIsDeliveryModalOpen(true)}
        onDriveThrough={() => setIsDriveThroughModalOpen(true)}
        onRecall={() => setIsRecallModalOpen(true)}
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
              autoFocus
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
          <div className="flex-1 flex flex-col p-3 xl:p-4 overflow-hidden pb-4 xl:pb-4">
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

          {/* Action Button Bar */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1 p-1 bg-white border-t border-slate-100 shrink-0">
            <button className="h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">
              Close
            </button>
            <button
              onClick={clearCart}
              className="h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
            >
              Clear
            </button>
            <button className="h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">
              Waiter
            </button>
            <button 
              onClick={() => {
                if (!selectedKey) {
                  showToast("Please select an item in the cart first", "warning");
                  return;
                }
                setExtrasModifierType('extras');
              }}
              className="h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
            >
              Extras
            </button>
            <button 
              onClick={openDiscountChoice}
              className="h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={itemCount === 0}
            >
              Discount
            </button>
            <button 
              onClick={openPriceModal}
              className="h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedKey}
            >
              Price
            </button>
            <button className="h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">
              Note
            </button>
            <button className="h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">
              More
            </button>
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
              subtotal={subtotal}
              discount={discount}
              tax={tax}
              charges={charges}
              total={total}
              totalExtras={totalExtras}
              baseSubtotal={baseSubtotal}
              selectedKey={selectedKey}
              onSelectRow={setSelectedKey}
              onIncrement={incrementItem}
              onDecrement={decrementItem}
              onRemove={removeItem}
              onMod={() => setExtrasModifierType('modifiers')}
              onPrice={openPriceModal}
              onClearCart={clearCart}
              onOrder={handleOrder}
              orderLoading={orderLoading}
              onClose={() => setIsCartOpen(false)}
            />
          </ErrorBoundary>
        </div>
      </main>

      {/* Discount Choice Modal - Clean & Modern */}
      <Modal
        isOpen={discountStep === 'choice'}
        onClose={() => setDiscountStep('none')}
        noPadding
        showClose={false}
        className="max-w-[400px] border-none shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
          <h2 className="text-lg font-black uppercase tracking-[0.1em]">Discount Type</h2>
          <button onClick={() => setDiscountStep('none')} className="p-1 hover:bg-white/10 rounded-full">
            <XCircle size={24} />
          </button>
        </div>

        <div className="bg-white p-6 grid grid-cols-1 gap-4">
          <button
            onClick={() => openDiscountInput('bill')}
            className="flex items-center gap-4 p-5 bg-slate-50 border-2 border-slate-100 hover:border-[#ff9500] hover:bg-white transition-all rounded-2xl group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#49293e] text-white flex items-center justify-center shadow-lg">
              <Receipt size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Whole Order</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Global Bill Reduction</p>
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-[#ff9500]" />
          </button>

          <button
            onClick={() => {
              if (!selectedKey) {
                alert("Please select an item in the cart first");
                return;
              }
              openDiscountInput('item');
            }}
            className="flex items-center gap-4 p-5 bg-slate-50 border-2 border-slate-100 hover:border-[#ff9500] hover:bg-white transition-all rounded-2xl group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#ff9500] text-white flex items-center justify-center shadow-lg">
              <Tag size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Item Wise</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Specific Product Reduction</p>
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-[#ff9500]" />
          </button>
        </div>
      </Modal>

      {/* Modern POS Discount Keypad - Elegant & Standard */}
      <Modal
        isOpen={discountStep === 'value'}
        onClose={() => setDiscountStep('none')}
        noPadding
        showClose={false}
        className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
      >
        <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">{discountType === 'bill' ? 'BILL' : 'ITEM'} DISCOUNT</h2>
          <button onClick={() => setDiscountStep('none')} className="opacity-60 hover:opacity-100">
            <XCircle size={20} />
          </button>
        </div>

        <div className="bg-[#f8fafc] p-6 space-y-6">
          {/* Elegant Mode Toggle */}
          <div className="flex p-1 bg-slate-200/60 rounded-2xl">
            <button 
              onClick={() => { setDiscountMode('percentage'); setDiscountInputValue(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                discountMode === 'percentage' ? "bg-white text-[#49293e] shadow-md" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Percent size={16} strokeWidth={3} />
              Percentage
            </button>
            <button 
              onClick={() => { setDiscountMode('amount'); setDiscountInputValue(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                discountMode === 'amount' ? "bg-white text-[#49293e] shadow-md" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Banknote size={16} strokeWidth={3} />
              Amount
            </button>
          </div>

          {/* Premium Input Display */}
          <div className="bg-[#1e293b] p-6 rounded-3xl shadow-xl flex flex-col items-end relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#ff9500]" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Enter reduction</span>
            <div className="text-5xl font-black text-white font-mono flex items-baseline gap-2">
              {discountInputValue || "0"}
              <span className="text-xl text-[#ff9500]">
                {discountMode === 'percentage' ? "%" : formatCurrency(0).split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Clean Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "."].map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === "Clear") setDiscountInputValue("");
                  else if (btn === ".") {
                    if (!discountInputValue.includes(".")) setDiscountInputValue(prev => prev + ".");
                  } else {
                    if (discountInputValue.length < 8) setDiscountInputValue(prev => prev + btn);
                  }
                }}
                className={`
                  h-14 rounded-2xl text-xl font-black transition-all active:scale-90 shadow-sm border border-slate-100
                  ${btn === 'Clear' ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-slate-700 hover:bg-slate-50"}
                `}
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setDiscountStep('none')}
              className="h-14 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => handleApplyDiscount(discountInputValue)}
              className="h-14 bg-[#ff9500] text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-[0_4px_15px_rgba(255,149,0,0.3)] hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} strokeWidth={3} />
              Apply Discount
            </button>
          </div>
        </div>
      </Modal>

      {/* Modern POS Price Override Modal */}
      <Modal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        noPadding
        showClose={false}
        className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
      >
        <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Manual Price</h2>
          <button onClick={() => setIsPriceModalOpen(false)} className="opacity-60 hover:opacity-100">
            <XCircle size={20} />
          </button>
        </div>

        <div className="bg-[#f8fafc] p-6 space-y-6">
          <div className="bg-[#1e293b] p-6 rounded-3xl shadow-xl flex flex-col items-end relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#ff9500]" />
            <div className="w-full flex justify-between items-center mb-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Override Price</span>
              <span className="text-[9px] font-black text-[#ff9500] uppercase">Original: {formatCurrency(currentSelectedItem?.product.price || 0)}</span>
            </div>
            <div className="text-4xl font-black text-white font-mono">
              {priceInputValue || "0"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "."].map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === "Clear") setPriceInputValue("");
                  else if (btn === ".") {
                    if (!priceInputValue.includes(".")) setPriceInputValue(prev => prev + ".");
                  } else {
                    if (priceInputValue.length < 10) setPriceInputValue(prev => prev + btn);
                  }
                }}
                className={`
                  h-14 rounded-2xl text-xl font-black transition-all active:scale-90 shadow-sm border border-slate-100
                  ${btn === 'Clear' ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-slate-700 hover:bg-slate-50"}
                `}
              >
                {btn}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setIsPriceModalOpen(false)}
              className="h-14 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => handleApplyPrice(priceInputValue)}
              className="h-14 bg-[#ff9500] text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-[0_4px_15px_rgba(255,149,0,0.3)] hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} strokeWidth={3} />
              Update Price
            </button>
          </div>
        </div>
      </Modal>

      {/* Extras & Modifiers Modal */}
      <PosExtrasModifierModal
        isOpen={extrasModifierType !== 'none'}
        onClose={() => setExtrasModifierType('none')}
        type={extrasModifierType === 'extras' ? 'extras' : 'modifiers'}
        cartItems={cartDetails}
        selectedKey={selectedKey}
        onSelectRow={setSelectedKey}
        initialSelections={initialSelections}
        onDone={(selections) => {
          if (!selectedKey) return;
          const [idPart, ...variantParts] = selectedKey.split('-');
          const productId = parseInt(idPart, 10);
          const variantName = variantParts.join('-') === 'main' ? undefined : variantParts.join('-');

          if (extrasModifierType === 'extras') {
            setItemCustomizations(productId, variantName, selections, currentSelectedItem?.modifiers);
          } else {
            setItemCustomizations(productId, variantName, currentSelectedItem?.extras, selections);
          }
          setExtrasModifierType('none');
        }}
      />

      <PosMoreModal 
        isOpen={isMoreModalOpen} 
        onClose={() => setIsMoreModalOpen(false)} 
        onCashierOut={() => {
          setIsMoreModalOpen(false);
          setIsLogoutConfirmOpen(true);
        }}
        onCustomerMaster={() => setIsCustomerModalOpen(true)}
      />

      <PosCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />
      
      <PosDeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      <PosDriveThroughModal
        isOpen={isDriveThroughModalOpen}
        onClose={() => setIsDriveThroughModalOpen(false)}
      />

      <PosRecallModal
        isOpen={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
      />

      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => navigate("/cashier/out")}
        title="Confirm Exit"
        message="Are you sure you want to exit the terminal? Your current session is still active."
      />
    </div>
  );
};


