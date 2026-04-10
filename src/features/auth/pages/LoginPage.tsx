import { Link, useLocation } from "react-router-dom";
import LoginForm from "../components/LoginForm";

const LoginPage = () => {
  const location = useLocation();
  const onboardingState = location.state as
    | { username?: string; password?: string; message?: string }
    | undefined;

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2">

      {/* LEFT SIDE (IMAGE) */}
      <div className="hidden md:flex items-center justify-center bg-gray-200 p-6">
        <div className="w-full max-w-md h-75 md:h-[80%] border-2 border-orange-400 rounded-3xl flex items-center justify-center">
          IMAGE
        </div>
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
          <p className="mt-4 text-center text-sm text-slate-500">
            New customer not registered yet?{" "}
            <Link to="/company/onboarding" className="font-semibold text-[#49293e] hover:underline">
              Start onboarding
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
