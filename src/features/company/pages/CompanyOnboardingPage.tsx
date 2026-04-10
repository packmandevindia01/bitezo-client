import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, ShieldCheck, UserRoundPlus } from "lucide-react";
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

type OnboardingStage = "identify" | "verify" | "form" | "registered";

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
  const [registeredMessage, setRegisteredMessage] = useState("");
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
      setFormNotice("");
      setClientDatabase("");
      setTempToken("");
      showToast("OTP sent successfully", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send OTP";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async (otpToken: string) => {
    const result = await fetchCompanyRegistration(
      {
        regId: formState.regId.trim(),
        email: formState.email.trim(),
      },
      otpToken
    );

    if (result.isRegistered) {
      setRegisteredMessage(result.message || "This customer is already available in the system.");
      setStage("registered");
      return;
    }

    const clientDb = result.database?.trim() ?? "";
    setClientDatabase(clientDb);
    setTempToken(result.tempToken ?? "");

    if (!clientDb) {
      setFormNotice("No client database exists for this registration yet. Continue to create the company.");
      setStage("form");
      return;
    }

    const companyCheck = await checkCompanyExists(clientDb, formState.regId.trim());

    if (companyCheck.exists) {
      showToast(
        `Company "${companyCheck.data?.name}" is already registered. Redirecting to login...`,
        "success"
      );
      setTimeout(() => navigate("/"), 1500);
      return;
    }

    setFormNotice(
      companyCheck.message || `Client database "${clientDb}" is available. Continue to create the company.`
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
        throw new Error("OTP verified, but no OTP token was returned by the server.");
      }

      setField("otpToken", verification.otpToken);
      showToast("OTP verified successfully", "success");

      await checkRegistration(verification.otpToken);
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
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#49293e] via-[#5c3450] to-[#7b556c] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
            Customer Onboarding
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Verify and Create Company</h1>
          <p className="mt-4 text-sm leading-6 text-white/80">
            This flow is for customers who are not yet registered. We first validate the email
            with OTP, then check the registration status, and only after that open the company
            setup form.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Mail size={18} />
                <div>
                  <p className="text-sm font-semibold">Step 1</p>
                  <p className="text-sm text-white/75">Enter registration ID and email</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} />
                <div>
                  <p className="text-sm font-semibold">Step 2</p>
                  <p className="text-sm text-white/75">Verify OTP and validate customer access</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <UserRoundPlus size={18} />
                <div>
                  <p className="text-sm font-semibold">Step 3</p>
                  <p className="text-sm text-white/75">Complete the company registration form</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
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
                  {loading ? "Sending OTP..." : "Send OTP"}
                </Button>
                <Button variant="secondary" onClick={() => navigate("/")} disabled={loading}>
                  Back to Login
                </Button>
              </div>
            </div>
          )}

          {stage === "verify" && (
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold text-slate-900">Verify OTP</h2>
              <p className="mt-2 text-sm text-slate-500">
                We sent a 6-digit OTP to <span className="font-medium">{formState.email}</span>
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
                  {loading ? "Verifying..." : "Verify OTP"}
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

          {stage === "registered" && (
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-slate-900">
                Customer Already Registered
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {registeredMessage || "This customer is already available in the system."}
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={() => navigate("/")}>Go to Login</Button>
                <Button variant="secondary" onClick={() => setStage("identify")}>
                  Check Another Customer
                </Button>
              </div>
            </div>
          )}

          {stage === "form" && (
            <div>
              <div className="mb-8 flex flex-col gap-3 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Customer not registered</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {formNotice || "OTP is verified. You can now complete the company registration form."}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setStage("identify")} disabled={loading}>
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
                onSuccess={() =>
                  navigate("/", {
                    state: {
                      username: formState.email.trim(),
                      password: "1",
                      message: "Company created successfully. Use the default Admin login with password 1.",
                    },
                  })
                }
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
