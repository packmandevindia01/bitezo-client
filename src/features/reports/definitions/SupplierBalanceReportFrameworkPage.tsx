import { ReportPage } from "../framework/ReportPage";
import { supplierBalanceReport } from "./accounts";

/** SupplierBalance report, rendered by the report framework (Phase 4). */
const SupplierBalanceReportFrameworkPage = () => <ReportPage definition={supplierBalanceReport} />;

export default SupplierBalanceReportFrameworkPage;
