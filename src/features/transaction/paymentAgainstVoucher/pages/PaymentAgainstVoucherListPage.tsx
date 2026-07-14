import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageShell, RecordTableCard, SearchBar, Button, ConfirmDialog, FormInput, SelectInput } from "../../../../components/common";
import { usePaymentAgainstVoucherList } from "../hooks/usePaymentAgainstVoucherList";
import { paymentAgainstVoucherApi } from "../services/paymentAgainstVoucherApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../../app/providers/useToast";

const PaymentAgainstVoucherListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // Date filters defaulting to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
  
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { records, isLoading, branches, searchBranchId, setSearchBranchId, isBranchLocked } = usePaymentAgainstVoucherList(fromDate, toDate);

  const sortedRecords = [...records].sort((a: any, b: any) => b.transId - a.transId);

  const filteredRecords = sortedRecords.filter((item: any) => 
      item.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: paymentAgainstVoucherApi.cancelPaymentAgainstVoucher,
    onSuccess: () => {
      showToast("Payment against voucher cancelled successfully", "success", "Success");
      queryClient.invalidateQueries({ queryKey: ["paymentAgainstVoucherList"] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.message || "Failed to cancel voucher", "error", "Error");
    },
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  const renderActions = (item: any) => (
    <div className="flex gap-1 justify-end">
      <button
        onClick={() => navigate(`/dashboard/payment-against-voucher/${item.transId}`)}
        className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => setDeleteId(item.transId)}
        className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
        title="Cancel/Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const renderAmount = (item: any) => (
    <span className="font-mono">{item.amount}</span>
  );
  
  const renderDate = (item: any) => (
    <span>{item.voucherDate ? item.voucherDate.split("T")[0] : ""}</span>
  );

  return (
    <PageShell title="Payment Against Vouchers">
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1">
          <div className="w-40">
            <FormInput 
              id="list-from-date" 
              label="From Date" 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="w-40">
            <FormInput 
              id="list-to-date" 
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
              placeholder="Search by voucher no or account..."
            />
          </div>
          <div className="w-48">
            <SelectInput
              id="list-branch"
              label="Branch"
              value={String(searchBranchId)}
              onChange={(e) => setSearchBranchId(Number(e.target.value))}
              options={branches.map((b: any) => ({ label: b.branchName, value: String(b.id) }))}
              disabled={isBranchLocked}
            />
          </div>
        </div>
        <Button 
          icon={<Plus size={18} />}
          onClick={() => navigate("/dashboard/payment-against-voucher/new")}
        >
          Add New
        </Button>
      </div>

      <RecordTableCard
        title={`Vouchers (${filteredRecords.length})`}
        data={filteredRecords}
        columns={[
          { header: "Sl No", accessor: "transId", render: (_, index) => <span className="font-mono text-gray-500">{index + 1}</span>, align: "center" },
          { header: "Voucher No", accessor: "voucherNo" },
          { header: "Date", accessor: "voucherDate", render: renderDate },
          { header: "Account Code", accessor: "code" },
          { header: "Account Name", accessor: "account" },
          { header: "Amount", accessor: "amount", align: "right", render: renderAmount },
          { header: "Actions", accessor: "transId", render: renderActions }
        ]}
        loading={isLoading}
        rowKey="transId"
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Cancel Voucher"
        message="Are you sure you want to cancel this payment against voucher? This action cannot be undone."
        confirmLabel="Cancel Voucher"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </PageShell>
  );
};

export default PaymentAgainstVoucherListPage;
