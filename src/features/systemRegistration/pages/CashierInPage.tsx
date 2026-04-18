import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TouchNumpad } from "../../../components/common";
import { useToast } from "../../../app/providers/useToast";
import { useCashierShift } from "../hooks/useCashierShift";

const CashierInPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { openShift } = useCashierShift();

  const [password, setPassword] = useState("");

  const handlePasswordSubmit = () => {
    // Demo validation – replace with actual API when backend supports it
    if (password === "1234") {
      // Automatically open shift with default values to satisfy the routing guard
      openShift({ openingCash: 0, notes: "" });
      showToast("Cashier logged in successfully!", "success");
      navigate("/dashboard", { replace: true });
    } else {
      showToast("Invalid password. For demo, use 1234", "error");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#49293e]">Cashier Login</h1>
          <p className="text-slate-500 text-sm mt-1">Please enter your PIN to continue</p>
        </div>
        
        <TouchNumpad 
          title="ENTER PIN" 
          isPassword 
          value={password} 
          onChange={setPassword} 
          onSubmit={handlePasswordSubmit}
        />
      </div>
    </div>
  );
};

export default CashierInPage;

