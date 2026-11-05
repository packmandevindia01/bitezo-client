import { useNavigate } from "react-router-dom";
import { AutoScaleWrapper } from "../../../components/common";

/**
 * There is no self-service password reset on the backend yet. The old email → OTP → reset screens were
 * mock-ups that claimed "Password reset successful" without calling any API, so users believed their
 * password had changed. Until a reset API exists, explain the real process: an administrator changes
 * the password in Back Office → Users (PATCH /user/{id}/change-password).
 */
const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <AutoScaleWrapper className="w-full max-w-md flex flex-col justify-center items-center">
        <div className="w-full bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-300 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-[#49293e]">Forgot Password</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            Passwords are reset by your administrator.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            Ask your manager or administrator to set a new password for you in{" "}
            <span className="font-semibold text-[#49293e]">Back Office → Users → Change Password</span>,
            then sign in with the new password.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full h-11 rounded-lg bg-[#49293e] hover:bg-[#3a2031] text-white font-semibold transition-colors"
          >
            Back to Login
          </button>
        </div>
      </AutoScaleWrapper>
    </div>
  );
};

export default ForgotPasswordPage;
