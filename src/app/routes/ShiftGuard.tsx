import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCashierLog } from "../../features/pos/cashier/hooks/useCashierLog";
import { Loader } from "../../components/common";

const ShiftGuard = () => {
  const { status, isLoading, isSessionOpen } = useCashierLog();
  const location = useLocation();

  if (isLoading) {
    return <Loader fullScreen text="Verifying shift status..." />;
  }

  // If the status has been loaded and the session is NOT open,
  // redirect them to /pos so they can formally Open a Day or Open a Shift using the modal overlay.
  // We must ensure they aren't already at /pos to avoid an infinite redirect loop.
  if (status && !isSessionOpen && location.pathname !== "/pos") {
    return <Navigate to="/pos" replace />;
  }

  // If session is open, or we somehow don't have status (fail-safe), proceed
  return <Outlet />;
};

export default ShiftGuard;
