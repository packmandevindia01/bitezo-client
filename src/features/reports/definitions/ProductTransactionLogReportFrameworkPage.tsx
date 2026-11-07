import { ReportPage } from "../framework/ReportPage";
import { productTransactionLogReport } from "./closing";

/** ProductTransactionLog report, rendered by the report framework (Phase 4). */
const ProductTransactionLogReportFrameworkPage = () => <ReportPage definition={productTransactionLogReport} />;

export default ProductTransactionLogReportFrameworkPage;
