import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader } from "../../components/common";
import { useAppDispatch } from "../hooks";
import { logout } from "../../features/auth/store/authSlice";

/**
 * Routes that are always accessible regardless of onboarding state.
 * The onboarding page itself is always reachable.
 */
const SKIP_CHECK_ROUTES = [
  "/company/onboarding",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
];

/**
 * RegistrationGuard — controls first-time device onboarding.
 *
 * Flow:
 *  1. New device (no localStorage flag)
 *       → Redirect to /company/onboarding
 *       → Onboarding handles: OTP → check company → create if needed → Login
 *
 *  2. Device that has completed onboarding before (flag set in localStorage)
 *       → Allow through to Login (or Dashboard if already logged in)
 *
 * The guard does NOT call any API — the masterload check is handled
 * inside CompanyOnboardingPage during the OTP verification flow.
 */

interface Props {
  children: React.ReactNode;
}

const RegistrationGuard = ({ children }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [checking, setChecking] = useState(true);

  // ── Global 401 Interceptor Listener ───────────────────────────────────────
  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logout());
      navigate("/", { replace: true });
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [dispatch, navigate]);

  useEffect(() => {
    // These routes bypass the guard entirely
    if (SKIP_CHECK_ROUTES.includes(location.pathname)) {
      setChecking(false);
      return;
    }

    // Fast path 1: active session → already logged in, definitely allow through
    const hasToken = !!localStorage.getItem("accessToken");
    if (hasToken) {
      if (localStorage.getItem("companyRegistered") !== "true") {
        localStorage.setItem("companyRegistered", "true");
      }
      setChecking(false);
      return;
    }

    // Fast path 2: onboarding completed on this device before → go to login
    const onboardingDone = localStorage.getItem("companyRegistered") === "true";
    if (onboardingDone) {
      setChecking(false);
      return;
    }

    // New device — send to onboarding (no API call needed here)
    navigate("/company/onboarding", { replace: true });
    setChecking(false);
  }, [location.pathname, navigate]);

  if (checking) {
    return <Loader fullScreen text="Loading..." />;
  }

  return <>{children}</>;
};

export default RegistrationGuard;