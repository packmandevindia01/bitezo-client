import { ReportPage } from "../framework/ReportPage";
import { productWiseLevyReport } from "./vatLevy";

/** ProductWiseLevy report, rendered by the report framework (Phase 4). */
const ProductWiseLevyReportFrameworkPage = () => <ReportPage definition={productWiseLevyReport} />;

export default ProductWiseLevyReportFrameworkPage;
