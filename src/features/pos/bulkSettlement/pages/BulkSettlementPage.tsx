import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { PageShell, Button } from "../../../../components/common";
import { useBulkSettlement } from "../hooks/useBulkSettlement";
import { BulkSettlementFilterBar } from "../components/BulkSettlementFilterBar";
import { BulkSettlementOrderList } from "../components/BulkSettlementOrderList";
import { formatCurrency } from "../../../../utils/currency";

export const BulkSettlementPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isPosMode = location.pathname.startsWith("/pos");

  const {
    entityType,
    entities,
    isEntitiesLoading,
    selectedEntityId,
    orders,
    isOrdersLoading,
    selectedOrderIds,
    isAllSelected,
    totalSelectedAmount,
    isSubmitting,
    handleEntityTypeChange,
    handleEntityChange,
    handleSearch,
    toggleOrderSelection,
    toggleSelectAll,
    handleSubmit,
  } = useBulkSettlement();

  return (
    <PageShell title="Bulk Settlement">
      <div className="max-w-7xl mx-auto h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden gap-3 pb-1">
        {/* POS Mode Top Return Header (Fixed) */}
        {isPosMode && (
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/pos", { state: { openMoreModal: true } })}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-[#49293e] cursor-pointer"
                title="Back to POS"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-base font-black text-[#49293e] uppercase tracking-tight leading-tight">
                  Bulk Settlement
                </h1>
                <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                  POS Operations & Cashier Settlement
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls (Fixed) */}
        <BulkSettlementFilterBar
          entityType={entityType}
          entities={entities}
          isEntitiesLoading={isEntitiesLoading}
          selectedEntityId={selectedEntityId}
          isAllSelected={isAllSelected}
          hasOrders={orders.length > 0}
          onEntityTypeChange={handleEntityTypeChange}
          onEntityChange={handleEntityChange}
          onSearch={handleSearch}
          onToggleSelectAll={toggleSelectAll}
        />

        {/* Orders List (SCROLLABLE AREA ONLY) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <BulkSettlementOrderList
            orders={orders}
            isOrdersLoading={isOrdersLoading}
            selectedOrderIds={selectedOrderIds}
            onToggleOrderSelection={toggleOrderSelection}
          />
        </div>

        {/* Fixed Bottom Settlement Bar */}
        {orders.length > 0 && (
          <div className="shrink-0 bg-white border border-slate-200/80 rounded-2xl px-5 py-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Selected Orders
                </p>
                <p className="text-base font-black text-slate-900 leading-tight">
                  {selectedOrderIds.length} <span className="text-xs font-semibold text-slate-400">/ {orders.length}</span>
                </p>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Settlement Amount
                </p>
                <p className="text-lg font-black text-[#49293e] leading-tight">
                  {formatCurrency(totalSelectedAmount)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={selectedOrderIds.length === 0 || isSubmitting}
              loading={isSubmitting}
              icon={<CheckCircle2 size={16} />}
              className="bg-[#49293e] hover:bg-[#382030] text-white px-6 py-2.5 text-xs font-black uppercase tracking-wider w-full sm:w-auto h-10 shadow-sm"
            >
              {isSubmitting ? "Submitting..." : `Settle Selected (${selectedOrderIds.length})`}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default BulkSettlementPage;
