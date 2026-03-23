import { useNavigate } from "react-router-dom";
import EmailForm from "../components/EmailForm";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const handleEmailSubmit = (email: string) => {
    console.log("Send OTP to:", email);

    // 🔥 later replace with API
    navigate("/verify-otp", { state: { email } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-300">

        <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-[#49293e]">
          Forgot Password
        </h2>

        <EmailForm onSubmit={handleEmailSubmit} />

      </div>
    </div>
  );
};

export default ForgotPasswordPage;