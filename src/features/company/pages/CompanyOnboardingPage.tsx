import { useEffect, useMemo, useState } from "react";
import { Mail, ShieldCheck, UserRoundPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, FormInput } from "../../../components/common";
import OtpInput from "../../auth/components/OtpInput";
import { useToast } from "../../../app/providers/useToast";
import CompanyForm from "../components/CompanyForm";
import {
  checkCompanyExists,
  fetchCompanyRegistration,
  sendCompanyOtp,
  verifyCompanyOtp,
} from "../services/companyOnboardingApi";
import type { CompanyOnboardingState } from "../types";
import { isValidEmail } from "../../../lib/validators";

type OnboardingStage = "identify" | "verify" | "form";

const initialState: CompanyOnboardingState = {
  regId: "",
  email: "",
  otp: ["", "", "", "", "", ""],
  otpToken: "",
};

const CompanyOnboardingPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stage, setStage] = useState<OnboardingStage>("identify");
  const [formState, setFormState] = useState(initialState);
  const [errors, setErrors] = useState({ regId: "", email: "", otp: "" });
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [formNotice, setFormNotice] = useState("");
  const [clientDatabase, setClientDatabase] = useState("");
  const [tempToken, setTempToken] = useState("");

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
      showToast(
        companyCheck.data?.name
          ? `Company "${companyCheck.data.name}" is already registered. Redirecting to login…`
          : companyCheck.message || "Company already registered. Redirecting to login…",
        "success"
      );
      setTimeout(() => navigate("/"), 1500);
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
      showToast("OTP verified successfully", "success");

      await handlePostOtpFlow(verification.otpToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "OTP verification failed";
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
            This flow validates your email with an OTP, checks your registration status, and
            then opens the company setup form if needed.
          </p>

          <div className="mt-8 space-y-4">
            {[
              { Icon: Mail, step: "Step 1", label: "Enter registration ID and email" },
              { Icon: ShieldCheck, step: "Step 2", label: "Verify OTP and validate access" },
              { Icon: UserRoundPlus, step: "Step 3", label: "Complete the company registration form" },
            ].map(({ Icon, step, label }) => (
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