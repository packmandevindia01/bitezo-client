import { ReportPage } from "../framework/ReportPage";
import { stockRegisterReport } from "./stock";

/** StockRegister report, rendered by the report framework (Phase 4). */
const StockRegisterReportFrameworkPage = () => <ReportPage definition={stockRegisterReport} />;

export default StockRegisterReportFrameworkPage;
