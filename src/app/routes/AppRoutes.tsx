// trigger rebuild
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader } from "../../components/common";
import RegistrationGuard from "./RegistrationGuard";
import ProtectedRoute from "./ProtectedRoute";
import SystemRegistrationGuard from "./SystemRegistrationGuard";
import { Navigate } from "react-router-dom";
import RoleGuard from "./RoleGuard";
import ShiftGuard from "./ShiftGuard";

const MainLayout = lazy(() => import("../../components/layout/MainLayout"));
const LoginPage = lazy(() => import("../../features/auth/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("../../features/auth/pages/ForgotPasswordPage"));
const VerifyOtpPage = lazy(() => import("../../features/auth/pages/VerifyOtpPage"));
const ResetPasswordPage = lazy(() => import("../../features/auth/pages/ResetPasswordPage"));
const CompanyOnboardingPage = lazy(() => import("../../features/company/pages/CompanyOnboardingPage"));
const DashboardPage = lazy(() => import("../../features/dashboard/pages/DashboardPage"));
const UserList = lazy(() => import("../../features/general/user/pages/UserList"));
const UserRolePage = lazy(() => import("../../features/general/userRole/pages/UserRolePage"));
const CompanyPage = lazy(() => import("../../features/company/pages/CompanyPage"));
const CustomerList = lazy(() => import("../../features/company/customer/pages/CustomerList"));
const EmployeePage = lazy(() => import("../../features/general/employee/pages/EmployeePage"));
const BranchListPage = lazy(() => import("../../features/inventory/branches/pages/BranchListPage"));
const BranchFormPage = lazy(() => import("../../features/inventory/branches/pages/BranchFormPage"));
const CategoryPage = lazy(() => import("../../features/inventory/category/pages/CategoryPage"));
const SubCategoryPage = lazy(() => import("../../features/inventory/subcategory/pages/SubCategoryPage"));
const GroupPage = lazy(() => import("../../features/inventory/group/pages/GroupPage"));
const UnitPage = lazy(() => import("../../features/inventory/unit/pages/UnitPage"));
const ModifierPage = lazy(() => import("../../features/inventory/modifier/pages/ModifierPage"));
const ProductListPage = lazy(() => import("../../features/inventory/product/pages/ProductListPage"));
const ProductFormPage = lazy(() => import("../../features/inventory/product/pages/ProductFormPage"));
const VoucherSeriesPage = lazy(() => import("../../features/inventory/voucherSeries/pages/VoucherSeriesPage"));
const ExtrasMasterPage = lazy(() => import("../../features/inventory/extrasMaster/pages/ExtrasMasterPage"));
const ExtrasTypePage = lazy(() => import("../../features/inventory/extrasType/pages/ExtrasTypePage"));
const ModifierTypePage = lazy(() => import("../../features/inventory/modifierType/pages/ModifierTypePage"));
const PaymodePage = lazy(() => import("../../features/general/paymode/pages/PaymodePage"));
const CounterPage = lazy(() => import("../../features/general/counter/pages/CounterPage"));
const SectionPage = lazy(() => import("../../features/general/section/pages/SectionPage"));
const TableMasterPage = lazy(() => import("../../features/general/tableMaster/pages/TableMasterPage"));
const MenuSettingsPage = lazy(() => import("../../features/general/menuSettings/pages/MenuSettingsPage"));
const PosTerminalPage = lazy(() => import("../../features/pos/terminal/pages/PosTerminalPage").then(m => ({ default: m.PosTerminalPage })));

const TaxPage = lazy(() => import("../../features/inventory/tax/pages/TaxPage"));
const SystemRegistrationPage = lazy(() => import("../../features/systemRegistration/pages/SystemRegistrationPage"));
const CashierInPage = lazy(() => import("../../features/pos/cashier/pages/CashierInPage"));
const CashierOutPage = lazy(() => import("../../features/pos/cashier/pages/CashierOutPage"));
const PurchaseInvoiceListPage = lazy(() => import("../../features/transaction/purchaseInvoice/pages/PurchaseInvoiceListPage"));
const PurchaseInvoiceFormPage = lazy(() => import("../../features/transaction/purchaseInvoice/pages/PurchaseInvoiceFormPage"));
const PurchaseReturnListPage = lazy(() => import("../../features/transaction/purchaseReturn/pages/PurchaseReturnListPage"));
const PurchaseReturnFormPage = lazy(() => import("../../features/transaction/purchaseReturn/pages/PurchaseReturnFormPage"));
const RecipeListPage = lazy(() => import("../../features/general/recipe/pages/RecipeListPage"));
const RecipePage = lazy(() => import("../../features/general/recipe/pages/RecipePage"));
const BomListPage = lazy(() => import("../../features/general/bom/pages/BomListPage"));
const BomPage = lazy(() => import("../../features/general/bom/pages/BomPage"));
const ProductionPage = lazy(() => import("../../features/transaction/production/pages/ProductionPage"));
const ProductionListPage = lazy(() => import("../../features/transaction/production/pages/ProductionListPage"));
const StockAdjustmentPage = lazy(() => import("../../features/transaction/stockAdjustment/pages/StockAdjustmentPage"));
const StockAdjustmentListPage = lazy(() => import("../../features/transaction/stockAdjustment/pages/StockAdjustmentListPage"));
const InternalStockTransferPage = lazy(() => import("../../features/transaction/internalStockTransfer/pages/InternalStockTransferPage"));
const InternalStockTransferListPage = lazy(() => import("../../features/transaction/internalStockTransfer/pages/InternalStockTransferListPage"));
const StockAdjustmentTypePage = lazy(() => import("../../features/inventory/stockAdjustmentType/pages/StockAdjustmentTypePage"));
const ConfigurationPage = lazy(() => import("../../features/general/configuration/pages/ConfigurationPage"));
const BackofficeConfigurationPage = lazy(() => import("../../features/general/configuration/pages/BackofficeConfigurationPage"));
const ProviderListPage = lazy(() => import("../../features/general/provider/pages/ProviderListPage"));
const ProviderFormPage = lazy(() => import("../../features/general/provider/pages/ProviderFormPage"));
const ProviderSettingsPage = lazy(() => import("../../features/general/providerSettings/pages/ProviderSettingsList"));
const SupplierList = lazy(() => import("../../features/general/supplier/pages/SupplierList"));
const PaymentAgainstVoucherPage = lazy(() => import("../../features/transaction/paymentAgainstVoucher/pages/PaymentAgainstVoucherPage"));
const PaymentAgainstVoucherListPage = lazy(() => import("../../features/transaction/paymentAgainstVoucher/pages/PaymentAgainstVoucherListPage"));
const ReceiptAgainstVoucherPage = lazy(() => import("../../features/transaction/receiptAgainstVoucher/pages/ReceiptAgainstVoucherPage"));
const ReceiptAgainstVoucherListPage = lazy(() => import("../../features/transaction/receiptAgainstVoucher/pages/ReceiptAgainstVoucherListPage"));
const PaymentVoucherListPage = lazy(() => import("../../features/transaction/paymentVoucher/pages/PaymentVoucherListPage"));
const PaymentVoucherFormPage = lazy(() => import("../../features/transaction/paymentVoucher/pages/PaymentVoucherFormPage"));
const ReceiptVoucherListPage = lazy(() => import("../../features/transaction/receiptVoucher/pages/ReceiptVoucherListPage"));
const ReceiptVoucherFormPage = lazy(() => import("../../features/transaction/receiptVoucher/pages/ReceiptVoucherFormPage"));
const HappyHourPage = lazy(() => import("../../features/general/happyHour/pages/HappyHourPage"));
const HappyHourFormPage = lazy(() => import("../../features/general/happyHour/pages/HappyHourFormPage"));
const ProviderSettingsFormPage = lazy(() => import("../../features/general/providerSettings/pages/ProviderSettingsFormPage"));
const LockItemPage = lazy(() => import("../../features/pos/lockItem/pages/LockItemPage"));
const PosMorePage = lazy(() => import("../../features/pos/terminal/pages/PosMorePage"));
const PosConfigurationPage = lazy(() => import("../../features/pos/terminal/pages/PosConfigurationPage"));
const DineInSelectionPage = lazy(() => import("../../features/pos/terminal/pages/DineInSelectionPage"));
const PayInOutPage = lazy(() => import("../../features/pos/payInOut/pages/PayInOutPage"));
const SalesReportPage = lazy(() => import("../../features/reports/salesReport/pages/SalesReportPage"));
const PurchaseReportPage = lazy(() => import("../../features/reports/purchaseReport/pages/PurchaseReportPage"));
const PurchaseReturnReportPage = lazy(() => import("../../features/reports/purchaseReturnReport/pages/PurchaseReturnReportPage"));
const ProductWisePurchaseReportPage = lazy(() => import("../../features/reports/productWisePurchaseReport/pages/ProductWisePurchaseReportPage"));
const StockRegisterReportPage = lazy(() => import("../../features/reports/stockRegisterReport/pages/StockRegisterReportPage"));
const ProductTransactionLogReportPage = lazy(() => import("../../features/reports/productTransactionLogReport/pages/ProductTransactionLogReportPage"));
const DailySalesReportPage = lazy(() => import("../../features/reports/dailySalesReport/pages/DailySalesReportPage"));
const AllTransactionReportPage = lazy(() => import("../../features/reports/allTransactionReport/pages/AllTransactionReportPage"));
const MonthlySalesReportPage = lazy(() => import("../../features/reports/monthlySalesReport/pages/MonthlySalesReportPage"));
const BillWiseMarginReportPage = lazy(() => import("../../features/reports/billWiseMarginReport/pages/BillWiseMarginReportPage"));
const ProductWiseMarginReportPage = lazy(() => import("../../features/reports/productWiseMarginReport/pages/ProductWiseMarginReportPage"));


const LoginRedirect = () => {
  if (window.location.search.includes("system=backoffice")) {
    sessionStorage.setItem("tempSystemType", "backoffice");
    // Clean up the URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const systemType = sessionStorage.getItem("tempSystemType") || localStorage.getItem("systemType");
  const isPos = systemType === "pos";
  const hasToken = isPos ? !!localStorage.getItem("accessToken") : !!sessionStorage.getItem("backoffice_accessToken");
  const isRegistered = !!localStorage.getItem("systemBranchId");

  if (isPos) {
    if (hasToken) {
      return <Navigate to="/pos" replace />;
    }
    if (!isRegistered) {
      return <Navigate to="/system/register" replace />;
    }
    return <Navigate to="/cashier/in" replace />;
  }
  
  if (hasToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
};


const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader fullScreen text="Loading page..." />}>
        <RegistrationGuard>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LoginRedirect />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/company/onboarding" element={<CompanyOnboardingPage />} />
            <Route path="/system/register" element={<SystemRegistrationPage />} />

            {/* Protected routes — redirects to "/" if userId not in localStorage */}
            <Route element={<SystemRegistrationGuard />}>
              {/* POS Login - Must be accessible without a session token */}
              <Route path="/cashier/in" element={<CashierInPage />} />

              <Route element={<ProtectedRoute />}>
                {/* Cashier shift pages — protected but outside dashboard layout */}
                <Route path="/cashier/out" element={<CashierOutPage />} />
                <Route path="/pos/pay-in-out" element={<PayInOutPage />} />

                {/* Main POS Screen - outside dashboard layout, fully standalone */}
                <Route element={<ShiftGuard />}>
                  <Route path="pos" element={<RoleGuard moduleName="Sales Invoice"><PosTerminalPage /></RoleGuard>} />
                  <Route path="pos/lock-item" element={<RoleGuard moduleName="Sales Invoice"><LockItemPage /></RoleGuard>} />
                  <Route path="pos/more" element={<RoleGuard moduleName="Sales Invoice"><PosMorePage /></RoleGuard>} />
                  <Route path="pos/configuration" element={<RoleGuard moduleName="Sales Invoice"><PosConfigurationPage /></RoleGuard>} />
                  <Route path="pos/dine-in" element={<RoleGuard moduleName="Sales Invoice"><DineInSelectionPage /></RoleGuard>} />
                </Route>

                {/* Dashboard — fully guarded */}
                <Route path="/dashboard" element={<MainLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="users" element={<RoleGuard moduleName="User Master"><UserList /></RoleGuard>} />
                  <Route path="user-roles" element={<RoleGuard moduleName="User Master"><UserRolePage /></RoleGuard>} />
                  <Route path="company" element={<RoleGuard moduleName="Customer Master"><CompanyPage /></RoleGuard>} />
                  <Route path="customers" element={<RoleGuard moduleName="Customer Master"><CustomerList /></RoleGuard>} />
                  <Route path="employees" element={<RoleGuard moduleName="Employee Master"><EmployeePage /></RoleGuard>} />
                  <Route path="paymodes" element={<RoleGuard moduleName="Paymode Master"><PaymodePage /></RoleGuard>} />
                  <Route path="counters" element={<RoleGuard moduleName="Counter Master"><CounterPage /></RoleGuard>} />
                  <Route path="sections" element={<RoleGuard moduleName="Section Master"><SectionPage /></RoleGuard>} />
                  <Route path="tables" element={<RoleGuard moduleName="Table Master"><TableMasterPage /></RoleGuard>} />
                  <Route path="menu-settings" element={<RoleGuard moduleName="Menu Settings"><MenuSettingsPage /></RoleGuard>} />
                  <Route path="branches" element={<RoleGuard moduleName="Branch Master"><BranchListPage /></RoleGuard>} />
                  <Route path="branches/add" element={<RoleGuard moduleName="Branch Master" action="Add"><BranchFormPage /></RoleGuard>} />
                  <Route path="branches/edit/:id" element={<RoleGuard moduleName="Branch Master" action="Edit"><BranchFormPage /></RoleGuard>} />
                  <Route path="providers" element={<RoleGuard moduleName="Provider Master"><ProviderListPage /></RoleGuard>} />
                  <Route path="providers/new" element={<RoleGuard moduleName="Provider Master" action="Add"><ProviderFormPage /></RoleGuard>} />
                  <Route path="providers/edit/:id" element={<RoleGuard moduleName="Provider Master" action="Edit"><ProviderFormPage /></RoleGuard>} />
                  <Route path="suppliers" element={<RoleGuard moduleName="Supplier Master"><SupplierList /></RoleGuard>} />
                  <Route path="categories" element={<RoleGuard moduleName="Category Master"><CategoryPage /></RoleGuard>} />
                  <Route path="sub-categories" element={<RoleGuard moduleName="Sub Category Master"><SubCategoryPage /></RoleGuard>} />
                  <Route path="groups" element={<RoleGuard moduleName="Group Master"><GroupPage /></RoleGuard>} />
                  <Route path="units" element={<RoleGuard moduleName="Unit Master"><UnitPage /></RoleGuard>} />
                  <Route path="modifiers" element={<RoleGuard moduleName="Modifier Master"><ModifierPage /></RoleGuard>} />
                  <Route path="products" element={<RoleGuard moduleName="Product Master"><ProductListPage /></RoleGuard>} />
                  <Route path="products/add" element={<RoleGuard moduleName="Product Master" action="Add"><ProductFormPage /></RoleGuard>} />
                  <Route path="products/edit/:id" element={<RoleGuard moduleName="Product Master" action="Edit"><ProductFormPage /></RoleGuard>} />
                  <Route path="voucher-series" element={<RoleGuard moduleName="Voucher Series Master"><VoucherSeriesPage /></RoleGuard>} />
                  <Route path="extras-master" element={<RoleGuard moduleName="Extras Master"><ExtrasMasterPage /></RoleGuard>} />
                  <Route path="extras-type" element={<RoleGuard moduleName="Extras Type"><ExtrasTypePage /></RoleGuard>} />
                  <Route path="modifier-type" element={<RoleGuard moduleName="Modifier Type"><ModifierTypePage /></RoleGuard>} />
                  <Route path="taxes" element={<RoleGuard moduleName="Tax Master"><TaxPage /></RoleGuard>} />
                  <Route path="purchase-invoice" element={<RoleGuard moduleName="Purchase Invoice"><PurchaseInvoiceListPage /></RoleGuard>} />
                  <Route path="purchase-invoice/new" element={<RoleGuard moduleName="Purchase Invoice"><PurchaseInvoiceFormPage /></RoleGuard>} />
                  <Route path="purchase-invoice/edit/:id" element={<RoleGuard moduleName="Purchase Invoice"><PurchaseInvoiceFormPage /></RoleGuard>} />
                  <Route path="purchase-return" element={<RoleGuard moduleName="Purchase Return"><PurchaseReturnListPage /></RoleGuard>} />
                  <Route path="purchase-return/new" element={<RoleGuard moduleName="Purchase Return"><PurchaseReturnFormPage /></RoleGuard>} />
                  <Route path="purchase-return/edit/:id" element={<RoleGuard moduleName="Purchase Return"><PurchaseReturnFormPage /></RoleGuard>} />

                  <Route path="recipes" element={<RoleGuard moduleName="Recipe Master"><RecipeListPage /></RoleGuard>} />
                  <Route path="recipe-form" element={<RoleGuard moduleName="Recipe Master"><RecipePage /></RoleGuard>} />
                  <Route path="recipe-form/:id" element={<RoleGuard moduleName="Recipe Master"><RecipePage /></RoleGuard>} />
                  <Route path="boms" element={<RoleGuard moduleName="BOM Master"><BomListPage /></RoleGuard>} />
                  <Route path="bom" element={<RoleGuard moduleName="BOM Master"><BomPage /></RoleGuard>} />
                  <Route path="production" element={<RoleGuard moduleName="Production"><ProductionPage /></RoleGuard>} />
                  <Route path="production/:id" element={<RoleGuard moduleName="Production"><ProductionPage /></RoleGuard>} />
                  <Route path="production-list" element={<RoleGuard moduleName="Production"><ProductionListPage /></RoleGuard>} />
                  <Route path="stock-adjustments" element={<RoleGuard moduleName="Stock Adjustment"><StockAdjustmentListPage /></RoleGuard>} />
                  <Route path="stock-adjustment" element={<RoleGuard moduleName="Stock Adjustment"><StockAdjustmentPage /></RoleGuard>} />
                  <Route path="internal-stock-transfers" element={<RoleGuard moduleName="Internal Stock Transfer"><InternalStockTransferListPage /></RoleGuard>} />
                  <Route path="internal-stock-transfer" element={<RoleGuard moduleName="Internal Stock Transfer"><InternalStockTransferPage /></RoleGuard>} />
                  <Route path="internal-stock-transfer/edit/:id" element={<RoleGuard moduleName="Internal Stock Transfer"><InternalStockTransferPage /></RoleGuard>} />
                  <Route path="stock-adjustment-type" element={<RoleGuard moduleName="Stock Adjustment Type"><StockAdjustmentTypePage /></RoleGuard>} />
                  <Route path="payment-against-voucher" element={<RoleGuard moduleName="Payment Against Voucher"><PaymentAgainstVoucherListPage /></RoleGuard>} />
                  <Route path="payment-against-voucher/new" element={<RoleGuard moduleName="Payment Against Voucher"><PaymentAgainstVoucherPage /></RoleGuard>} />
                  <Route path="payment-against-voucher/:id" element={<RoleGuard moduleName="Payment Against Voucher"><PaymentAgainstVoucherPage /></RoleGuard>} />
                  <Route path="receipt-against-voucher" element={<RoleGuard moduleName="Receipt Against Voucher"><ReceiptAgainstVoucherListPage /></RoleGuard>} />
                  <Route path="receipt-against-voucher/new" element={<RoleGuard moduleName="Receipt Against Voucher"><ReceiptAgainstVoucherPage /></RoleGuard>} />
                  <Route path="receipt-against-voucher/:id" element={<RoleGuard moduleName="Receipt Against Voucher"><ReceiptAgainstVoucherPage /></RoleGuard>} />
                  <Route path="payment-voucher" element={<RoleGuard moduleName="Payment Voucher"><PaymentVoucherListPage /></RoleGuard>} />
                  <Route path="payment-voucher/new" element={<RoleGuard moduleName="Payment Voucher"><PaymentVoucherFormPage /></RoleGuard>} />
                  <Route path="payment-voucher/edit/:id" element={<RoleGuard moduleName="Payment Voucher"><PaymentVoucherFormPage /></RoleGuard>} />
                  <Route path="receipt-voucher" element={<RoleGuard moduleName="Receipt Voucher"><ReceiptVoucherListPage /></RoleGuard>} />
                  <Route path="receipt-voucher/new" element={<RoleGuard moduleName="Receipt Voucher"><ReceiptVoucherFormPage /></RoleGuard>} />
                  <Route path="receipt-voucher/edit/:id" element={<RoleGuard moduleName="Receipt Voucher"><ReceiptVoucherFormPage /></RoleGuard>} />


                  <Route path="configuration" element={<RoleGuard moduleName="Configuration"><ConfigurationPage /></RoleGuard>} />
                  <Route path="backoffice-configuration" element={<RoleGuard moduleName="Configuration"><BackofficeConfigurationPage /></RoleGuard>} />
                  <Route path="provider-settings" element={<RoleGuard moduleName="Configuration"><ProviderSettingsPage /></RoleGuard>} />
                  <Route path="provider-settings/new" element={<RoleGuard moduleName="Configuration"><ProviderSettingsFormPage /></RoleGuard>} />
                  <Route path="provider-settings/edit/:id" element={<RoleGuard moduleName="Configuration"><ProviderSettingsFormPage /></RoleGuard>} />

                  <Route path="happy-hour" element={<RoleGuard moduleName="Configuration"><HappyHourPage /></RoleGuard>} />
                  <Route path="happy-hour/new" element={<RoleGuard moduleName="Configuration"><HappyHourFormPage /></RoleGuard>} />
                  <Route path="happy-hour/edit/:id" element={<RoleGuard moduleName="Configuration"><HappyHourFormPage /></RoleGuard>} />
                  
                  <Route path="reports/sales" element={<RoleGuard moduleName="Sales Report"><SalesReportPage /></RoleGuard>} />
                  <Route path="reports/purchase" element={<RoleGuard moduleName="Purchase Report"><PurchaseReportPage /></RoleGuard>} />
                  <Route path="reports/product-wise-purchase" element={<RoleGuard moduleName="Purchase Report"><ProductWisePurchaseReportPage /></RoleGuard>} />
                  <Route path="reports/stock-register" element={<RoleGuard moduleName="Purchase Report"><StockRegisterReportPage /></RoleGuard>} />
                  <Route path="reports/purchase-return" element={<RoleGuard moduleName="Purchase Return Report"><PurchaseReturnReportPage /></RoleGuard>} />
                  <Route path="reports/product-transaction-log" element={<RoleGuard moduleName="Stock Report"><ProductTransactionLogReportPage /></RoleGuard>} />
                  <Route path="reports/daily-sales" element={<RoleGuard moduleName="Sales Report"><DailySalesReportPage /></RoleGuard>} />
                  <Route path="reports/all-transaction" element={<RoleGuard moduleName="Sales Report"><AllTransactionReportPage /></RoleGuard>} />
                  <Route path="reports/monthly-sales" element={<RoleGuard moduleName="Sales Report"><MonthlySalesReportPage /></RoleGuard>} />
                  <Route path="reports/bill-wise-margin" element={<RoleGuard moduleName="Sales Report"><BillWiseMarginReportPage /></RoleGuard>} />
                  <Route path="reports/product-wise-margin" element={<RoleGuard moduleName="Sales Report"><ProductWiseMarginReportPage /></RoleGuard>} />
                </Route>

              </Route>
            </Route>
          </Routes>
        </RegistrationGuard>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;
