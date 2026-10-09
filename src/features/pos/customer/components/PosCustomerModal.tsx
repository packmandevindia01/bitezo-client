import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, Save, Users, UserPlus, UserX, Search, Check, RotateCw, ArrowLeft, X } from "lucide-react";
import { Modal, FormInput, Button, ConfirmDialog, SelectInput } from "../../../../components/common";
import { useCustomer, useCustomerList } from "../hooks/useCustomer";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";
import { FormProvider } from "react-hook-form";
import { getDecimalPart } from "../../../../utils/currency";
import { handleFocusNextInput } from "../../../../utils/keyboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchBranches, fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { fetchGlobalBranches } from "../../../inventory/shared/store/masterDataSlice";
import { setSelectedCustomer, clearSelectedCustomer } from "../../terminal/store/posSlice";
import { useToast } from "../../../../app/providers/useToast";
import type { Customer } from "../types/customer";

interface PosCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export const PosCustomerModal = ({ isOpen, onClose, onSelectCustomer }: PosCustomerModalProps) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const currentSelectedCustomerId = useAppSelector((state) => state.pos.selectedCustomerId);
  const currentSelectedCustomerName = useAppSelector((state) => state.pos.selectedCustomerName);

  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(() => 
    typeof window !== "undefined" ? (window.innerWidth < 1200 || window.innerHeight < 820) : false
  );

  const firstInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const masterBranches = useAppSelector((state) => state.masterData.branches);

  // Customer List Query from /api/v1/menu/customer-list
  const {
    data: customerList = [],
    isLoading: isLoadingCustomers,
    isFetching: isFetchingCustomers,
    refetch: refetchCustomers,
  } = useCustomerList();

  const handleSaveCustomerSuccess = (savedCustomer?: Customer) => {
    if (savedCustomer && savedCustomer.id) {
      dispatch(
        setSelectedCustomer({
          id: savedCustomer.id,
          name: savedCustomer.customerName,
          mobileNo: savedCustomer.mobileNo,
        })
      );
      if (onSelectCustomer) {
        onSelectCustomer(savedCustomer);
      }
      showToast(`Customer "${savedCustomer.customerName}" saved and selected`, "success");
    }
    onClose();
  };

  const { methods, loading, saveCustomer, deleteCustomer, resetForm } = useCustomer(handleSaveCustomerSuccess);

  const { data: branchesData = [], refetch: refetchBranches } = useQuery({
    queryKey: ["customerBranches"],
    queryFn: async () => {
      try {
        const [branchMasterRes, directBranchesRes] = await Promise.allSettled([
          fetchBranches(),
          fetchBranchNames(true),
        ]);
        const branchMap = new Map<string, string>();
        if (branchMasterRes.status === "fulfilled" && Array.isArray(branchMasterRes.value)) {
          branchMasterRes.value.forEach((b: any) => {
            const id = String(b.id ?? b.branchId ?? "");
            const name = String(b.branchName ?? b.name ?? "");
            if (id && id !== "0" && name) branchMap.set(id, name);
          });
        }
        if (directBranchesRes.status === "fulfilled" && Array.isArray(directBranchesRes.value)) {
          directBranchesRes.value.forEach((b: any) => {
            const id = String(b.id ?? b.branchId ?? "");
            const name = String(b.branchName ?? b.name ?? "");
            if (id && id !== "0" && name) branchMap.set(id, name);
          });
        }
        return Array.from(branchMap.entries()).map(([value, label]) => ({ label, value }));
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: isOpen && activeTab === "form",
  });

  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      queryClient.removeQueries({ queryKey: ["customerBranches"] });
      queryClient.removeQueries({ queryKey: ["branchNames"] });
      queryClient.removeQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
      void refetchBranches();
      void dispatch(fetchGlobalBranches());
    });
    return () => unsubscribe();
  }, [queryClient, refetchBranches, dispatch]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(masterBranches)) {
      masterBranches.forEach((b) => {
        const id = String(b.id);
        if (id && id !== "0" && b.name) map.set(id, b.name);
      });
    }
    if (Array.isArray(branchesData)) {
      branchesData.forEach((b) => {
        if (b.value && b.value !== "0" && b.label) map.set(b.value, b.label);
      });
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [masterBranches, branchesData]);

  const { register, formState: { errors }, watch } = methods;
  const customerId = watch("id");

  const handleFormSubmit = methods.handleSubmit((data) => {
    setPendingData(data);
    setShowSaveConfirm(true);
  });

  const handleConfirmSave = () => {
    if (pendingData) {
      saveCustomer(pendingData);
    }
    setShowSaveConfirm(false);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab("list");
      setSearchTerm("");
      resetForm();
      if (window.innerWidth > 1024) {
        setTimeout(() => searchInputRef.current?.focus(), 120);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsCompactViewport(window.innerWidth < 1200 || window.innerHeight < 820);
    };
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  const handleInputFocus = (e?: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement> | React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isKeyboardEnabled) {
      setShowKeyboard(true);
      const target = (e?.currentTarget || e?.target) as HTMLElement | null;
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      }
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customerList;
    const q = searchTerm.toLowerCase().trim();
    return customerList.filter((c) =>
      (c.customerName && c.customerName.toLowerCase().includes(q)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
      (c.mobileNo && c.mobileNo.includes(q)) ||
      (c.telNo && c.telNo.includes(q)) ||
      String(c.id).includes(q)
    );
  }, [customerList, searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    dispatch(
      setSelectedCustomer({
        id: customer.id || 0,
        name: customer.customerName,
        mobileNo: customer.mobileNo,
      })
    );
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
    showToast(`Customer "${customer.customerName}" assigned to order`, "success");
    onClose();
  };

  const handleResetToCashCustomer = () => {
    dispatch(clearSelectedCustomer());
    showToast("Customer unselected (Reverted to Cash Customer)", "info");
    onClose();
  };

  const handleNewCustomer = () => {
    resetForm();
    if (searchTerm.trim()) {
      const isNum = /^[0-9+\-\s()]+$/.test(searchTerm.trim());
      if (isNum) {
        methods.setValue("mobileNo", searchTerm.trim());
      } else {
        methods.setValue("customerName", searchTerm.trim());
      }
    }
    setActiveTab("form");
    if (window.innerWidth > 1024) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  };

  const step = Math.pow(10, -getDecimalPart()).toString();
  const { ref: codeFormRef, ...codeRegister } = register("customerCode");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noScroll
      noPadding
      className="!max-w-[95vw] w-[95vw] !max-h-[95vh] h-[95vh] !rounded-2xl !m-0 bg-[#f8f9fa] flex flex-col shadow-2xl overflow-hidden z-[100]"
    >
      <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-50">
        
        {/* Header - Premium Maroon */}
        <div className="flex items-center justify-between bg-[#49293e] px-4 py-3 text-white shrink-0 border-b border-white/10 relative flex-wrap gap-3 shadow-md z-20">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Users size={18} />
            </div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase whitespace-nowrap hidden sm:inline">
              Customer Master
            </h2>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-black/25 p-1 rounded-xl ml-2 sm:ml-4">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "list"
                    ? "bg-white text-[#49293e] shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Users size={14} />
                <span>Select Customer</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === "list" ? "bg-[#49293e]/10 text-[#49293e]" : "bg-white/20 text-white"}`}>
                  {customerList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNewCustomer}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "form"
                    ? "bg-white text-[#49293e] shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <UserPlus size={14} />
                <span>New Customer</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <button 
              type="button"
              onClick={() => {
                const newVal = !isKeyboardEnabled;
                setIsKeyboardEnabled(newVal);
                setShowKeyboard(newVal);
                if (newVal) {
                  if (activeTab === "list") {
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  } else {
                    setTimeout(() => firstInputRef.current?.focus(), 50);
                  }
                }
              }}
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-all border ${
                isKeyboardEnabled 
                  ? "text-[#49293e] bg-white border-white hover:bg-slate-100 shadow-sm" 
                  : "text-white/80 bg-white/10 border-white/20 hover:bg-white/20"
              }`}
              title={isKeyboardEnabled ? "Switch to physical keyboard" : "Enable touch keyboard"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9Z"/>
              </svg>
              {isKeyboardEnabled ? "Keyboard: ON" : "Keyboard: OFF"}
            </button>

            {activeTab === "form" && (
              <>
                <div className="w-px h-6 bg-white/20 mx-1 hidden sm:block"></div>

                <Button 
                  variant="secondary" 
                  onClick={(e) => {
                    e.preventDefault();
                    resetForm();
                    setTimeout(() => firstInputRef.current?.focus(), 50);
                  }} 
                  disabled={loading} 
                  isAction
                  icon={<Plus size={16} />}
                  tabIndex={13}
                >
                  New
                </Button>
                <Button 
                  variant="danger" 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDeleteConfirm(true);
                  }} 
                  disabled={loading || !customerId} 
                  isAction
                  icon={<Trash2 size={16} />}
                  tabIndex={14}
                >
                  Delete
                </Button>
                <Button 
                  type="button"
                  onClick={handleFormSubmit}
                  loading={loading} 
                  isAction
                  icon={<Save size={16} />}
                  tabIndex={15}
                  className="!bg-green-600 hover:!bg-green-700 !border-green-600"
                >
                  Save
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
              tabIndex={16}
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* View 1: Customer Selection & Listing */}
        {activeTab === "list" && (
          <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6 overflow-hidden">
            {/* Filter & Status Top Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/70 mb-4 shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Active Selection Indicator */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current Order:
                </span>
                {currentSelectedCustomerId && currentSelectedCustomerId !== 1 ? (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>{currentSelectedCustomerName || `Customer #${currentSelectedCustomerId}`}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetToCashCustomer}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:text-rose-800 transition-all shadow-xs"
                      title="Unselect customer and revert to default Cash Customer"
                    >
                      <UserX size={13} />
                      <span>Unselect Customer</span>
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Cash Customer (Default)
                  </span>
                )}
              </div>

              {/* Search & Actions */}
              <div className="flex items-center gap-2 flex-1 max-w-xl md:justify-end">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={handleInputFocus}
                    onClick={handleInputFocus}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredCustomers.length === 1) {
                        e.preventDefault();
                        handleSelectCustomer(filteredCustomers[0]);
                      }
                    }}
                    placeholder="Search by customer name, mobile number, or code..."
                    className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#49293e] focus:ring-2 focus:ring-[#49293e]/10 outline-none transition-all placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => refetchCustomers()}
                  disabled={isFetchingCustomers}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shrink-0 disabled:opacity-50"
                  title="Refresh customer list"
                >
                  <RotateCw size={16} className={isFetchingCustomers ? "animate-spin text-[#49293e]" : ""} />
                </button>

                <Button
                  variant="primary"
                  onClick={handleNewCustomer}
                  icon={<Plus size={16} />}
                  className="shrink-0"
                >
                  Add Customer
                </Button>
              </div>
            </div>

            {/* Customers Table / Grid */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 w-16">
                        #
                      </th>
                      <th className="py-3 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 w-28">
                        Code
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-600">
                        Customer Name
                      </th>
                      <th className="py-3 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 w-36">
                        Mobile No
                      </th>
                      <th className="py-3 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 w-28">
                        Status
                      </th>
                      <th className="py-3 px-4 text-center text-[11px] font-black uppercase tracking-wider text-slate-600 w-44">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingCustomers ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <div className="inline-flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-2 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin"></div>
                            <span className="text-xs font-semibold text-slate-500">Loading customers...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <div className="max-w-sm mx-auto flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                              <Users size={24} />
                            </div>
                            <p className="text-sm font-bold text-slate-700">
                              {searchTerm ? `No customers matching "${searchTerm}"` : "No customers registered"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {searchTerm
                                ? "Check your search terms or create a new customer record."
                                : "Add your first customer to get started."}
                            </p>
                            <Button
                              variant="primary"
                              onClick={handleNewCustomer}
                              icon={<UserPlus size={16} />}
                              className="mt-2"
                            >
                              Create New Customer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((customer, index) => {
                        const isCurrentActive = Number(customer.id) === Number(currentSelectedCustomerId);

                        return (
                          <tr
                            key={customer.id ?? index}
                            onDoubleClick={() => {
                              if (isCurrentActive) {
                                handleResetToCashCustomer();
                              } else {
                                handleSelectCustomer(customer);
                              }
                            }}
                            className={`transition-colors group ${
                              isCurrentActive
                                ? "bg-emerald-50/70 hover:bg-emerald-50"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            <td className="py-3 px-3 text-center text-xs font-mono font-semibold text-slate-400">
                              {index + 1}
                            </td>
                            <td className="py-3 px-3 text-center text-xs font-mono font-bold text-slate-700">
                              {customer.customerCode || "—"}
                            </td>
                            <td className="py-3 px-4 text-left">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">
                                  {customer.customerName || "Unnamed Customer"}
                                </span>
                                {customer.arabicName && (
                                  <span className="text-[11px] text-slate-400 font-arabic">
                                    {customer.arabicName}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center text-xs font-mono text-slate-600">
                              {customer.mobileNo || "—"}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  customer.isActive
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {customer.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center">
                                {isCurrentActive ? (
                                  <button
                                    type="button"
                                    onClick={handleResetToCashCustomer}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95"
                                    title="Unselect customer and revert to default Cash Customer"
                                  >
                                    <UserX size={14} /> Unselect
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectCustomer(customer)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#49293e] hover:bg-[#381e2f] text-white shadow-sm transition-all active:scale-95"
                                  >
                                    <Check size={14} /> Select
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{filteredCustomers.length}</strong> of{" "}
                  <strong className="text-slate-700">{customerList.length}</strong> customers
                </span>
                <span className="text-[11px] text-slate-400">
                  Tip: Double-click any row to select or unselect customer
                </span>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Customer Add / Edit Form */}
        {activeTab === "form" && (
          <FormProvider {...methods}>
            <form 
              onSubmit={handleFormSubmit} 
              className="flex flex-col flex-1 h-full min-h-0 bg-slate-50"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const target = e.target as HTMLElement;
                  
                  if (target.tagName !== "BUTTON") {
                    // Allow Shift+Enter for new lines in textarea
                    if (target.tagName === "TEXTAREA" && e.shiftKey) {
                      return;
                    }
                    e.preventDefault();
                    handleFocusNextInput(target);
                  }
                }
              }}
            >
              {/* Top Sub-Bar with Back Action */}
              <div className="bg-white border-b border-slate-200/80 px-6 py-2.5 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#49293e] transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Customer Directory</span>
                </button>

                <span className="text-xs font-bold text-slate-400">
                  {customerId ? `Editing Customer #${customerId}` : "New Customer Registration"}
                </span>
              </div>

              {/* Form Section */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
                <div className={`max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 ${showKeyboard ? "pb-28" : "pb-4"}`}>
                  
                  {/* Primary Details Card */}
                  <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Primary Details</h3>
                    </div>
                    
                    <div className="space-y-4">
                    <FormInput
                      label="Customer Code"
                      required
                      {...codeRegister}
                      ref={(el) => {
                        codeFormRef(el);
                        (firstInputRef as any).current = el;
                      }}
                      error={errors.customerCode?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      placeholder="Enter Code"
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={1}
                    />
                    <FormInput
                      label="Customer Name"
                      required
                      {...register("customerName")}
                      error={errors.customerName?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={2}
                    />
                    <FormInput
                      label="Arabic Name"
                      {...register("arabicName")}
                      error={errors.arabicName?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputClassName="text-right font-arabic"
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={3}
                    />
                    <FormInput
                      label="Mobile No"
                      required
                      {...register("mobileNo", {
                        onChange: (e) => {
                          e.target.value = e.target.value.replace(/[^0-9+\-\s()]/g, "");
                        }
                      })}
                      error={errors.mobileNo?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={4}
                    />
                    <FormInput
                      label="Tel No"
                      {...register("telNo")}
                      error={errors.telNo?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={5}
                    />
                    <FormInput
                      label="Email"
                      {...register("email")}
                      error={errors.email?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={6}
                    />
                  </div>
                  </div>
                  
                  {/* Address & Billing Card */}
                  <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
                      <div className="w-6 h-6 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Address & Billing</h3>
                    </div>
                    
                    <div className="space-y-4">
                    <div className="flex flex-col gap-1 w-full mb-1 relative">
                      <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5 min-w-0">
                        Address
                        {errors.address && (
                          <span className="text-[10px] text-red-500 font-bold ml-2 normal-case truncate shrink">
                            ({errors.address.message})
                          </span>
                        )}
                      </label>
                      <textarea
                        {...register("address")}
                        onFocus={handleInputFocus}
                        onClick={handleInputFocus}
                        className={`w-full px-4 py-2 text-sm rounded-md border outline-none transition resize-y min-h-[80px] ${
                          errors.address ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"
                        } focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20`}
                        placeholder="Enter full address"
                        inputMode={isKeyboardEnabled ? "none" : undefined}
                        tabIndex={7}
                      />
                    </div>

                    <FormInput
                      label="Area"
                      {...register("area")}
                      error={errors.area?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={8}
                    />
                    <FormInput
                      label="Identity No"
                      {...register("identityNo")}
                      error={errors.identityNo?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={9}
                    />
                    <FormInput
                      label="TRN No"
                      {...register("trnNo")}
                      error={errors.trnNo?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={10}
                    />
                    <SelectInput
                      label="Branch"
                      placeholder="Select Branch..."
                      {...register("branch")}
                      error={errors.branch?.message}
                      tabIndex={11}
                      onFocus={(e) => {
                        try {
                          e.target.showPicker();
                        } catch {
                          // Fallback for older browsers
                        }
                      }}
                      onChange={(e) => {
                        register("branch").onChange(e);
                        setTimeout(() => {
                          handleFocusNextInput(e.target as HTMLElement);
                        }, 50);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          setTimeout(() => {
                            handleFocusNextInput(e.target as HTMLElement);
                          }, 50);
                        }
                      }}
                      options={branchOptions.length > 0 ? branchOptions : [
                        { label: "Main Branch", value: "main" }
                      ]}
                    />
                    <FormInput
                      label="Opening Balance"
                      type="number"
                      step={step}
                      {...register("openingBalance")}
                      error={errors.openingBalance?.message}
                      onFocus={handleInputFocus}
                      onClick={handleInputFocus}
                      inputClassName="text-right"
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      tabIndex={12}
                    />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </FormProvider>
        )}

        {/* Keyboard Section */}
        {showKeyboard && (
          <div className={`shrink-0 w-full bg-[#f8f9fa] mt-auto ${isCompactViewport ? "px-1 pb-1" : "px-3 lg:px-4 pb-2"} border-t border-slate-100`}>
            <div className={`w-full ${isCompactViewport ? "max-w-[900px]" : "max-w-[1000px]"} mx-auto bg-gradient-to-b from-[#faf8f9] to-[#f3edf0] border border-slate-300 shadow-[0_15px_40px_rgba(73,41,62,0.08)] rounded-2xl ${isCompactViewport ? "p-1" : "p-2 lg:p-2.5"}`}>
              <TouchKeyboard
                onClose={() => setShowKeyboard(false)}
                size={isCompactViewport ? "md" : "lg"}
                embedded={true}
              />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (customerId) deleteCustomer(Number(customerId));
          setShowDeleteConfirm(false);
          setActiveTab("list");
        }}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
      />

      <ConfirmDialog
        isOpen={showSaveConfirm}
        onCancel={() => setShowSaveConfirm(false)}
        onConfirm={handleConfirmSave}
        title="Save Customer"
        message="Are you sure you want to save this customer?"
        confirmLabel="Save"
        confirmVariant="primary"
      />
    </Modal>
  );
};
