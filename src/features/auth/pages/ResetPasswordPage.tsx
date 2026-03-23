import { useNavigate } from "react-router-dom";
import ResetPasswordForm from "../components/ResetPasswordForm";

const ResetPasswordPage = () => {
  const navigate = useNavigate();

  const handleReset = (password: string) => {
    console.log("New Password:", password);

    // 🔥 replace with API later

    alert("Password reset successful");

    navigate("/"); // go to login
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-300">

        <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-[#49293e]">
          Reset Password
        </h2>

        <ResetPasswordForm onSubmit={handleReset} />

      </div>
    </div>
  );
};

export default ResetPasswordPage;