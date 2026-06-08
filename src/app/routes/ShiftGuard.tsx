import { Navigate, Outlet } from "react-router-dom";
import { useCashierLog } from "../../features/pos/cashier/hooks/useCashierLog";
import { Loader } from "../../components/common";

const ShiftGuard = () => {
  const { status, isLoading, isSessionOpen } = useCashierLog();

  if (isLoading) {
    return <Loader fullScreen text="Verifying shift status..." />;
  }

  // If the status has been loaded and the session is NOT open,
  // redirect them to CashierOutPage which hosts the CashierSessionPage
  // so they can formally Open a Day or Open a Shift.
  if (status && !isSessionOpen) {
    return <Navigate to="/cashier/out" replace />;
  }

  // If session is open, or we somehow don't have status (fail-safe), proceed
  return <Outlet />;
};

export default ShiftGuard;
