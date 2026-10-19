import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../hooks";
import { logout } from "../../features/auth/store/authSlice";

const SKIP_CHECK_ROUTES = [
  "/",
  "/cashier/in",
  "/company/onboarding",
  "/system/register",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
];

interface Props {
  children: React.ReactNode;
}

const RegistrationGuard = ({ children }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logout());
      const isLoginPath = window.location.pathname === "/" || window.location.pathname.includes("/login") || window.location.pathname === "/cashier/in";
      if (!isLoginPath) {
        window.location.replace("/");
      }
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [dispatch, navigate]);

  const hasToken = !!localStorage.getItem("accessToken");
  const onboardingDone = localStorage.getItem("companyRegistered") === "true";

  useEffect(() => {
    if (hasToken && !onboardingDone) {
      localStorage.setItem("companyRegistered", "true");
    }
  }, [hasToken, onboardingDone]);

  const canSkipCheck = SKIP_CHECK_ROUTES.includes(location.pathname);
  if (!canSkipCheck && !hasToken && !onboardingDone) {
    return <Navigate to="/company/onboarding" replace />;
  }

  return <>{children}</>;
};

export default RegistrationGuard;
