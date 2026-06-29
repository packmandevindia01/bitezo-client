import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Modal, Button, FormInput } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";
import { getDecimalPart } from "../../../../utils/currency";
import { useQuery } from "@tanstack/react-query";

export interface InvoiceRecord {
  id: number;
  vchType: string;
  invoiceDate?: string;
  vchNo: string;
  invAmnt: number;
  paid: number;
  balance: number;
  amount: number;
}

interface MultiInvoiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedInvoices: InvoiceRecord[]) => void;
  partyName: string; // Supplier or Customer name
  fetchInvoices?: (fromDate?: string, toDate?: string) => Promise<any[]>;
  type: "PAYMENT" | "RECEIPT";
}

export const MultiInvoiceSelectionModal = ({
  isOpen,
  onClose,
  onSelect,
  partyName,
  fetchInvoices,
}: MultiInvoiceSelectionModalProps) => {
  const { formatAmount } = useCurrency();
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);
  const [ignoreDates, setIgnoreDates] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  const { data: pendingInvoices, isLoading } = useQuery({
    queryKey: ["modalPendingInvoices", partyName, ignoreDates ? null : fromDate, ignoreDates ? null : toDate],
    queryFn: () => fetchInvoices ? fetchInvoices(ignoreDates ? undefined : fromDate, ignoreDates ? undefined : toDate) : Promise.resolve([]),
    enabled: isOpen && !!fetchInvoices,
  });

  useEffect(() => {
    if (isOpen && pendingInvoices) {
      setInvoices(pendingInvoices.map((p: any) => ({
        id: p.invoiceId,
        vchType: p.voucherType,
        invoiceDate: p.invoiceDate ? p.invoiceDate.split("T")[0] : "",
        vchNo: p.invoiceNo,
        invAmnt: Number(p.invoiceAmount) || 0,
        paid: (Number(p.invoiceAmount) || 0) - (Number(p.balance) || 0),
        balance: Number(p.balance) || 0,
        amount: 0
      })));
    }
  }, [isOpen, pendingInvoices]);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setCustomAmounts({});
      setSearchTerm("");
    }
  }, [isOpen]);

  const filteredInvoices = invoices.filter(
    (inv) =>
      (inv.vchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
       inv.vchType.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (ignoreDates || (!fromDate || !inv.invoiceDate || inv.invoiceDate >= fromDate) && (!toDate || !inv.invoiceDate || inv.invoiceDate <= toDate))
  );

  const toggleSelect = (vchNo: string, balance: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(vchNo)) {
      newSet.delete(vchNo);
      setCustomAmounts(prev => {
        const next = { ...prev };
        delete next[vchNo];
        return next;
      });
    } else {
      newSet.add(vchNo);
      setCustomAmounts(prev => ({ ...prev, [vchNo]: balance }));
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedIds(new Set());
      setCustomAmounts({});
    } else {
      const newIds = new Set(filteredInvoices.map((inv) => inv.vchNo));
      setSelectedIds(newIds);
      const newAmounts: Record<string, number> = {};
      filteredInvoices.forEach(inv => {
        newAmounts[inv.vchNo] = inv.balance;
      });
      setCustomAmounts(newAmounts);
    }
  };

  const handleAmountChange = (vchNo: string, val: string) => {
    const num = Number(val);
    setCustomAmounts(prev => ({ ...prev, [vchNo]: num }));
    
    // Auto check/uncheck based on amount
    if (num !== 0) {
      setSelectedIds(prev => new Set(prev).add(vchNo));
    } else {
      const newSet = new Set(selectedIds);
      newSet.delete(vchNo);
      setSelectedIds(newSet);
    }
  };

  const handleSubmit = () => {
    const selected = invoices
      .filter((inv) => selectedIds.has(inv.vchNo))
      .map(inv => ({
        ...inv,
        amount: customAmounts[inv.vchNo] || 0
      }));
    onSelect(selected);
    onClose();
  };

  const totalSelectedAmount = Array.from(selectedIds).reduce((sum, id) => {
    return sum + (Number(customAmounts[id]) || 0);
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Select Invoices for ${partyName || "Party"}`}
      size="2xl"
    >
      <div className="flex flex-col gap-4">
        {/* Header Filters */}
        <div className="flex flex-wrap items-end gap-3 justify-between bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-32">
              <FormInput 
                id="inv-from-date" 
                label="From Date" 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={ignoreDates}
              />
            </div>
            <div className="w-32">
              <FormInput 
                id="inv-to-date" 
                label="To Date" 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={ignoreDates}
              />
            </div>
            <div className="flex items-center pb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  checked={ignoreDates}
                  onChange={(e) => setIgnoreDates(e.target.checked)}
                />
                Disable Date Range
              </label>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="w-48">
              <FormInput
                id="invoice-search"
                placeholder="Search Vch No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="h-[38px] mb-[2px]" icon={<Search size={16} />} onClick={() => {}}>
              Search
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="max-h-[400px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-2 w-12 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Select</span>
                  </th>
                  {["Vch Type", "Invoice Date", "Vch No", "Total", "Paid", "Balance", "Amount"].map((col) => (
                    <th
                      key={col}
                      className={`sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 ${col === "Total" || col === "Paid" || col === "Balance" || col === "Amount" ? "text-right" : ""}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="h-32 px-4 text-center text-sm text-gray-500">
                      Loading invoices...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="h-32 px-4 text-center text-sm text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, index) => (
                    <tr key={`${inv.vchNo}-${index}`} className="hover:bg-[#49293e]/5">
                      <td className="px-4 py-3">
                        <div className="flex h-5 items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(inv.vchNo)}
                            onChange={() => toggleSelect(inv.vchNo, inv.balance)}
                            className="h-4 w-4 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{inv.vchType}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.invoiceDate || "-"}</td>
                      <td className="px-4 py-3">{inv.vchNo}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatAmount(inv.invAmnt)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatAmount(inv.paid)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formatAmount(inv.balance)}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          placeholder={formatAmount(0)}
                          step={Math.pow(10, -getDecimalPart()).toString()}
                          value={
                            selectedIds.has(inv.vchNo)
                              ? (customAmounts[inv.vchNo] !== undefined
                                ? customAmounts[inv.vchNo]
                                : "")
                              : ""
                          }
                          onChange={(e) => handleAmountChange(inv.vchNo, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full text-right bg-transparent outline-none font-mono font-semibold text-gray-900 border border-gray-200 rounded px-2 py-1 focus:border-[#49293e] disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === filteredInvoices.length}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
            />
            Select All (Total: {formatAmount(totalSelectedAmount)})
          </label>
          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={selectedIds.size === 0}>
              Add Selected ({selectedIds.size})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
