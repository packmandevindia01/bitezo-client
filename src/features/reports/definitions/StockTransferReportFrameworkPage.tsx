import { ReportPage } from "../framework/ReportPage";
import { stockTransferReport } from "./stock";

/** StockTransfer report, rendered by the report framework (Phase 4). */
const StockTransferReportFrameworkPage = () => <ReportPage definition={stockTransferReport} />;

export default StockTransferReportFrameworkPage;
