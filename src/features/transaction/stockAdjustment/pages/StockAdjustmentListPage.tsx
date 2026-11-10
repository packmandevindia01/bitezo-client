import { StockDocumentListPage, type StockDocumentListPageConfig } from "../../shared/components/StockDocumentListPage";
import { stockAdjustmentApi } from "../services/stockAdjustmentApi";

const LIST_CONFIG: StockDocumentListPageConfig = {
  queryPrefix: "stockAdjustment",
  getDetails: stockAdjustmentApi.getStockAdjustmentDetails,
  getBranchList: stockAdjustmentApi.getBranchList,
  route: "/dashboard/stock-adjustment",
  pageTitle: "Saved Stock Adjustments",
  pageDescription: "View and manage previous stock adjustments.",
  tableTitle: "Stock Adjustment Records",
  cancelDocument: stockAdjustmentApi.cancelStockAdjustment,
  cancelTip: "Cancel Adjustment",
  cancelDialogTitle: "Cancel Stock Adjustment",
  cancelDialogMessage: "Are you sure you want to cancel this stock adjustment? This action cannot be undone.",
  cancelConfirmLabel: "Cancel Record",
  cancelFailedMessage: "Failed to cancel stock adjustment",
};

const StockAdjustmentListPage = () => <StockDocumentListPage config={LIST_CONFIG} />;

export default StockAdjustmentListPage;
