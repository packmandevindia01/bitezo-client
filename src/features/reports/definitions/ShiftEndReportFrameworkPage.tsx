import { ReportPage } from "../framework/ReportPage";
import { shiftEndReport } from "./closing";

/** ShiftEnd report, rendered by the report framework (Phase 4). */
const ShiftEndReportFrameworkPage = () => <ReportPage definition={shiftEndReport} />;

export default ShiftEndReportFrameworkPage;
