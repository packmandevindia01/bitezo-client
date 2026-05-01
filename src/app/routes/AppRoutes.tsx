import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader } from "../../components/common";
import RegistrationGuard from "./RegistrationGuard";
import ProtectedRoute from "./ProtectedRoute";
import SystemRegistrationGuard from "./SystemRegistrationGuard";
import { Navigate } from "react-router-dom";
import RoleGuard from "./RoleGuard";

const MainLayout = lazy(() => import("../../components/layout/MainLayout"));
const LoginPage = lazy(() => import("../../features/auth/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("../../features/auth/pages/ForgotPasswordPage"));
const VerifyOtpPage = lazy(() => import("../../features/auth/pages/VerifyOtpPage"));
const ResetPasswordPage = lazy(() => import("../../features/auth/pages/ResetPasswordPage"));
const CompanyOnboardingPage = lazy(() => import("../../features/company/pages/CompanyOnboardingPage"));
const DashboardPage = lazy(() => import("../../features/dashboard/pages/DashboardPage"));
const UserList = lazy(() => import("../../features/general/user/pages/UserList"));
const UserRolePage = lazy(() => import("../../features/general/userRole/pages/UserRolePage"));
const CustomerListPage = lazy(() => import("../../features/general/customer/pages/CustomerListPage"));
const CustomerFormPage = lazy(() => import("../../features/general/customer/pages/CustomerFormPage"));
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
const PosTerminalPage = lazy(() => import("../../features/pos/terminal/pages/PosTerminalPage"));
const EditableGridView = lazy(() => import("../../features/experimental/editable-grid/pages/EditableGridView"));
const TaxPage = lazy(() => import("../../features/inventory/tax/pages/TaxPage"));
const SystemRegistrationPage = lazy(() => import("../../features/systemRegistration/pages/SystemRegistrationPage"));
const CashierInPage = lazy(() => import("../../features/systemRegistration/pages/CashierInPage"));
const CashierOutPage = lazy(() => import("../../features/systemRegistration/pages/CashierOutPage"));
const PurchaseInvoicePage = lazy(() => import("../../features/transaction/purchaseInvoice/pages/PurchaseInvoicePage"));
const PurchaseReturnPage = lazy(() => import("../../features/transaction/purchaseReturn/pages/PurchaseReturnPage"));
const RecipePage = lazy(() => import("../../features/general/recipe/pages/RecipePage"));
const BomPage = lazy(() => import("../../features/general/bom/pages/BomPage"));
const ProductionPage = lazy(() => import("../../features/transaction/production/pages/ProductionPage"));
const StockAdjustmentPage = lazy(() => import("../../features/transaction/stockAdjustment/pages/StockAdjustmentPage"));
const ConfigurationPage = lazy(() => import("../../features/general/configuration/pages/ConfigurationPage"));
const ProviderListPage = lazy(() => import("../../features/general/provider/pages/ProviderListPage"));
const ProviderFormPage = lazy(() => import("../../features/general/provider/pages/ProviderFormPage"));
const ProviderSettingsPage = lazy(() => import("../../features/general/providerSettings/pages/ProviderSettingsList"));
const PaymentAgainstVoucherPage = lazy(() => import("../../features/transaction/paymentAgainstVoucher/pages/PaymentAgainstVoucherPage"));
const ReceiptAgainstVoucherPage = lazy(() => import("../../features/transaction/receiptAgainstVoucher/pages/ReceiptAgainstVoucherPage"));
const PaymentVoucherPage = lazy(() => import("../../features/transaction/paymentVoucher/pages/PaymentVoucherPage"));
const ReceiptVoucherPage = lazy(() => import("../../features/transaction/receiptVoucher/pages/ReceiptVoucherPage"));
const HappyHourPage = lazy(() => import("../../features/general/happyHour/pages/HappyHourPage"));


const LoginRedirect = () => {
  const isPos = localStorage.getItem("systemType") === "pos";
  const hasToken = !!localStorage.getItem("accessToken");
  const activeShiftRaw = localStorage.getItem("activeShift");
  let hasOpenShift = false;

  if (activeShiftRaw) {
    try {
      const shift = JSON.parse(activeShiftRaw);
      hasOpenShift = shift?.status === "open";
    } catch {
      hasOpenShift = false;
    }
  }
  
  if (isPos) {
    if (hasToken && hasOpenShift) {
      return <Navigate to="/pos" replace />;
    }
    // If we have a token but no shift, go to cashier/in
    // If we have no token, go to cashier/in
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

                {/* Main POS Screen - outside dashboard layout, fully standalone */}
                <Route path="pos" element={<RoleGuard moduleName="Sales Invoice"><PosTerminalPage /></RoleGuard>} />


                {/* Dashboard — fully guarded */}
                <Route path="/dashboard" element={<MainLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="users" element={<RoleGuard moduleName="User Master"><UserList /></RoleGuard>} />
                  <Route path="user-roles" element={<RoleGuard moduleName="User Master"><UserRolePage /></RoleGuard>} />
                  <Route path="customers" element={<RoleGuard moduleName="Customer Master"><CustomerListPage /></RoleGuard>} />
                  <Route path="customers/new" element={<RoleGuard moduleName="Customer Master" action="Add"><CustomerFormPage /></RoleGuard>} />
                  <Route path="employees" element={<RoleGuard moduleName="Employee Master"><EmployeePage /></RoleGuard>} />
                  <Route path="paymodes" element={<RoleGuard moduleName="Paymode Master"><PaymodePage /></RoleGuard>} />
                  <Route path="counters" element={<RoleGuard moduleName="Counter Master"><CounterPage /></RoleGuard>} />
                  <Route path="sections" element={<RoleGuard moduleName="Section Master"><SectionPage /></RoleGuard>} />
                  <Route path="tables" element={<RoleGuard moduleName="Table Master"><TableMasterPage /></RoleGuard>} />
                  <Route path="branches" element={<RoleGuard moduleName="Branch Master"><BranchListPage /></RoleGuard>} />
                  <Route path="branches/add" element={<RoleGuard moduleName="Branch Master" action="Add"><BranchFormPage /></RoleGuard>} />
                  <Route path="branches/edit/:id" element={<RoleGuard moduleName="Branch Master" action="Edit"><BranchFormPage /></RoleGuard>} />
                  <Route path="providers" element={<RoleGuard moduleName="Provider Master"><ProviderListPage /></RoleGuard>} />
                  <Route path="providers/new" element={<RoleGuard moduleName="Provider Master" action="Add"><ProviderFormPage /></RoleGuard>} />
                  <Route path="providers/edit/:id" element={<RoleGuard moduleName="Provider Master" action="Edit"><ProviderFormPage /></RoleGuard>} />
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
                  <Route path="purchase-invoice" element={<RoleGuard moduleName="Purchase Invoice"><PurchaseInvoicePage /></RoleGuard>} />
                  <Route path="purchase-return" element={<RoleGuard moduleName="Purchase Return"><PurchaseReturnPage /></RoleGuard>} />
                  <Route path="test/editable-grid" element={<EditableGridView />} />
                  <Route path="recipes" element={<RoleGuard moduleName="Recipe Master"><RecipePage /></RoleGuard>} />
                  <Route path="bom" element={<RoleGuard moduleName="BOM Master"><BomPage /></RoleGuard>} />
                  <Route path="production" element={<RoleGuard moduleName="Production"><ProductionPage /></RoleGuard>} />
                  <Route path="stock-adjustment" element={<RoleGuard moduleName="Stock Adjustment"><StockAdjustmentPage /></RoleGuard>} />
                  <Route path="payment-against-voucher" element={<RoleGuard moduleName="Payment Against Voucher"><PaymentAgainstVoucherPage /></RoleGuard>} />
                  <Route path="receipt-against-voucher" element={<RoleGuard moduleName="Receipt Against Voucher"><ReceiptAgainstVoucherPage /></RoleGuard>} />
                  <Route path="payment-voucher" element={<RoleGuard moduleName="Payment Voucher"><PaymentVoucherPage /></RoleGuard>} />
                  <Route path="receipt-voucher" element={<RoleGuard moduleName="Receipt Voucher"><ReceiptVoucherPage /></RoleGuard>} />


                  <Route path="configuration" element={<RoleGuard moduleName="Configuration"><ConfigurationPage /></RoleGuard>} />
                  <Route path="provider-settings" element={<RoleGuard moduleName="Configuration"><ProviderSettingsPage /></RoleGuard>} />
                  <Route path="happy-hour" element={<RoleGuard moduleName="Configuration"><HappyHourPage /></RoleGuard>} />
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
