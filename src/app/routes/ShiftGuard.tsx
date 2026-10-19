import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCashierLog } from "../../features/pos/cashier/hooks/useCashierLog";
import { Loader } from "../../components/common";

const ShiftGuard = () => {
  const { status, isLoading, isSessionOpen } = useCashierLog();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullScreen text="Verifying shift status..." />;
  }

  // Routes accessible prior to opening a shift or business day (Configuration & Printer Hardware setup)
  const isPreSessionAllowed =
    location.pathname === "/pos" ||
    location.pathname.startsWith("/pos/configuration") ||
    location.pathname.startsWith("/pos/more");

  // If the status has been loaded and the session is NOT open,
  // redirect non-exempt routes to /pos so they can formally Open a Day or Open a Shift using the modal overlay.
  if (status && !isSessionOpen && !isPreSessionAllowed) {
    return <Navigate to="/pos" replace />;
  }

  // If session is open, or we somehow don't have status (fail-safe), proceed
  return <Outlet />;
};

export default ShiftGuard;
