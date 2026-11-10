import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { formatDateOnly } from "@shared/lib/date";
import { Button, ConfirmDialog, FormInput, PageShell, RecordTableCard, SearchBar, SelectInput } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import type { StockDocumentRow } from "../stockDocumentApi";
import { useStockDocumentList, type StockDocumentListConfig } from "../useStockDocumentList";

export interface StockDocumentListPageConfig extends StockDocumentListConfig {
  /** Route of the document, e.g. /dashboard/stock-adjustment */
  route: string;
  pageTitle: string;
  pageDescription: string;
  tableTitle: string;
  cancelDocument: (transId: number) => Promise<unknown>;
  cancelTip: string;
  cancelDialogTitle: string;
  cancelDialogMessage: string;
  cancelConfirmLabel: string;
  cancelFailedMessage: string;
  /** Set: the result of a cancel is a toast. Not set: only a failure shows, above the list. */
  cancelSuccessMessage?: string;
  /** Default: `route?id=<id>` */
  editPath?: (transId: number) => string;
  /** Default: one Branch column */
  branchColumns?: { header: string; accessor: "branch" | "fromBranch" | "toBranch" }[];
  /** Default: Ref No and Branch */
  searchFields?: ("refNo" | "branch" | "fromBranch" | "toBranch")[];
  searchPlaceholder?: string;
}

const REPORTS_AFFECTED_BY_CANCEL = [
  "stockRegisterReport",
  "productClosingStock",
  "stockAdjustmentReport",
  "productWiseStockAdjustmentReport",
  "productTransactionLogReport",
];

/** The saved list of Stock Adjustments, Physical Entries and Stock Transfers. */
export const StockDocumentListPage = ({ config }: { config: StockDocumentListPageConfig }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();
  const { records, loading, error: fetchError, filters, handleFilterChange, branches } = useStockDocumentList(config);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const error = cancelError || fetchError;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await config.cancelDocument(deleteId);
      if (config.cancelSuccessMessage) showToast(config.cancelSuccessMessage, "success");
      [`${config.queryPrefix}List`, ...REPORTS_AFFECTED_BY_CANCEL].forEach((key) => {
        void queryClient.invalidateQueries({ queryKey: [key] });
      });
    } catch (err) {
      const message = (err as Error).message || config.cancelFailedMessage;
      if (config.cancelSuccessMessage) showToast(message, "error");
      else setCancelError(message);
    } finally {
      setDeleteId(null);
    }
  };

  const term = searchTerm.toLowerCase();
  const searchFields = config.searchFields ?? ["refNo", "branch"];
  const filteredRecords = records.filter((row) => !term || searchFields.some((field) => String(row[field] || "").toLowerCase().includes(term)));

  return (
    <PageShell title={config.pageTitle} description={config.pageDescription}>
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setCancelError(null)} className="shrink-0 rounded p-0.5 hover:bg-red-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1 flex-wrap">
          <div className="w-40">
            <FormInput label="From Date" type="date" value={filters.fromDate} onChange={(e) => handleFilterChange("fromDate", e.target.value)} />
          </div>
          <div className="w-40">
            <FormInput label="To Date" type="date" value={filters.toDate} onChange={(e) => handleFilterChange("toDate", e.target.value)} />
          </div>
          <div className="flex-1 max-w-sm flex flex-col gap-1 mb-1 relative">
            <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-transparent mb-0.5 select-none pointer-events-none">
              -
            </label>
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={config.searchPlaceholder ?? "Search by Ref No or Branch..."} />
          </div>
          <div className="w-48">
            <SelectInput
              id="filter-branch"
              label="Branch"
              placeholder=""
              options={branches}
              value={filters.branchId}
              onChange={(e) => handleFilterChange("branchId", e.target.value)}
              disabled={filters.isBranchLocked}
            />
          </div>
        </div>
        <Button onClick={() => navigate(config.route)} icon={<Plus size={18} />}>
          Add New
        </Button>
      </div>

      <div className="overflow-x-auto">
        <RecordTableCard<StockDocumentRow & { sl?: number }>
          title={config.tableTitle}
          data={filteredRecords}
          rowKey="transId"
          loading={loading}
          columns={[
            { header: "Sl No", accessor: "sl", render: (_, index) => index + 1 },
            { header: "Date", accessor: "transDate", render: (row) => (row.transDate ? formatDateOnly(row.transDate) : "") },
            { header: "Ref No", accessor: "refNo" },
            ...(config.branchColumns ?? [{ header: "Branch", accessor: "branch" as const }]),
            { header: "Total Amount", accessor: "netAmount", render: (row) => formatAmount(Number(row.netAmount)), align: "right" },
            {
              header: "Actions",
              accessor: "transId",
              render: (row) => (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => navigate(config.editPath ? config.editPath(row.transId) : `${config.route}?id=${row.transId}`)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(row.transId)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                    title={config.cancelTip}
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
        isOpen={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={config.cancelDialogTitle}
        message={config.cancelDialogMessage}
        confirmLabel={config.cancelConfirmLabel}
        confirmVariant="danger"
      />
    </PageShell>
  );
};
