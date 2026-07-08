import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell, RecordTableCard, SelectInput, FormInput, Button, SearchBar, ConfirmDialog } from "../../../../components/common";
import { usePaymentVoucher } from "../hooks/usePaymentVoucher";
import { formatCurrency } from "../../../../utils/formatters";
import { Plus, Pencil, Trash2 } from "lucide-react";

const PaymentVoucherListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const {
    paymentVouchers, 
    isLoadingList, 
    searchBranchList, 
    searchBranchId, 
    setSearchBranchId,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    cancelMutation
  } = usePaymentVoucher();

  const [cancelModal, setCancelModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const handleCancel = async () => {
    if (cancelModal.id) {
      await cancelMutation.mutateAsync(cancelModal.id);
      setCancelModal({ open: false, id: null });
    }
  };

  const filteredData = paymentVouchers.filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageShell title="Payment Voucher">
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1">
          <div className="w-40">
            <FormInput
              id="pv-search-from"
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="w-40">
            <FormInput
              id="pv-search-to"
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
              value={search}
              onChange={setSearch}
              placeholder="Search by Vch No, Code, Account..."
            />
          </div>
          <div className="w-48">
            <SelectInput
              id="pv-search-branch"
              label="Branch"
              value={String(searchBranchId)}
              onChange={(e) => setSearchBranchId(Number(e.target.value))}
              options={searchBranchList.map(b => ({ label: b.branchName, value: String(b.branchId) }))}
            />
          </div>
        </div>
        <Button onClick={() => navigate("/dashboard/payment-voucher/new")} icon={<Plus size={18} />}>
          Add New
        </Button>
      </div>

      <div className="overflow-x-auto">
        <RecordTableCard
          title="Saved Payment List"
          data={filteredData}
          loading={isLoadingList}
          rowKey={(row) => `${row.voucherNo}-${row.transId}`}
          columns={[
            { header: "S No", accessor: "sNo" },
            { 
              header: "Date", 
              accessor: "voucherDate",
              render: (row) => <span>{row.voucherDate?.split("T")[0]}</span>
            },
            { 
              header: "Vch No", 
              accessor: "voucherNo",
              render: (row) => <span className="text-xs font-bold text-gray-400 uppercase">{row.voucherNo}</span>
            },
            { header: "Code", accessor: "code" },
            { header: "Account", accessor: "account" },
            { 
              header: "Amount", 
              accessor: "amount",
              align: "right",
              render: (row) => <span className="font-bold text-red-500">{formatCurrency(Number(row.amount))}</span>
            },
            {
              header: "Actions",
              accessor: "transId",
              render: (row) => (
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/dashboard/payment-voucher/edit/${row.transId}`)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => setCancelModal({ open: true, id: row.transId })}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <ConfirmDialog
        isOpen={cancelModal.open}
        title="Cancel Payment Voucher"
        message="Are you sure you want to delete this Payment Voucher?"
        confirmLabel="Yes, Cancel it"
        onConfirm={handleCancel}
        onCancel={() => setCancelModal({ open: false, id: null })}
        loading={cancelMutation.isPending}
      />
    </PageShell>
  );
};

export default PaymentVoucherListPage;
