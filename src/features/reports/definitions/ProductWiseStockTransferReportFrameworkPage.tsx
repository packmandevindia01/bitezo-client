import { ReportPage } from "../framework/ReportPage";
import { productWiseStockTransferReport } from "./stock";

/** ProductWiseStockTransfer report, rendered by the report framework (Phase 4). */
const ProductWiseStockTransferReportFrameworkPage = () => <ReportPage definition={productWiseStockTransferReport} />;

export default ProductWiseStockTransferReportFrameworkPage;
