import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TouchNumpad from "../../../../components/common/TouchNumpad";
import { posLoginApi } from "../../../../features/auth/services/authApi";
import { cashierLogService } from "../services/cashierLogService"; // Import directly for status check
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch } from "../../../../app/hooks";
import { setCredentials } from "../../../../features/auth/store/authSlice";

const CashierInPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Get terminal settings from localStorage
  const branchId = Number(localStorage.getItem("systemBranchId")) || 0;
  const counterId = Number(localStorage.getItem("systemCounterId")) || 0;
  const clientDb = localStorage.getItem("tenantId") || "app_db";

  const handleLogin = async () => {
    if (!pin) {
      showToast("Please enter your PIN", "warning");
      return;
    }

    if (!branchId || !counterId) {
      showToast("Terminal not registered. Please register first.", "error");
      navigate("/system/register");
      return;
    }

    setLoading(true);
    try {
      const data = await posLoginApi(pin, branchId, counterId);

      if (data?.accessToken && data?.user?.userId) {
        // Store auth data
        localStorage.setItem("userId", String(data.user.userId));
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("userName", data.user.userName);
        localStorage.setItem("isMaster", String(Boolean(data.user.isMaster)));
        
        if (data.userRoles) {
          localStorage.setItem("userRoles", JSON.stringify(data.userRoles));
        }

        const decimalPart = data.company?.decimalPart ?? 2;
        const currencySymbol = data.company?.currencySymbol ?? "BHD";
        localStorage.setItem("decimalPart", String(decimalPart));
        localStorage.setItem("currencySymbol", currencySymbol);

        // Update Redux state
        dispatch(
          setCredentials({
            tenantId: clientDb,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            userId: data.user.userId,
            userName: data.user.userName,
            isMaster: Boolean(data.user.isMaster),
            userRoles: data.userRoles ?? [],
            decimalPart,
            currencySymbol,
          })
        );

        showToast("Login successful", "success");

        // ── Pre-fetch cashier status to determine next screen ──
        try {
          const statusResponse = await cashierLogService.checkStatus(branchId, counterId);
          const st = statusResponse.cashierInStatus;
          console.log("[CashierInPage] Status check:", st);
          
          // If both are open, mark the shift as active in localStorage for the guard
          if (st && !st.isDayClosed && !st.isShiftClosed) {
            localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: st.dayId, shiftId: st.shiftId }));
          } else {
            localStorage.removeItem("activeShift");
          }
        } catch (err) {
          console.error("Post-login status check failed:", err);
        }


        navigate("/pos", { replace: true });
      } else {
        showToast("Invalid PIN. Please try again.", "warning");
        setPin("");
      }
    } catch (error: any) {
      console.error("POS Login Error:", error);
      const message = error.response?.status === 401 
        ? "Incorrect PIN" 
        : (error.message || "Login failed");
      showToast(message, "error");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // After login success, the handleLogin function redirects to /pos.
  // We no longer render CashierSessionPage directly here.

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <TouchNumpad
        title="POS TERMINAL LOGIN"
        value={pin}
        onChange={setPin}
        onSubmit={handleLogin}
        isPassword={true}
        disabled={loading}
      />
      
      <button 
        onClick={() => navigate("/system/register")}
        className="mt-6 text-slate-400 hover:text-slate-600 transition flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
      >
        <span>Change Terminal Settings</span>
      </button>
    </div>
  );
};

export default CashierInPage;