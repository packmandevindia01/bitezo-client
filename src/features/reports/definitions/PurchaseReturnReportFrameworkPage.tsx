import { ReportPage } from "../framework/ReportPage";
import { purchaseReturnReport } from "./purchase";

/** PurchaseReturnReport — rendered by the report framework (Phase 4). */
const PurchaseReturnReportFrameworkPage = () => <ReportPage definition={purchaseReturnReport} />;

export default PurchaseReturnReportFrameworkPage;
