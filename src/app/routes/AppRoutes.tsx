import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader } from "../../components/common";
import RegistrationGuard from "./RegistrationGuard";
import ProtectedRoute from "./ProtectedRoute";

const MainLayout = lazy(() => import("../../components/layout/MainLayout"));
const LoginPage = lazy(() => import("../../features/auth/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("../../features/auth/pages/ForgotPasswordPage"));
const VerifyOtpPage = lazy(() => import("../../features/auth/pages/VerifyOtpPage"));
const ResetPasswordPage = lazy(() => import("../../features/auth/pages/ResetPasswordPage"));
const CompanyOnboardingPage = lazy(() => import("../../features/company/pages/CompanyOnboardingPage"));
const DashboardPage = lazy(() => import("../../features/dashboard/pages/DashboardPage"));
const UserList = lazy(() => import("../../features/general/user/pages/UserList"));
const CustomerListPage = lazy(() => import("../../features/general/customer/pages/CustomerListPage"));
const CustomerFormPage = lazy(() => import("../../features/general/customer/pages/CustomerFormPage"));
const EmployeePage = lazy(() => import("../../features/general/employee/pages/EmployeePage"));
const BranchCreationPage = lazy(() => import("../../features/inventory/branches/pages/BranchCreationPage"));
const CategoryPage = lazy(() => import("../../features/inventory/category/pages/CategoryPage"));
const SubCategoryPage = lazy(() => import("../../features/inventory/subcategory/pages/SubCategoryPage"));
const GroupPage = lazy(() => import("../../features/inventory/group/pages/GroupPage"));
const UnitPage = lazy(() => import("../../features/inventory/unit/pages/UnitPage"));
const ModifierPage = lazy(() => import("../../features/inventory/modifier/pages/ModifierPage"));
const ProductPage = lazy(() => import("../../features/inventory/product/pages/ProductPage"));
const VoucherSeriesPage = lazy(() => import("../../features/inventory/voucherSeries/pages/VoucherSeriesPage"));
const ExtrasMasterPage = lazy(() => import("../../features/inventory/extrasMaster/pages/ExtrasMasterPage"));
const ExtrasTypePage = lazy(() => import("../../features/inventory/extrasType/pages/ExtrasTypePage"));
const ModifierTypePage = lazy(() => import("../../features/inventory/modifierType/pages/ModifierTypePage"));
const PaymodePage = lazy(() => import("../../features/general/paymode/pages/PaymodePage"));
const CounterPage = lazy(() => import("../../features/general/counter/pages/CounterPage"));
const SectionPage = lazy(() => import("../../features/general/section/pages/SectionPage"));
const TableMasterPage = lazy(() => import("../../features/general/tableMaster/pages/TableMasterPage"));
const PosTerminalPage = lazy(() => import("../../features/pos/pages/PosTerminalPage"));
const EditableGridView = lazy(() => import("../../features/experimental/editable-grid/pages/EditableGridView"));

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader fullScreen text="Loading page..." />}>
        <RegistrationGuard>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/company/onboarding" element={<CompanyOnboardingPage />} />

            {/* Protected routes — redirects to "/" if userId not in localStorage */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<MainLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="users" element={<UserList />} />
                <Route path="customers" element={<CustomerListPage />} />
                <Route path="customers/new" element={<CustomerFormPage />} />
                <Route path="employees" element={<EmployeePage />} />
                <Route path="paymodes" element={<PaymodePage />} />
                <Route path="counters" element={<CounterPage />} />
                <Route path="sections" element={<SectionPage />} />
                <Route path="tables" element={<TableMasterPage />} />
                <Route path="pos-terminal" element={<PosTerminalPage />} />
                <Route path="branches" element={<BranchCreationPage />} />
                <Route path="categories" element={<CategoryPage />} />
                <Route path="sub-categories" element={<SubCategoryPage />} />
                <Route path="groups" element={<GroupPage />} />
                <Route path="units" element={<UnitPage />} />
                <Route path="modifiers" element={<ModifierPage />} />
                <Route path="products" element={<ProductPage />} />
                <Route path="voucher-series" element={<VoucherSeriesPage />} />
                <Route path="extras-master" element={<ExtrasMasterPage />} />
                <Route path="extras-type" element={<ExtrasTypePage />} />
                <Route path="modifier-type" element={<ModifierTypePage />} />
                <Route path="test/editable-grid" element={<EditableGridView />} />
              </Route>
            </Route>
          </Routes>
        </RegistrationGuard>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;