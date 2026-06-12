import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell, RecordTableCard, SearchBar, Button, ConfirmDialog, FormInput } from "../../../../components/common";
import { Plus, Edit, XCircle } from "lucide-react";
import { useToast } from "../../../../app/providers/useToast";
import { purchaseInvoiceApi } from "../services/purchaseInvoiceApi";
import { usePermissions } from "../../../../hooks/usePermissions";

const getFirstDayOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

interface PurchaseInvoiceRow {
  purchaseId: number;
  id?: number;
  purchaseNo: string;
  invoiceNo: string;
  purchaseDate: string;
  supplierName: string;
  netAmount: number;
  isCancelled: boolean;
}

const PurchaseInvoiceListPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [invoices, setInvoices] = useState<PurchaseInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getToday());

  const [cancelModal, setCancelModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [cancelling, setCancelling] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await purchaseInvoiceApi.getPurchaseInvoiceList({
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
      await purchaseInvoiceApi.cancelPurchaseInvoice(cancelModal.id);
      showToast("Invoice cancelled successfully", "success");
      setCancelModal({ open: false, id: null });
      fetchInvoices();
    } catch (error: any) {
      showToast(error.message || "Failed to cancel invoice", "error");
    } finally {
      setCancelling(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    return (
      inv.purchaseNo?.toLowerCase().includes(term) ||
      inv.invoiceNo?.toLowerCase().includes(term) ||
      inv.supplierName?.toLowerCase().includes(term)
    );
  });

  const columns = [
    { 
      header: "Sl No", 
      accessor: "purchaseId" as keyof PurchaseInvoiceRow,
      render: (_: PurchaseInvoiceRow, index: number) => <span className="text-gray-500 font-medium">{index + 1}</span>
    },
    { header: "Invoice No", accessor: "invoiceNo" as keyof PurchaseInvoiceRow },
    { 
      header: "Date", 
      accessor: "purchaseDate" as keyof PurchaseInvoiceRow,
      render: (row: PurchaseInvoiceRow) => row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString("en-GB") : "-"
    },
    { 
      header: "Amount", 
      accessor: "netAmount" as keyof PurchaseInvoiceRow,
      align: "right",
      render: (row: PurchaseInvoiceRow) => <span className="font-semibold text-right block">{Number(row.netAmount || 0).toFixed(3)}</span>
    },
    {
      header: "Status",
      accessor: "isCancelled" as keyof PurchaseInvoiceRow,
      render: (row: PurchaseInvoiceRow) => (
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
      accessor: "purchaseId" as keyof PurchaseInvoiceRow,
      render: (row: PurchaseInvoiceRow) => (
        <div className="flex gap-2">
          {!row.isCancelled && hasPermission("Purchase Invoice", "Edit") && (
            <Button
              icon={<Edit size={16} />}
              onClick={() => navigate(`/dashboard/purchase-invoice/edit/${row.purchaseId || row.id}`)}
              title="Edit"
            />
          )}
          {!row.isCancelled && hasPermission("Purchase Invoice", "Delete") && (
            <Button
              icon={<XCircle size={16} />}
              className="text-red-500 hover:bg-red-50"
              onClick={() => setCancelModal({ open: true, id: row.purchaseId || row.id || 0 })}
              title="Cancel"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <PageShell title="Purchase Invoices">
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
          <div className="flex-1 max-w-sm">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by Purchase No, Invoice No, or Supplier..."
            />
          </div>
        </div>
        {hasPermission("Purchase Invoice", "Add") && (
          <Button onClick={() => navigate("/dashboard/purchase-invoice/new")} icon={<Plus size={18} />}>
            New Invoice
          </Button>
        )}
      </div>

      <RecordTableCard<PurchaseInvoiceRow>
        title="Purchase Invoices"
        data={filteredInvoices}
        columns={columns}
        loading={loading}
        rowKey={(row: PurchaseInvoiceRow) => (row.purchaseId || row.id || Math.random()).toString()}
      />

      <ConfirmDialog
        isOpen={cancelModal.open}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this purchase invoice? This action cannot be fully undone."
        confirmLabel="Yes, Cancel it"
        onConfirm={handleCancel}
        onCancel={() => setCancelModal({ open: false, id: null })}
        loading={cancelling}
      />
    </PageShell>
  );
};

export default PurchaseInvoiceListPage;
