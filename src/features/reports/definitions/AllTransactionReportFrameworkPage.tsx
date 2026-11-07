import { ReportPage } from "../framework/ReportPage";
import { allTransactionReport } from "./sales";

/** AllTransaction report, rendered by the report framework (Phase 4). */
const AllTransactionReportFrameworkPage = () => <ReportPage definition={allTransactionReport} />;

export default AllTransactionReportFrameworkPage;
