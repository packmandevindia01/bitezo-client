import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Loader } from "../../components/common";

/**
 * Routes that bypass the system registration guard entirely.
 * (Note: We removed /cashier/* because we want the guard to protect them from Back Office)
 */
const SKIP_ROUTES = [
  "/system/register",
  "/company/onboarding",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
  "/",
];

interface Props {
  children?: React.ReactNode;
}

/**
 * SystemRegistrationGuard — runs after ProtectedRoute.
 *
 * System type is chosen during onboarding (Step 3).
 * This guard enforces:
 *  1. Edge case: no systemType found → redirect to /system/register
 *  2. Back Office → blocks access to POS & Cashier routes
 *  3. POS device + no open shift → lock to /cashier/in
 *  4. POS device + open shift → lock to /pos & /cashier/out
 */
const SystemRegistrationGuard = ({ children }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (SKIP_ROUTES.some((r) => location.pathname === r)) {
      setChecking(false);
      return;
    }

    const systemType = localStorage.getItem("systemType");

    if (!systemType) {
      navigate("/system/register", { replace: true });
      setChecking(false);
      return;
    }

    // --- Back Office Rules ---
    if (systemType === "backoffice") {
      if (location.pathname.startsWith("/pos") || location.pathname.startsWith("/cashier")) {
        navigate("/dashboard", { replace: true });
      } else {
        setChecking(false);
      }
      return;
    }

    // --- POS Terminal Rules ---
    if (systemType === "pos") {
      // Rule 1: No Dashboard allowed for POS
      if (location.pathname.startsWith("/dashboard")) {
        navigate("/pos", { replace: true });
        return;
      }

      // Check shift status
      let hasOpenShift = false;
      try {
        const raw = localStorage.getItem("activeShift");
        const shift = raw ? JSON.parse(raw) : null;
        if (shift && shift.status === "open") hasOpenShift = true;
      } catch {}

      if (!hasOpenShift) {
        // Must go to Cashier In
        if (location.pathname !== "/cashier/in") {
          navigate("/cashier/in", { replace: true });
        } else {
          setChecking(false);
        }
        return;
      } else {
        // Shift is open. Cannot go to Cashier In.
        if (location.pathname === "/cashier/in") {
          navigate("/pos", { replace: true });
        } else {
          setChecking(false);
        }
        return;
      }
    }

    setChecking(false);
  }, [location.pathname, navigate]);

  if (checking) {
    return <Loader fullScreen text="Loading…" />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default SystemRegistrationGuard;

