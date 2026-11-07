import { ReportPage } from "../framework/ReportPage";
import { customerBalanceReport } from "./accounts";

/** CustomerBalance report, rendered by the report framework (Phase 4). */
const CustomerBalanceReportFrameworkPage = () => <ReportPage definition={customerBalanceReport} />;

export default CustomerBalanceReportFrameworkPage;
