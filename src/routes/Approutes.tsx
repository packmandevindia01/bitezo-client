import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "../features/auth/pages/LoginPage";
import MainLayout from "../components/layout/MainLayout";


import CompanyRegistrationPage from "../features/company/pages/CompanyRegistrationPage";
import UserCreationPage from "../features/user/pages/UserCreationPage"; // ✅ FIXED
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage";
import VerifyOtpPage from "../features/auth/pages/VerifyOtpPage";
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage";
import UserList from "../features/user/pages/UserList";
/* import ProtectedRoute from "./ProtectedRoute"; */
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import BranchCreationPage from "../features/branches/pages/BranchCreationPage";


const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/" element={<LoginPage />} />

        {/* <Route element={<ProtectedRoute />}> */}
          <Route path="/dashboard" element={<MainLayout />}>

            <Route index element={<DashboardPage />} />
            <Route path="create-company" element={<CompanyRegistrationPage />} />
            <Route path="create-branch" element={<BranchCreationPage />} />

            <Route path="users" element={<UserList />} />
            <Route path="user/create" element={<UserCreationPage />} />

          </Route>
        {/* </Route> */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;