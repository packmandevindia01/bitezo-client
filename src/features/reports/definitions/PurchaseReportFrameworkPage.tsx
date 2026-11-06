import { ReportPage } from "../framework/ReportPage";
import { purchaseReport } from "./purchase";

/** PurchaseReport — rendered by the report framework (Phase 4). */
const PurchaseReportFrameworkPage = () => <ReportPage definition={purchaseReport} />;

export default PurchaseReportFrameworkPage;
