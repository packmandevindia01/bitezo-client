import { ReportPage } from "../framework/ReportPage";
import { productInputVatReport } from "./vatLevy";

/** ProductInputVat report, rendered by the report framework (Phase 4). */
const ProductInputVatReportFrameworkPage = () => <ReportPage definition={productInputVatReport} />;

export default ProductInputVatReportFrameworkPage;
