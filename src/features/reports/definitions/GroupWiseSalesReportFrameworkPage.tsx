import { ReportPage } from "../framework/ReportPage";
import { groupWiseSalesReport } from "./itemSales";

/** GroupWiseSalesReport — rendered by the report framework (Phase 4). */
const GroupWiseSalesReportFrameworkPage = () => <ReportPage definition={groupWiseSalesReport} />;

export default GroupWiseSalesReportFrameworkPage;
