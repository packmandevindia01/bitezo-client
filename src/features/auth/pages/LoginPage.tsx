import { useLocation } from "react-router-dom";
import LoginForm from "../components/LoginForm";

const LoginPage = () => {
  const location = useLocation();
  const onboardingState = location.state as
    | { username?: string; password?: string; message?: string }
    | undefined;

  const systemType = sessionStorage.getItem("tempSystemType") || localStorage.getItem("systemType");
  const isPos = systemType === "pos";
  const loginImage = isPos ? "/backoffice_logo.png" : "/pos_logo1.png";

  return (
    <div className="min-h-screen w-full flex flex-col md:grid md:grid-cols-2">

      {/* LEFT SIDE (IMAGE) */}
      <div className="relative w-full h-48 md:h-full bg-[#1a0f18] flex-none md:flex-1">
        <img 
          src={loginImage}
          alt={isPos ? "Bitezo POS" : "Bitezo Backoffice"} 
          className="absolute inset-0 w-full h-full object-cover object-left"
        />
      </div>

      {/* RIGHT SIDE (FORM) */}
      <div className="flex items-center justify-center bg-white px-4 py-8">
        <div className="w-full max-w-md">
          {onboardingState?.message && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {onboardingState.message}
              {onboardingState.username && (
                <div className="mt-2 font-medium">
                  Username: {onboardingState.username} | Password: {onboardingState.password || "1"}
                </div>
              )}
            </div>
          )}
          <LoginForm />
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
