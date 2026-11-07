import { ReportPage } from "../framework/ReportPage";
import { supplierStatementReport } from "./accounts";

/** SupplierStatement report, rendered by the report framework (Phase 4). */
const SupplierStatementReportFrameworkPage = () => <ReportPage definition={supplierStatementReport} />;

export default SupplierStatementReportFrameworkPage;
