import { ReportPage } from "../framework/ReportPage";
import { customerStatementReport } from "./accounts";

/** CustomerStatement report, rendered by the report framework (Phase 4). */
const CustomerStatementReportFrameworkPage = () => <ReportPage definition={customerStatementReport} />;

export default CustomerStatementReportFrameworkPage;
