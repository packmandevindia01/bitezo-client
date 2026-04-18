import { useEffect, useMemo, useState } from "react";
import { Mail, ShieldCheck, UserRoundPlus, Monitor, LayoutGrid } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, FormInput } from "../../../components/common";
import OtpInput from "../../auth/components/OtpInput";
import { useToast } from "../../../app/providers/useToast";
import CompanyForm from "../components/CompanyForm";
import { checkCompanyExists, fetchCompanyRegistration, sendCompanyOtp, verifyCompanyOtp } from "../services/companyOnboardingApi";
import type { CompanyOnboardingState } from "../types";
import { isValidEmail } from "../../../lib/validators";
import type { SystemType } from "../../systemRegistration/types";
import { useAppDispatch } from "../../../app/hooks";
import { setCredentials } from "../../auth/store/authSlice";

type OnboardingStage = "identify" | "verify" | "system-type" | "form";

const initialState: CompanyOnboardingState = {
  regId: "",
  email: "",
  otp: ["", "", "", "", "", ""],
  otpToken: "",
};

const CompanyOnboardingPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [stage, setStage] = useState<OnboardingStage>("identify");
  const [formState, setFormState] = useState(initialState);
  const [errors, setErrors] = useState({ regId: "", email: "", otp: "" });
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [formNotice, setFormNotice] = useState("");
  const [clientDatabase, setClientDatabase] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [systemType, setSystemType] = useState<SystemType>("pos");

  useEffect(() => {
    if (stage !== "verify" || timer <= 0) return;
    const timeout = window.setTimeout(() => {
      setTimer((current) => current - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [stage, timer]);

  const otpValue = useMemo(() => formState.otp.join(""), [formState.otp]);

  const setField = <K extends keyof CompanyOnboardingState>(
    key: K,
    value: CompanyOnboardingState[K]
  ) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const validateIdentity = () => {
    const nextErrors = { regId: "", email: "", otp: "" };

    if (!formState.regId.trim()) {
      nextErrors.regId = "Registration ID is required";
    }

    if (!formState.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!isValidEmail(formState.email.trim())) {
      nextErrors.email = "Enter a valid email";
    }

    setErrors(nextErrors);
    return !nextErrors.regId && !nextErrors.email;
  };

  const handleSendOtp = async () => {
    if (!validateIdentity()) {
      showToast("Please enter a valid registration ID and email", "error");
      return;
    }

    try {
      setLoading(true);
      await sendCompanyOtp(formState.regId.trim(), formState.email.trim());
      setStage("verify");
      setTimer(30);
      showToast("OTP sent successfully", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send OTP";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const setupPosSession = (db: string) => {
    localStorage.setItem("companyRegistered", "true");
    dispatch(
      setCredentials({
        tenantId: db,
        accessToken: "pos-terminal-session",
        refreshToken: "pos-terminal-refresh",
        userId: "pos-terminal",
        userName: "POS Terminal",
        isMaster: false,
      })
    );
    
    // Write directly to local storage to bypass React lifecycle racing
    localStorage.setItem("tenantId", db);
    localStorage.setItem("accessToken", "pos-terminal-session");
    localStorage.setItem("refreshToken", "pos-terminal-refresh");
    localStorage.setItem("userId", "pos-terminal");
    localStorage.setItem("userName", "POS Terminal");
    localStorage.setItem("isMaster", "false");

    showToast("POS Terminal Registered! Opening system...", "success");
    navigate("/cashier/in", { replace: true });
  };

  const handlePostOtpFlow = async (otpToken: string) => {
    const registration = await fetchCompanyRegistration(
      { regId: formState.regId.trim(), email: formState.email.trim() },
      otpToken
    );

    const clientDb = registration.database?.trim() ?? "";
    const token = registration.tempToken ?? "";

    setClientDatabase(clientDb);
    setTempToken(token);

    if (!clientDb) {
      setFormNotice(
        registration.message || "No client database found. Continue to create the company."
      );
      setStage("form");
      return;
    }

    const companyCheck = await checkCompanyExists(clientDb, formState.regId.trim());

    if (companyCheck.exists) {
      if (systemType === "pos") {
        setupPosSession(clientDb);
        return;
      }
      
      showToast(
        companyCheck.data?.name
          ? `Company "${companyCheck.data.name}" is already registered. Redirecting to login…`
          : companyCheck.message || "Company already registered. Redirecting to login…",
        "success"
      );
      localStorage.setItem("companyRegistered", "true");
      setTimeout(() => navigate("/", { replace: true }), 1500);
      return;
    }

    setFormNotice(
      companyCheck.message ||
        `Client database "${clientDb}" is ready. Complete the form to create your company.`
    );
    setStage("form");
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setErrors((current) => ({ ...current, otp: "Enter the complete 6-digit OTP" }));
      return;
    }

    try {
      setLoading(true);
      setErrors((current) => ({ ...current, otp: "" }));

      const verification = await verifyCompanyOtp(
        formState.regId.trim(),
        formState.email.trim(),
        otpValue
      );

      if (!verification.otpToken) {
        throw new Error("OTP verified, but no token was returned by the server.");
      }

      setField("otpToken", verification.otpToken);
      showToast("OTP verified! Now choose your system type.", "success");

      // ── Go to system-type step before post-OTP flow ──
      setStage("system-type");
    } catch (error) {
      const message = error instanceof Error ? error.message : "OTP verification failed";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSystemType = async () => {
    // Save system type to localStorage before proceeding
    localStorage.setItem("systemType", systemType);

    try {
      setLoading(true);
      await handlePostOtpFlow(formState.otpToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setLoading(true);
      await sendCompanyOtp(formState.regId.trim(), formState.email.trim());
      setField("otp", ["", "", "", "", "", ""]);
      setErrors((current) => ({ ...current, otp: "" }));
      setTimer(30);
      showToast("OTP resent successfully", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend OTP";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { Icon: Mail,          step: "Step 1", label: "Enter registration ID and email" },
    { Icon: ShieldCheck,   step: "Step 2", label: "Verify OTP and validate access" },
    { Icon: Monitor,       step: "Step 3", label: "Choose system type (POS or Back Office)" },
    { Icon: UserRoundPlus, step: "Step 4", label: "Complete the company registration form" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* ── Sidebar ── */}
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#49293e] via-[#5c3450] to-[#7b556c] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
            Customer Onboarding
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Verify and Create Company</h1>
          <p className="mt-4 text-sm leading-6 text-white/80">
            This flow validates your email with an OTP, sets up this device as POS or Back Office,
            and opens the company setup form if needed.
          </p>

          <div className="mt-8 space-y-4">
            {steps.map(({ Icon, step, label }) => (
              <div
                key={step}
                className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <div>
                    <p className="text-sm font-semibold">{step}</p>
                    <p className="text-sm text-white/75">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Main panel ── */}
        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

          {/* Stage: identify */}
          {stage === "identify" && (
            <div className="mx-auto max-w-2xl">
              <h2 className="text-2xl font-semibold text-slate-900">Customer Verification</h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter the registration ID and email provided by the customer account.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <FormInput
                  label="Registration ID"
                  required
                  autoFocus
                  value={formState.regId}
                  onChange={(e) => {
                    setField("regId", e.target.value);
                    setErrors((current) => ({ ...current, regId: "" }));
                  }}
                  error={errors.regId}
                  disabled={loading}
                />
                <FormInput
                  label="Email Address"
                  type="email"
                  required
                  value={formState.email}
                  onChange={(e) => {
                    setField("email", e.target.value);
                    setErrors((current) => ({ ...current, email: "" }));
                  }}
                  error={errors.email}
                  disabled={loading}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={handleSendOtp} disabled={loading}>
                  {loading ? "Sending OTP…" : "Send OTP"}
                </Button>
                <Button variant="secondary" onClick={() => navigate("/")} disabled={loading}>
                  Back to Login
                </Button>
              </div>
            </div>
          )}

          {/* Stage: verify */}
          {stage === "verify" && (
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold text-slate-900">Verify OTP</h2>
              <p className="mt-2 text-sm text-slate-500">
                We sent a 6-digit OTP to{" "}
                <span className="font-medium">{formState.email}</span>
              </p>

              <div className="mt-8">
                <OtpInput
                  value={formState.otp}
                  onChange={(value) => {
                    setField("otp", value);
                    setErrors((current) => ({ ...current, otp: "" }));
                  }}
                />
              </div>

              {errors.otp && <p className="mt-3 text-sm text-red-500">{errors.otp}</p>}

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button onClick={handleVerifyOtp} disabled={loading}>
                  {loading ? "Verifying…" : "Verify OTP"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStage("identify")}
                  disabled={loading}
                >
                  Edit Details
                </Button>
              </div>

              <div className="mt-4 text-sm text-slate-500">
                {timer > 0 ? (
                  <p>Resend OTP in {timer}s</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-semibold text-[#49293e] hover:underline"
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stage: system-type */}
          {stage === "system-type" && (
            <div className="mx-auto max-w-2xl">
              <h2 className="text-2xl font-semibold text-slate-900">Choose System Type</h2>
              <p className="mt-2 text-sm text-slate-500">
                How will this machine be used? This setting is saved on this device.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {/* POS Card */}
                <button
                  type="button"
                  id="system-type-pos"
                  onClick={() => setSystemType("pos")}
                  className={`relative w-full rounded-2xl border-2 bg-white p-6 text-left transition-all duration-200 hover:shadow-md ${
                    systemType === "pos"
                      ? "border-[#49293e] shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {systemType === "pos" && (
                    <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#49293e]">
                      <svg viewBox="0 0 12 10" className="h-3 w-3 fill-none stroke-white stroke-2">
                        <polyline points="1,5 4,8 11,1" />
                      </svg>
                    </span>
                  )}
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#49293e] to-[#7b3f6e] text-white shadow-sm">
                    <Monitor size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">POS Terminal</h3>
                  <span className="mt-1 inline-block rounded-full bg-[#49293e]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#49293e]">
                    Requires Cashier In / Out
                  </span>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    This machine handles customer orders and payments. A cashier must open
                    and close a shift each day.
                  </p>
                </button>

                {/* Back Office Card */}
                <button
                  type="button"
                  id="system-type-backoffice"
                  onClick={() => setSystemType("backoffice")}
                  className={`relative w-full rounded-2xl border-2 bg-white p-6 text-left transition-all duration-200 hover:shadow-md ${
                    systemType === "backoffice"
                      ? "border-slate-600 shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {systemType === "backoffice" && (
                    <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600">
                      <svg viewBox="0 0 12 10" className="h-3 w-3 fill-none stroke-white stroke-2">
                        <polyline points="1,5 4,8 11,1" />
                      </svg>
                    </span>
                  )}
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-sm">
                    <LayoutGrid size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Back Office</h3>
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    Full admin access
                  </span>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    This machine is for management, reporting, and master data. No shift
                    management required.
                  </p>
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  id="confirm-system-type-btn"
                  onClick={handleConfirmSystemType}
                  disabled={loading}
                  size="lg"
                >
                  {loading ? "Checking…" : "Confirm & Continue"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStage("verify")}
                  disabled={loading}
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Stage: form (company creation) */}
          {stage === "form" && (
            <div>
              <div className="mb-8 flex flex-col gap-3 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Company not yet registered
                  </p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {formNotice || "OTP verified. Complete the form below to create your company."}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setStage("identify")}
                  disabled={loading}
                >
                  Start Over
                </Button>
              </div>

              <CompanyForm
                initialValues={{
                  regId: formState.regId.trim(),
                  email: formState.email.trim(),
                  database: clientDatabase,
                }}
                lockedFields={["regId", "email"]}
                submitLabel="Create Company"
                clientDb={clientDatabase}
                tempToken={tempToken}
                onSuccess={() => {
                  if (systemType === "pos") {
                    setupPosSession(clientDatabase);
                  } else {
                    localStorage.setItem("companyRegistered", "true");
                    navigate("/", {
                      state: {
                        clientDb: clientDatabase,
                        username: "Admin",
                        password: "1",
                        message:
                          "Company created successfully. Logging you in with default Admin credentials.",
                      },
                    });
                  }
                }}
              />
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Existing customer?{" "}
        <Link to="/" className="font-semibold text-[#49293e] hover:underline">
          Return to login
        </Link>
      </p>
    </div>
  );
};

export default CompanyOnboardingPage;