import React, { useState, useEffect, useMemo } from "react";
import { UserCheck, RotateCw, Check, UserX, User, Sparkles } from "lucide-react";
import { Modal, Button, SearchBar, Loader } from "../../../../../../components/common";
import { useAppDispatch, useAppSelector } from "../../../../../../app/hooks";
import { setWaiter } from "../../../store/posSlice";
import { menuApi } from "../../../../services/menuApi";
import { useToast } from "../../../../../../app/providers/useToast";
import type { PosWaiter } from "../../../../types";

interface PosWaiterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// In-memory module cache to eliminate loading flicker on repeated opens
let cachedWaitersList: PosWaiter[] | null = null;

export const PosWaiterModal: React.FC<PosWaiterModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const currentWaiterId = useAppSelector((state) => state.pos.waiterId);
  const currentWaiterName = useAppSelector((state) => state.pos.waiterName);

  const [waiters, setWaiters] = useState<PosWaiter[]>(() => cachedWaitersList || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedWaitersList || cachedWaitersList.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchWaiters = async (isManualRefresh = false) => {
    if (isManualRefresh || !cachedWaitersList || cachedWaitersList.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await menuApi.getWaitersList();
      const validWaiters = Array.isArray(data) ? data : [];
      cachedWaitersList = validWaiters;
      setWaiters(validWaiters);
    } catch (err: any) {
      console.error("[PosWaiterModal] Failed to fetch waiters:", err);
      setError(err?.message || "Failed to load waiters");
      if (isManualRefresh) {
        showToast("Failed to refresh waiters list", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      fetchWaiters(false);
    }
  }, [isOpen]);

  const filteredWaiters = useMemo(() => {
    if (!search.trim()) return waiters;
    const q = search.toLowerCase().trim();
    return waiters.filter(
      (w) =>
        (w.empName && w.empName.toLowerCase().includes(q)) ||
        String(w.empId).includes(q)
    );
  }, [waiters, search]);

  const handleSelectWaiter = (waiter: PosWaiter) => {
    dispatch(setWaiter({ waiterId: waiter.empId, waiterName: waiter.empName }));
    try {
      localStorage.setItem("selectedWaiterId", String(waiter.empId));
      localStorage.setItem("selectedWaiterName", waiter.empName);
    } catch {}
    showToast(`Waiter "${waiter.empName}" assigned`, "success");
    onClose();
  };

  const handleClearWaiter = () => {
    dispatch(setWaiter({ waiterId: null, waiterName: null }));
    try {
      localStorage.removeItem("selectedWaiterId");
      localStorage.removeItem("selectedWaiterName");
    } catch {}
    showToast("Waiter selection cleared", "info");
    onClose();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredWaiters.length === 1) {
      e.preventDefault();
      handleSelectWaiter(filteredWaiters[0]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="!max-w-2xl w-full"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f48120]/15 flex items-center justify-center text-[#f48120] shrink-0 shadow-xs">
            <UserCheck size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-slate-900">Select Waiter / Employee</span>
              {!loading && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f48120]/10 text-[#f48120] border border-[#f48120]/20">
                  {filteredWaiters.length} {filteredWaiters.length === 1 ? "Employee" : "Employees"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Select an employee to assign them to this order for KOT & bill receipts
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <div>
            {(currentWaiterId || currentWaiterName) && (
              <Button
                variant="secondary"
                onClick={handleClearWaiter}
                className="!text-red-600 hover:!bg-red-50 !border-red-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <UserX size={16} />
                <span>Unassign Waiter</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} className="text-xs sm:text-sm cursor-pointer">
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-[380px] sm:h-[420px]">
        {/* Top Controls: Search Bar & Refresh Button */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="flex-1" onKeyDown={handleSearchKeyDown}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search waiter by name..."
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={() => fetchWaiters(true)}
            disabled={loading}
            title="Refresh employees list from server"
            className="h-10.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs text-xs font-bold"
          >
            <RotateCw size={15} className={loading ? "animate-spin text-[#f48120]" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Current Selection Banner */}
        {currentWaiterName && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#f48120] shrink-0" />
              <span className="text-xs text-orange-950 font-medium">
                Active Order Waiter: <strong className="font-extrabold text-orange-900">{currentWaiterName}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearWaiter}
              className="text-[11px] font-bold text-orange-700 hover:text-red-600 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {/* Waiter Cards Scroll Container with Stable Dimensions */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {loading && (!waiters || waiters.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader text="Loading waiters..." />
            </div>
          ) : error && (!waiters || waiters.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <p className="text-sm text-red-600 font-semibold">{error}</p>
              <Button variant="secondary" onClick={() => fetchWaiters(true)}>
                Retry
              </Button>
            </div>
          ) : filteredWaiters.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
              <User size={40} className="mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600">
                {search ? `No employee matching "${search}"` : "No waiters configured in system"}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-xs text-[#f48120] font-bold hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start pb-2">
              {filteredWaiters.map((waiter) => {
                const isSelected =
                  currentWaiterId === waiter.empId ||
                  currentWaiterName?.toLowerCase() === waiter.empName?.toLowerCase();
                const initial = waiter.empName ? waiter.empName.charAt(0).toUpperCase() : "W";

                return (
                  <button
                    key={waiter.empId}
                    type="button"
                    onClick={() => handleSelectWaiter(waiter)}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-150 flex items-center gap-3.5 text-left group cursor-pointer active:scale-[0.98] select-none ${
                      isSelected
                        ? "border-[#f48120] bg-orange-50/70 text-slate-900 shadow-md ring-2 ring-[#f48120]/25"
                        : "border-slate-200/90 bg-white hover:border-[#49293e]/40 hover:bg-slate-50/90 text-slate-800 shadow-xs hover:shadow-sm"
                    }`}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#f48120] text-white flex items-center justify-center shadow-xs">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}

                    {/* Avatar Circle */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-base shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#f48120] text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 group-hover:bg-[#49293e] group-hover:text-white"
                      }`}
                    >
                      {initial}
                    </div>

                    {/* Employee Info */}
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-bold text-sm sm:text-base text-slate-900 truncate"
                        title={waiter.empName}
                      >
                        {waiter.empName}
                      </div>
                      {isSelected && (
                        <div className="mt-0.5">
                          <span className="text-[10px] font-extrabold uppercase text-[#f48120] bg-orange-100/70 px-1.5 py-0.2 rounded">
                            Assigned
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
