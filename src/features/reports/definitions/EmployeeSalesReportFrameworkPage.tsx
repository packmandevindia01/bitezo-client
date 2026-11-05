import { ReportPage } from "../framework/ReportPage";
import { employeeSalesReport } from "./itemSales";

/** EmployeeSalesReport — rendered by the report framework (Phase 4). */
const EmployeeSalesReportFrameworkPage = () => <ReportPage definition={employeeSalesReport} />;

export default EmployeeSalesReportFrameworkPage;
