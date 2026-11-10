import { StockDocumentListPage, type StockDocumentListPageConfig } from "../../shared/components/StockDocumentListPage";
import { physicalEntryApi } from "../services/physicalEntryApi";

const LIST_CONFIG: StockDocumentListPageConfig = {
  queryPrefix: "physicalEntry",
  getDetails: physicalEntryApi.getPhysicalEntryDetails,
  getBranchList: physicalEntryApi.getBranchList,
  route: "/dashboard/physical-entry",
  pageTitle: "Physical Stock Entries",
  pageDescription: "View and manage previous physical stock entries.",
  tableTitle: "Physical Entry Records",
  cancelDocument: physicalEntryApi.cancelPhysicalEntry,
  cancelTip: "Cancel Entry",
  cancelDialogTitle: "Cancel Physical Entry",
  cancelDialogMessage: "Are you sure you want to cancel this entry? This action cannot be undone and will reverse the stock changes.",
  cancelConfirmLabel: "Cancel Entry",
  cancelFailedMessage: "Failed to cancel physical entry",
};

const PhysicalEntryListPage = () => <StockDocumentListPage config={LIST_CONFIG} />;

export default PhysicalEntryListPage;
