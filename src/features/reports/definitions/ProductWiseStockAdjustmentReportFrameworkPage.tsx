import { ReportPage } from "../framework/ReportPage";
import { productWiseStockAdjustmentReport } from "./stock";

/** ProductWiseStockAdjustment report, rendered by the report framework (Phase 4). */
const ProductWiseStockAdjustmentReportFrameworkPage = () => <ReportPage definition={productWiseStockAdjustmentReport} />;

export default ProductWiseStockAdjustmentReportFrameworkPage;
