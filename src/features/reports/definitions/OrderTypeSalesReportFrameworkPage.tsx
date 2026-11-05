import { ReportPage } from "../framework/ReportPage";
import { orderTypeSalesReport } from "./salesByPeriod";

/** OrderType Sales Report — rendered by the report framework (Phase 4). */
const OrderTypeSalesReportFrameworkPage = () => <ReportPage definition={orderTypeSalesReport} />;

export default OrderTypeSalesReportFrameworkPage;
