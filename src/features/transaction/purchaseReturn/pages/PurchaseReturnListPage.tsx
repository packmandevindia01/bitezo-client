// trigger rebuild
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell, RecordTableCard, SearchBar, Button, ConfirmDialog, FormInput } from "../../../../components/common";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "../../../../app/providers/useToast";
import { purchaseReturnApi } from "../services/purchaseReturnApi";
import { usePermissions } from "../../../../hooks/usePermissions";

const getFirstDayOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

interface PurchaseReturnRow {
  purchaseReturnId: number;
  id?: number;
  purchaseReturnNo: string;
  purchaseInvoiceNo: string;
  purchaseReturnDate: string;
  supplier: string;
  netAmount: number;
  isCancelled: boolean;
}

const PurchaseReturnListPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [invoices, setInvoices] = useState<PurchaseReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getToday());

  const [cancelModal, setCancelModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [cancelling, setCancelling] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await purchaseReturnApi.getPurchaseReturnList({
        FromDate: fromDate,
        ToDate: toDate,
      });
      setInvoices(data || []);
    } catch (error: any) {
      showToast(error.message || "Failed to load invoices", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [fromDate, toDate]);

  const handleCancel = async () => {
    if (!cancelModal.id) return;
    try {
      setCancelling(true);
      await purchaseReturnApi.cancelPurchaseReturn(cancelModal.id);
      showToast("Invoice cancelled successfully", "success");
      setCancelModal({ open: false, id: null });
      fetchInvoices();
    } catch (error: any) {
      showToast(error.message || "Failed to cancel invoice", "error");
    } finally {
      setCancelling(false);
    }
  };

  const filteredInvoices = invoices
    .filter((inv) => {
      const term = searchTerm.toLowerCase();
      return (
        inv.purchaseReturnNo?.toLowerCase().includes(term) ||
        inv.purchaseInvoiceNo?.toLowerCase().includes(term) ||
        inv.supplier?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.purchaseReturnDate).getTime();
      const dateB = new Date(b.purchaseReturnDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return (b.purchaseReturnId || b.id || 0) - (a.purchaseReturnId || a.id || 0);
    });

  const columns = [
    { 
      header: "Sl No", 
      accessor: "purchaseReturnId" as keyof PurchaseReturnRow,
      render: (_: PurchaseReturnRow, index: number) => <span className="text-gray-500 font-medium">{index + 1}</span>
    },
    { header: "Return No", accessor: "purchaseReturnNo" as keyof PurchaseReturnRow },
    { 
      header: "Date", 
      accessor: "purchaseReturnDate" as keyof PurchaseReturnRow,
      render: (row: PurchaseReturnRow) => row.purchaseReturnDate ? new Date(row.purchaseReturnDate).toLocaleDateString("en-GB") : "-"
    },
    { 
      header: "Amount", 
      accessor: "netAmount" as keyof PurchaseReturnRow,
      align: "right",
      render: (row: PurchaseReturnRow) => <span className="font-semibold text-right block">{Number(row.netAmount || 0).toFixed(3)}</span>
    },
    {
      header: "Status",
      accessor: "isCancelled" as keyof PurchaseReturnRow,
      render: (row: PurchaseReturnRow) => (
        <span
          className={`px-2 py-1 text-xs font-bold rounded-full ${
            row.isCancelled ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
          }`}
        >
          {row.isCancelled ? "Cancelled" : "Active"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "purchaseReturnId" as keyof PurchaseReturnRow,
      render: (row: PurchaseReturnRow) => (
        <div className="flex gap-2">
          {!row.isCancelled && hasPermission("Purchase Return", "Edit") && (
            <button
              onClick={() => navigate(`/dashboard/purchase-return/edit/${row.purchaseReturnId || row.id}`)}
              className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          )}
          {!row.isCancelled && hasPermission("Purchase Return", "Delete") && (
            <button
              onClick={() => setCancelModal({ open: true, id: row.purchaseReturnId || row.id || 0 })}
              className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
              title="Cancel"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell title="Purchase Returns">
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1">
          <div className="w-40">
            <FormInput
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="w-40">
            <FormInput
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="flex-1 max-w-sm flex flex-col gap-1 mb-1 relative">
            <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-transparent mb-0.5 select-none pointer-events-none">
              -
            </label>
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by Return No or Supplier..."
            />
          </div>
        </div>
        {hasPermission("Purchase Return", "Add") && (
          <Button onClick={() => navigate("/dashboard/purchase-return/new")} icon={<Plus size={18} />}>
            New Invoice
          </Button>
        )}
      </div>

      <RecordTableCard<PurchaseReturnRow>
        title="Purchase Returns"
        data={filteredInvoices}
        columns={columns}
        loading={loading}
        rowKey={(row: PurchaseReturnRow) => (row.purchaseReturnId || row.id || Math.random()).toString()}
      />

      <ConfirmDialog
        isOpen={cancelModal.open}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this Purchase Return?"
        confirmLabel="Yes, Cancel it"
        onConfirm={handleCancel}
        onCancel={() => setCancelModal({ open: false, id: null })}
        loading={cancelling}
      />
    </PageShell>
  );
};

export default PurchaseReturnListPage;
