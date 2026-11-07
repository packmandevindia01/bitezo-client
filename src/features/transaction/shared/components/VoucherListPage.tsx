import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell, RecordTableCard, SelectInput, FormInput, Button, SearchBar, ConfirmDialog } from "../../../../components/common";
import { formatDateOnly } from "../purchaseDocument";
import { useVoucherForm, type VoucherConfig } from "../useVoucherForm";
import { formatCurrency } from "../../../../utils/formatters";
import { Plus, Pencil, Trash2 } from "lucide-react";

export interface VoucherListProps {
  config: VoucherConfig;
  /** Route of this voucher, e.g. /dashboard/payment-voucher */
  route: string;
  /** Prefix of the field ids, e.g. pv */
  idPrefix: string;
  amountClass: string;
}

/** The saved list of Payment and Receipt Vouchers. */
export const VoucherListPage = ({ config, route, idPrefix, amountClass }: VoucherListProps) => {
  const { label } = config;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const {
    vouchers,
    isLoadingList, 
    searchBranchList, 
    searchBranchId, 
    setSearchBranchId,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    cancelMutation,
    isBranchLocked
  } = useVoucherForm(config);

  const [cancelModal, setCancelModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const handleCancel = async () => {
    if (cancelModal.id) {
      await cancelMutation.mutateAsync(cancelModal.id);
      setCancelModal({ open: false, id: null });
    }
  };

  const filteredData = vouchers
    .filter(item => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        String(item.voucherNo || "").toLowerCase().includes(searchLower) ||
        String(item.code || "").toLowerCase().includes(searchLower) ||
        String(item.account || "").toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.voucherDate || 0).getTime();
      const dateB = new Date(b.voucherDate || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;

      return String(b.voucherNo || "").localeCompare(String(a.voucherNo || ""), undefined, { numeric: true, sensitivity: 'base' });
    });

  return (
    <PageShell title={`${label} Voucher`}>
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1">
          <div className="w-40">
            <FormInput
              id={`${idPrefix}-search-from`}
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="w-40">
            <FormInput
              id={`${idPrefix}-search-to`}
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
              id={`${idPrefix}-search-branch`}
              label="Branch"
              value={String(searchBranchId)}
              onChange={(e) => setSearchBranchId(Number(e.target.value))}
              options={searchBranchList.map(b => ({ label: b.branchName, value: String(b.branchId) }))}
              disabled={isBranchLocked}
            />
          </div>
        </div>
        <Button onClick={() => navigate(`${route}/new`)} icon={<Plus size={18} />}>
          Add New
        </Button>
      </div>

      <div className="overflow-x-auto">
        <RecordTableCard
          title={`Saved ${label} List`}
          data={filteredData}
          loading={isLoadingList}
          rowKey={(row) => `${row.voucherNo}-${row.transId}`}
          columns={[
            { header: "S No", accessor: "sNo" },
            { 
              header: "Date", 
              accessor: "voucherDate",
              render: (row) => <span>{row.voucherDate ? formatDateOnly(row.voucherDate) : ""}</span>
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
              render: (row) => <span className={`font-bold ${amountClass}`}>{formatCurrency(Number(row.amount))}</span>
            },
            {
              header: "Actions",
              accessor: "transId",
              render: (row) => (
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => navigate(`${route}/edit/${row.transId}`)}
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
        title={`Cancel ${label} Voucher`}
        message={`Are you sure you want to delete this ${label} Voucher?`}
        confirmLabel="Yes, Cancel it"
        onConfirm={handleCancel}
        onCancel={() => setCancelModal({ open: false, id: null })}
        loading={cancelMutation.isPending}
      />
    </PageShell>
  );
};
