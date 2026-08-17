import React from "react";
import { PageShell, Button } from "../../../../components/common";
import { useBulkSettlement } from "../hooks/useBulkSettlement";
import { BulkSettlementFilterBar } from "../components/BulkSettlementFilterBar";
import { BulkSettlementOrderList } from "../components/BulkSettlementOrderList";
import { formatCurrency } from "../../../../utils/currency";
import { CheckCircle2 } from "lucide-react";

export const BulkSettlementPage: React.FC = () => {
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
      <div className="max-w-7xl mx-auto pb-12">

        {/* Filter Controls */}
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

        {/* Unsettled Orders Cards List */}
        <BulkSettlementOrderList
          orders={orders}
          isOrdersLoading={isOrdersLoading}
          selectedOrderIds={selectedOrderIds}
          onToggleOrderSelection={toggleOrderSelection}
        />

        {/* Bottom Fixed Action Bar */}
        {orders.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-6 py-4 shadow-xl">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Selected Orders Count */}
              <div className="text-sm font-semibold text-gray-700">
                Selected:{" "}
                <span className="font-extrabold text-[#49293e]">
                  {selectedOrderIds.length} of {orders.length} orders
                </span>
              </div>

              {/* Total Amount & Submit Button */}
              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-gray-500 font-bold block">
                    TOTAL :
                  </span>
                  <span className="text-2xl font-extrabold text-[#49293e] tracking-tight">
                    {formatCurrency(totalSelectedAmount)}
                  </span>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedOrderIds.length === 0}
                  loading={isSubmitting}
                  className="bg-[#49293e] hover:bg-[#382030] text-white px-8 py-3 rounded-xl font-extrabold text-base shadow-lg shadow-[#49293e]/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  SUBMIT
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default BulkSettlementPage;
