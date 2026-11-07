import { ReportPage } from "../framework/ReportPage";
import { stockAdjustmentReport } from "./stock";

/** StockAdjustment report, rendered by the report framework (Phase 4). */
const StockAdjustmentReportFrameworkPage = () => <ReportPage definition={stockAdjustmentReport} />;

export default StockAdjustmentReportFrameworkPage;
