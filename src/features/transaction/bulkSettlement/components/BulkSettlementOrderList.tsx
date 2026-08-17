import React from "react";
import { CheckSquare, Square, Calendar, Tag, CreditCard, ShoppingBag } from "lucide-react";
import type { UnsettledOrder } from "../types";
import { formatCurrency } from "../../../../utils/currency";
import { Loader } from "../../../../components/common";

interface BulkSettlementOrderListProps {
  orders: UnsettledOrder[];
  isOrdersLoading: boolean;
  selectedOrderIds: number[];
  onToggleOrderSelection: (orderId: number) => void;
}

export const BulkSettlementOrderList: React.FC<BulkSettlementOrderListProps> = ({
  orders,
  isOrdersLoading,
  selectedOrderIds,
  onToggleOrderSelection,
}) => {
  if (isOrdersLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm flex items-center justify-center">
        <Loader text="Loading unsettled orders..." />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-3 border border-gray-100">
          <ShoppingBag size={28} />
        </div>
        <h3 className="text-lg font-bold text-gray-700">No Unsettled Orders</h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1">
          Select a driver or provider and click SEARCH to view unsettled orders pending settlement.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 mb-24">
      {orders.map((order, index) => {
        const isSelected = selectedOrderIds.includes(order.orderId);

        return (
          <div
            key={order.orderId}
            onClick={() => onToggleOrderSelection(order.orderId)}
            className={`cursor-pointer bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md ${
              isSelected
                ? "border-[#49293e] ring-2 ring-[#49293e]/10 bg-[#49293e]/[0.02]"
                : "border-gray-200/80 hover:border-gray-300"
            }`}
          >
            {/* Left Order Info */}
            <div className="flex items-start sm:items-center gap-4 flex-1">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#49293e] flex items-center justify-center font-extrabold text-sm border border-purple-100 shrink-0">
                {index + 1}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-base font-bold text-gray-900 tracking-wide">
                    {order.orderNo}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 flex items-center gap-1 border border-gray-200">
                    <Tag size={11} />
                    {order.orderType}
                  </span>
                  {order.paymodeName && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 flex items-center gap-1 border border-blue-100">
                      <CreditCard size={11} />
                      {order.paymodeName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(order.orderDate).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {order.customerName && (
                    <span className="truncate max-w-xs font-medium text-gray-600">
                      Customer: {order.customerName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Amount + Checkbox */}
            <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500">Amount</p>
                <p className="text-lg font-extrabold text-[#49293e]">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${isSelected ? 'border-[#49293e] bg-[#49293e]/10 text-[#49293e]' : 'border-gray-200 text-gray-500'}">
                {isSelected ? (
                  <CheckSquare size={20} className="text-[#49293e]" />
                ) : (
                  <Square size={20} className="text-gray-400" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isSelected ? "Checked" : "Check Box"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
