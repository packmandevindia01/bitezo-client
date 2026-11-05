import { ReportPage } from "../framework/ReportPage";
import { monthlySalesReport } from "./monthlySales";

/** Monthly Sales Report — rendered by the report framework (replaces monthlySalesReport/pages/*). */
const MonthlySalesReportFrameworkPage = () => <ReportPage definition={monthlySalesReport} />;

export default MonthlySalesReportFrameworkPage;
