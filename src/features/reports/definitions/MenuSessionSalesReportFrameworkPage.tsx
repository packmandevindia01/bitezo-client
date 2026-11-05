import { ReportPage } from "../framework/ReportPage";
import { menuSessionSalesReport } from "./salesByPeriod";

/** MenuSessionSalesReport — rendered by the report framework (Phase 4). */
const MenuSessionSalesReportFrameworkPage = () => <ReportPage definition={menuSessionSalesReport} />;

export default MenuSessionSalesReportFrameworkPage;
