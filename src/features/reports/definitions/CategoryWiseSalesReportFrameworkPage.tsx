import { ReportPage } from "../framework/ReportPage";
import { categoryWiseSalesReport } from "./itemSales";

/** CategoryWiseSalesReport — rendered by the report framework (Phase 4). */
const CategoryWiseSalesReportFrameworkPage = () => <ReportPage definition={categoryWiseSalesReport} />;

export default CategoryWiseSalesReportFrameworkPage;
