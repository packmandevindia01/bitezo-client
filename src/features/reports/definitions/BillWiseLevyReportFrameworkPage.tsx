import { ReportPage } from "../framework/ReportPage";
import { billWiseLevyReport } from "./vatLevy";

/** BillWiseLevy report, rendered by the report framework (Phase 4). */
const BillWiseLevyReportFrameworkPage = () => <ReportPage definition={billWiseLevyReport} />;

export default BillWiseLevyReportFrameworkPage;
