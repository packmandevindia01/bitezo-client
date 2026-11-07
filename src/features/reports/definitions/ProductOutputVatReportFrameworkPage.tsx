import { ReportPage } from "../framework/ReportPage";
import { productOutputVatReport } from "./vatLevy";

/** ProductOutputVat report, rendered by the report framework (Phase 4). */
const ProductOutputVatReportFrameworkPage = () => <ReportPage definition={productOutputVatReport} />;

export default ProductOutputVatReportFrameworkPage;
