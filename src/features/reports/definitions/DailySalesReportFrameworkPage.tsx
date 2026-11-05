import { ReportPage } from "../framework/ReportPage";
import { dailySalesReport } from "./salesByPeriod";

/** Daily Sales Report — rendered by the report framework (Phase 4). */
const DailySalesReportFrameworkPage = () => <ReportPage definition={dailySalesReport} />;

export default DailySalesReportFrameworkPage;
