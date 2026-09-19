import { useState } from "react";
import { useLocation } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import { AutoScaleWrapper } from "../../../components/common";

const LoginPage = () => {
  const location = useLocation();
  const onboardingState = location.state as
    | { username?: string; password?: string; message?: string }
    | undefined;

  const [noticeMessage] = useState<string | null>(() => {
    const msg = sessionStorage.getItem("loginNoticeMessage");
    if (msg) {
      sessionStorage.removeItem("loginNoticeMessage");
      return msg;
    }
    return null;
  });

  const displayMessage = onboardingState?.message || noticeMessage;

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
      <div className="flex items-center justify-center bg-gray-50/50 px-6 py-10 md:px-12">
        <AutoScaleWrapper className="w-full max-w-lg flex flex-col justify-center items-center">
          <div className="w-full">
          {displayMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-base text-emerald-800 shadow-sm">
              {displayMessage}
              {onboardingState?.username && (
                <div className="mt-2 font-medium">
                  Username: {onboardingState.username} | Password: {onboardingState.password || "1"}
                </div>
              )}
            </div>
          )}
          <LoginForm />
          </div>
        </AutoScaleWrapper>
      </div>

    </div>
  );
};

export default LoginPage;
