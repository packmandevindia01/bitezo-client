import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader } from "../components/common";

const MainLayout = lazy(() => import("../components/layout/MainLayout"));
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("../features/auth/pages/ForgotPasswordPage"));
const VerifyOtpPage = lazy(() => import("../features/auth/pages/VerifyOtpPage"));
const ResetPasswordPage = lazy(() => import("../features/auth/pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const UserList = lazy(() => import("../features/user/pages/UserList"));
const CustomerListPage = lazy(() => import("../features/customer/pages/CustomerListPage"));
const CustomerFormPage = lazy(() => import("../features/customer/pages/CustomerFormPage"));
const EmployeePage = lazy(() => import("../features/employee/pages/EmployeePage"));
const BranchCreationPage = lazy(() => import("../features/branches/pages/BranchCreationPage"));
const CategoryPage = lazy(() => import("../features/category/pages/CategoryPage"));
const SubCategoryPage = lazy(() => import("../features/subcategory/pages/SubCategoryPage"));
const GroupPage = lazy(() => import("../features/group/pages/GroupPage"));
const UnitPage = lazy(() => import("../features/unit/pages/UnitPage"));
const ModifierPage = lazy(() => import("../features/modifier/pages/ModifierPage"));
const ProductPage = lazy(() => import("../features/product/pages/ProductPage"));
const VoucherSeriesPage = lazy(() => import("../features/voucherSeries/pages/VoucherSeriesPage"));
const ExtrasMasterPage = lazy(() => import("../features/extrasMaster/pages/ExtrasMasterPage"));
const ExtrasTypePage = lazy(() => import("../features/extrasType/pages/ExtrasTypePage"));
const ModifierTypePage = lazy(() => import("../features/modifierType/pages/ModifierTypePage"));

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader fullScreen text="Loading page..." />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          <Route path="/dashboard" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UserList />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="employees" element={<EmployeePage />} />
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
          </Route>

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;
