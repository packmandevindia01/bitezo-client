import { ReportPage } from "../framework/ReportPage";
import { productWiseMarginReport } from "./sales";

/** ProductWiseMargin report, rendered by the report framework (Phase 4). */
const ProductWiseMarginReportFrameworkPage = () => <ReportPage definition={productWiseMarginReport} />;

export default ProductWiseMarginReportFrameworkPage;
