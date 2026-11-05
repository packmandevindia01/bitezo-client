import { ReportPage } from "../framework/ReportPage";
import { hourlySalesReport } from "./salesByPeriod";

/** Hourly Sales Report — rendered by the report framework (Phase 4). */
const HourlySalesReportFrameworkPage = () => <ReportPage definition={hourlySalesReport} />;

export default HourlySalesReportFrameworkPage;
