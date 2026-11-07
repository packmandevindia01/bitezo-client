import { ReportPage } from "../framework/ReportPage";
import { dayEndReport } from "./closing";

/** DayEnd report, rendered by the report framework (Phase 4). */
const DayEndReportFrameworkPage = () => <ReportPage definition={dayEndReport} />;

export default DayEndReportFrameworkPage;
