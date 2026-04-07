import { ShoppingBag, TimerReset, UserRound } from "lucide-react";
import { SearchBar } from "../../../components/common";
import PosActionButton from "../components/PosActionButton";
import PosCategoryRail from "../components/PosCategoryRail";
import PosOrderPanel from "../components/PosOrderPanel";
import PosProductGrid from "../components/PosProductGrid";
import { POS_CART_ACTIONS, POS_MORE_ACTIONS } from "../constants";
import { usePosTerminal } from "../hooks/usePosTerminal";

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
    clearCart,
    decrementItem,
    incrementItem,
  } = usePosTerminal();

  return (
    <div className="space-y-6">
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

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-white/65">Ticket Load</p>
              <p className="mt-2 text-2xl font-semibold">{itemCount}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-white/65">Section</p>
              <p className="mt-2 text-lg font-semibold">{activeCategory?.name ?? "Counter"}</p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-white/65">Operator</p>
              <p className="mt-2 text-lg font-semibold">Counter Admin</p>
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

        <PosProductGrid
          products={visibleProducts}
          activeCategory={activeCategory}
          search={search}
          onAdd={addProduct}
        />

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
      </section>
    </div>
  );
};

export default PosTerminalPage;
