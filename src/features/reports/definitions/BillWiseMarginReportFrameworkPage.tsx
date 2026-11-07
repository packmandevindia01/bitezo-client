import { ReportPage } from "../framework/ReportPage";
import { billWiseMarginReport } from "./sales";

/** BillWiseMargin report, rendered by the report framework (Phase 4). */
const BillWiseMarginReportFrameworkPage = () => <ReportPage definition={billWiseMarginReport} />;

export default BillWiseMarginReportFrameworkPage;
