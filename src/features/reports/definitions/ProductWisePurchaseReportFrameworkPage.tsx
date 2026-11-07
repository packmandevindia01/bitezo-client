import { ReportPage } from "../framework/ReportPage";
import { productWisePurchaseReport } from "./purchase";

/** ProductWisePurchase report, rendered by the report framework (Phase 4). */
const ProductWisePurchaseReportFrameworkPage = () => <ReportPage definition={productWisePurchaseReport} />;

export default ProductWisePurchaseReportFrameworkPage;
