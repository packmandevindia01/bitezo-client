import { ReportPage } from "../framework/ReportPage";
import { salesReport } from "./sales";

/** Sales report, rendered by the report framework (Phase 4). */
const SalesReportFrameworkPage = () => <ReportPage definition={salesReport} />;

export default SalesReportFrameworkPage;
