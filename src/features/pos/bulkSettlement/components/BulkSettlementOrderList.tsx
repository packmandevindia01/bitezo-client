import React from "react";
import { CheckSquare, Square, Tag, CreditCard, ShoppingBag, Clock, User, RefreshCw } from "lucide-react";
import type { UnsettledOrder } from "../types";
import { formatCurrency } from "../../../../utils/currency";
import { Loader } from "../../../../components/common";

interface BulkSettlementOrderListProps {
  orders: UnsettledOrder[];
  isOrdersLoading: boolean;
  selectedOrderIds: number[];
  selectedEntityName?: string;
  entityType?: "driver" | "provider";
  hasSearched?: boolean;
  onRefresh?: () => void;
  onToggleOrderSelection: (orderId: number) => void;
}

export const BulkSettlementOrderList: React.FC<BulkSettlementOrderListProps> = ({
  orders,
  isOrdersLoading,
  selectedOrderIds,
  selectedEntityName,
  entityType = "driver",
  hasSearched = false,
  onRefresh,
  onToggleOrderSelection,
}) => {
  if (isOrdersLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs flex items-center justify-center h-56">
        <Loader text={`Fetching unsettled orders${selectedEntityName ? ` for ${selectedEntityName}` : ""}...`} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center min-h-[16rem]">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-3 border border-slate-100">
          <ShoppingBag size={26} />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
          {hasSearched && selectedEntityName
            ? `No Pending Orders for ${selectedEntityName}`
            : "No Unsettled Orders"}
        </h3>
        <p className="text-[11.5px] text-slate-500 max-w-md mt-1 font-medium leading-relaxed">
          {hasSearched && selectedEntityName
            ? `All delivery orders assigned to ${selectedEntityName} have already been settled, or no orders are currently assigned to this ${entityType}.`
            : `Select a ${entityType === "driver" ? "driver" : "provider"} from the dropdown above to view unsettled orders.`}
        </p>

        {hasSearched && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#49293e] bg-[#49293e]/10 hover:bg-[#49293e]/15 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Re-check Orders</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order, index) => {
        const isSelected = selectedOrderIds.includes(order.orderId);

        return (
          <div
            key={order.orderId}
            onClick={() => onToggleOrderSelection(order.orderId)}
            className={`cursor-pointer bg-white rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all duration-150 hover:shadow-xs ${
              isSelected
                ? "border-[#49293e] ring-2 ring-[#49293e]/10 bg-[#49293e]/[0.02]"
                : "border-slate-200/80 hover:border-slate-300"
            }`}
          >
            {/* Left Column: Number Badge + Details */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#49293e]/10 text-[#49293e] flex items-center justify-center font-black text-xs shrink-0 border border-[#49293e]/20">
                {index + 1}
              </div>

              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                {/* Header Line */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-900 tracking-wide">
                    #{order.orderNo}
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60 inline-flex items-center gap-1">
                    <Tag size={10} />
                    {order.orderType}
                  </span>

                  {order.paymodeName && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60 inline-flex items-center gap-1">
                      <CreditCard size={10} />
                      {order.paymodeName}
                    </span>
                  )}

                  <span className="text-[11px] text-slate-400 font-semibold ml-auto sm:ml-0 inline-flex items-center gap-1">
                    <Clock size={11} />
                    {typeof order.orderDate === "string" && isNaN(Date.parse(order.orderDate))
                      ? order.orderDate
                      : new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {order.customerName && (
                    <span className="text-[11px] text-slate-500 font-medium truncate max-w-[160px] inline-flex items-center gap-1">
                      <User size={11} className="text-slate-400" />
                      {order.customerName}
                    </span>
                  )}
                </div>

                {/* Details snippet line */}
                {(order as any).details && (
                  <p className="text-[10.5px] text-slate-500 font-medium bg-slate-50/80 px-2 py-0.5 rounded border border-slate-200/60 truncate max-w-3xl leading-tight">
                    {(order as any).details}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Amount + Checkbox */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Amount</p>
                <p className="text-sm font-black text-[#49293e] leading-tight">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>

              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10.5px] font-extrabold uppercase tracking-wider transition-all ${
                isSelected
                  ? "border-[#49293e] bg-[#49293e] text-white shadow-2xs"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}>
                {isSelected ? (
                  <CheckSquare size={14} className="text-white" />
                ) : (
                  <Square size={14} className="text-slate-400" />
                )}
                <span>{isSelected ? "Checked" : "Check"}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
