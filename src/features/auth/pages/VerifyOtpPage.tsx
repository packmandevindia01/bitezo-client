import { useNavigate, useLocation } from "react-router-dom";
import OtpForm from "../components/OtpForm";

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const handleVerifyOtp = (otp: string) => {
    console.log("Verify OTP:", otp, "for email:", email);

    // 🔥 replace with API later
    navigate("/reset-password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-300">

        <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-[#49293e]">
          Verify OTP
        </h2>

        {/* Optional: show email */}
        {email && (
          <p className="text-sm text-gray-600 text-center mb-4">
            OTP sent to <span className="font-medium">{email}</span>
          </p>
        )}

        <OtpForm onSubmit={handleVerifyOtp} />

      </div>
    </div>
  );
};

export default VerifyOtpPage;