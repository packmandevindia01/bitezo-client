import { ShoppingBag, TimerReset, UserRound, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "../../../components/common";
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
  const {
    categories,
    orderTypes,
    tenderOptions,
    activeCategory,
    activeCategoryId,
    cartDetails,
    discount,
    itemCount,
    search,
    selectedOrderType,
    selectedTender,
    subtotal,
    tax,
    total,
    visibleProducts,
    setActiveCategoryId,
    setSearch,
    setSelectedOrderType,
    setSelectedTender,
    addProduct,
    addProductBySku,
    clearCart,
    decrementItem,
    incrementItem,
  } = usePosTerminal();

  const navigate = useNavigate();
  const { showToast } = useToast();

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
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-[#49293e] via-[#5b324c] to-[#7a5168] px-5 py-6 text-white shadow-lg sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              POS Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-wide sm:text-3xl">
              Billing Terminal
            </h1>
          </div>

          <div className="flex flex-col xl:flex-row items-end xl:items-center gap-4">
            <button
              onClick={() => navigate("/cashier/out")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500/90 hover:bg-rose-500 px-5 py-3.5 text-sm font-bold tracking-wide text-white transition-all active:scale-95 border border-rose-400 shadow-md h-full"
            >
              <Power size={18} />
              Cashier Out
            </button>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-white/65">Ticket Load</p>
                <p className="mt-2 text-2xl font-semibold">{itemCount}</p>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-white/65">Section</p>
                <p className="mt-2 text-lg font-semibold">{activeCategory?.name ?? "Counter"}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-white/65">Operator</p>
                <p className="mt-2 text-lg font-semibold">Counter Admin</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-2 sm:grid-cols-2 xl:flex">
            {orderTypes.map((orderType) => (
              <PosActionButton
                key={orderType.id}
                active={orderType.id === selectedOrderType}
                onClick={() => setSelectedOrderType(orderType.id)}
                className="min-w-[110px]"
              >
                {orderType.label}
              </PosActionButton>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <PosActionButton accent="brand" className="gap-2">
              <ShoppingBag size={16} />
              New Order
            </PosActionButton>
            <PosActionButton className="gap-2">
              <TimerReset size={16} />
              Hold Ticket
            </PosActionButton>
            <PosActionButton className="gap-2">
              <UserRound size={16} />
              Assign Guest
            </PosActionButton>
          </div>
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, SKU, or fast-moving item..."
          className="max-w-full"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_390px]">
        <PosCategoryRail
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelect={setActiveCategoryId}
        />

        <ErrorBoundary name="Product Grid">
          <PosProductGrid
            products={visibleProducts}
            activeCategory={activeCategory}
            search={search}
            onAdd={addProduct}
          />
        </ErrorBoundary>

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
          />
        </ErrorBoundary>
      </section>
    </div>
  );
};

export default PosTerminalPage;
