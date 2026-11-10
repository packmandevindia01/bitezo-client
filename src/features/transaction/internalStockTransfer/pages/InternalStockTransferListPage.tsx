import { getDecimalPart } from "../../../../utils/currency";
import { StockDocumentListPage, type StockDocumentListPageConfig } from "../../shared/components/StockDocumentListPage";
import { internalStockTransferApi, formatDateOnly } from "../services/internalStockTransferApi";

const LIST_CONFIG: StockDocumentListPageConfig = {
  queryPrefix: "internalStockTransfer",
  getDetails: ({ BranchId, ...params }) =>
    internalStockTransferApi.getTransferList({ ...params, FromBranchId: BranchId, Decimals: getDecimalPart() }),
  getBranchList: internalStockTransferApi.getFromBranches,
  defaultFromDate: () => formatDateOnly(new Date(new Date().setDate(new Date().getDate() - 30))),
  route: "/dashboard/internal-stock-transfer",
  editPath: (transId) => `/dashboard/internal-stock-transfer/edit/${transId}`,
  pageTitle: "Internal Stock Transfers",
  pageDescription: "View and manage previous internal stock transfers.",
  tableTitle: "Internal Stock Transfer Records",
  branchColumns: [
    { header: "From Branch", accessor: "fromBranch" },
    { header: "To Branch", accessor: "toBranch" },
  ],
  searchFields: ["refNo", "fromBranch", "toBranch"],
  searchPlaceholder: "Search ref no or branch...",
  cancelDocument: internalStockTransferApi.cancelTransfer,
  cancelTip: "Cancel Transfer",
  cancelDialogTitle: "Cancel Transfer",
  cancelDialogMessage: "Are you sure you want to cancel this internal stock transfer?",
  cancelConfirmLabel: "Cancel Transfer",
  cancelFailedMessage: "Failed to cancel transfer",
  cancelSuccessMessage: "Transfer cancelled successfully",
};

const InternalStockTransferListPage = () => <StockDocumentListPage config={LIST_CONFIG} />;

export default InternalStockTransferListPage;
