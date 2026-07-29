import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Monitor, LayoutGrid, ShieldCheck, UserRoundPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, FormInput, SearchableSelect } from "../../../components/common";
import OtpInput from "../../auth/components/OtpInput";
import { useToast } from "../../../app/providers/useToast";
import CompanyForm from "../components/CompanyForm";
import {
  checkCompanyExists,
  fetchCompanyRegistration,
  fetchOnboardBranches,
  fetchOnboardCounters,
  fetchOnboardSeries,
  fetchOnboardTerminals,
  sendCompanyOtp,
  verifyCompanyOtp,
} from "../services/companyOnboardingApi";
import type { CompanyOnboardingState } from "../types";
import { isValidEmail } from "../../../lib/validators";
import type { SystemType } from "../../systemRegistration/types";
import { useAppDispatch } from "../../../app/hooks";
import { setCredentials } from "../../auth/store/authSlice";

type OnboardingStage = "identify" | "verify" | "system-type" | "pos-setup" | "form";

interface PosCounterOption {
  id: number;
  name: string;
}

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
  const [posBranchId, setPosBranchId] = useState("");
  const [posCounterId, setPosCounterId] = useState("");
  const [posSeriesId, setPosSeriesId] = useState("");
  const [posTerminalId, setPosTerminalId] = useState("");
  const [posBranches, setPosBranches] = useState<{ id: number; name: string }[]>([]);
  const [posCounters, setPosCounters] = useState<PosCounterOption[]>([]);
  const [posSeriesList, setPosSeriesList] = useState<{ id: number; name: string }[]>([]);
  const [posTerminals, setPosTerminals] = useState<{ id: number; name: string }[]>([]);
  const [posSetupErrors, setPosSetupErrors] = useState({ branchId: "", counterId: "", seriesId: "", terminalId: "" });
  const [loadingPosSetup, setLoadingPosSetup] = useState(false);
  const [loadingPosCounters, setLoadingPosCounters] = useState(false);
  const [loadingPosSeries, setLoadingPosSeries] = useState(false);
  const [loadingPosTerminals, setLoadingPosTerminals] = useState(false);

  // Resume onboarding state on mount
  useEffect(() => {
    const savedRegId = localStorage.getItem("onboardingRegId");
    const savedEmail = localStorage.getItem("onboardingEmail");
    const savedOtpToken = localStorage.getItem("onboardingOtpToken");
    const savedDb = localStorage.getItem("tenantId");

    if (savedRegId) setFormState(s => ({ ...s, regId: savedRegId }));
    if (savedEmail) setFormState(s => ({ ...s, email: savedEmail }));
    if (savedOtpToken) setField("otpToken", savedOtpToken);
    if (savedDb) setClientDatabase(savedDb);
  }, []);

  // Persistence wrapper for setStage
  const setStageWithPersistence = (newStage: OnboardingStage) => {
    setStage(newStage);
  };

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
      
      // Persist identity for resume
      localStorage.setItem("onboardingRegId", formState.regId.trim());
      localStorage.setItem("onboardingEmail", formState.email.trim());
      
      setStageWithPersistence("verify");
      setTimer(30);
      showToast("OTP sent successfully", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send OTP";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const setupPosSession = (db: string, branchId: string, counterId: string, seriesId: string, terminalId: string) => {
    const selectedBranch = posBranches.find((branch) => String(branch.id) === branchId);
    const selectedCounter = posCounters.find((counter) => String(counter.id) === counterId);
    const selectedSeries = posSeriesList.find((series) => String(series.id) === seriesId);
    const selectedTerminal = posTerminals.find((terminal) => String(terminal.id) === terminalId);
    const branchName = selectedBranch?.name ?? "";
    const counterName = selectedCounter?.name ?? "";
    const seriesName = selectedSeries?.name ?? "";
    const terminalName = selectedTerminal?.name ?? "";

    localStorage.setItem("companyRegistered", "true");
    dispatch(
      setCredentials({
        tenantId: db,
        accessToken: "pos-terminal-session",
        refreshToken: "pos-terminal-refresh",
        userId: "pos-terminal",
        userName: "POS Terminal",
        isMaster: false,
        userRoles: [],
        decimalPart: 2,
        currencySymbol: "BHD",
      })
    );
    
    // Write directly to local storage to bypass React lifecycle racing
    localStorage.setItem("tenantId", db);
    localStorage.setItem("accessToken", "pos-terminal-session");
    localStorage.setItem("refreshToken", "pos-terminal-refresh");
    localStorage.setItem("userId", "pos-terminal");
    localStorage.setItem("userName", "POS Terminal");
    localStorage.setItem("isMaster", "false");
    localStorage.setItem("companyRegistered", "true");
    localStorage.setItem("systemType", "pos");
    localStorage.setItem("systemName", terminalName ? terminalName : (counterName ? `POS Terminal - ${counterName}` : "POS Terminal"));
    localStorage.setItem("terminalId", terminalId);
    localStorage.setItem("systemBranchId", branchId);
    localStorage.setItem("systemBranchName", branchName);
    localStorage.setItem("systemCounterId", counterId);
    localStorage.setItem("systemCounterName", counterName);
    localStorage.setItem("systemSeriesId", seriesId);
    localStorage.setItem("systemSeriesName", seriesName);
    localStorage.setItem("systemRegisteredAt", new Date().toISOString());

    showToast("POS Terminal Registered! Opening system...", "success");
    
    // Clear onboarding persistence
    localStorage.removeItem("onboardingStage");
    localStorage.removeItem("onboardingRegId");
    localStorage.removeItem("onboardingEmail");
    localStorage.removeItem("onboardingOtpToken");

    navigate("/cashier/in", { replace: true });
  };

  const beginPosSetup = async (db: string) => {
    localStorage.setItem("companyRegistered", "true");
    localStorage.setItem("tenantId", db);
    localStorage.setItem("systemType", "pos");
    setClientDatabase(db);
    setLoadingPosSetup(true);

    try {
      const branches = await fetchOnboardBranches(false);

      const branchOptions = branches.map((branch) => ({
        id: branch.branchId,
        name: branch.branchName,
      }));

      setPosBranches(branchOptions);
      setPosCounters([]);
      setPosCounterId("");
      setPosSeriesList([]);
      setPosSeriesId("");
      setPosSetupErrors({ branchId: "", counterId: "", seriesId: "", terminalId: "" });
      setStageWithPersistence("pos-setup");

      if (branchOptions.length === 1) {
        const onlyBranchId = String(branchOptions[0].id);
        setPosBranchId(onlyBranchId);
        await loadPosCounters(onlyBranchId, db);
      } else {
        setPosBranchId("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load branch and counter data";
      showToast(message, "error");
    } finally {
      setLoadingPosSetup(false);
    }
  };

  const loadPosCounters = async (branchId: string, db = clientDatabase) => {
    if (!branchId || !db) {
      setPosCounters([]);
      return;
    }

    try {
      setLoadingPosCounters(true);
      setLoadingPosSeries(true);
      setLoadingPosTerminals(true);
      
      const [counters, series, terminals] = await Promise.all([
        fetchOnboardCounters(branchId),
        fetchOnboardSeries(branchId),
        fetchOnboardTerminals(branchId)
      ]);

      setPosCounters(
        counters.map((counter) => ({
          id: counter.counterId,
          name: counter.counterName,
        }))
      );

      if (counters.length === 1) {
        setPosCounterId(String(counters[0].counterId));
      }

      setPosSeriesList(
        series.map((s) => ({
          id: s.seriesId,
          name: s.seriesName,
        }))
      );

      if (series.length === 1) {
        setPosSeriesId(String(series[0].seriesId));
      }

      setPosTerminals(
        terminals.map((t) => ({
          id: t.terminalId,
          name: t.terminalName,
        }))
      );

      if (terminals.length === 1) {
        setPosTerminalId(String(terminals[0].terminalId));
      }
    } catch (error) {
      setPosCounters([]);
      setPosSeriesList([]);
      setPosTerminals([]);
      const message = error instanceof Error ? error.message : "Failed to load counters/series/terminals";
      showToast(message, "error");
    } finally {
      setLoadingPosCounters(false);
      setLoadingPosSeries(false);
      setLoadingPosTerminals(false);
    }
  };

  const handlePostOtpFlow = async (otpToken: string) => {
    const registration = await fetchCompanyRegistration(
      { regId: formState.regId.trim(), email: formState.email.trim() },
      otpToken
    );

    const clientDb = String(registration.database || "").trim();
    const token = String(registration.tempToken || "");

    setClientDatabase(clientDb);
    setTempToken(token);

    if (!clientDb) {
      setFormNotice(
        registration.message || "No client database found. Continue to create the company."
      );
      setStageWithPersistence("form");
      return;
    }

    const companyCheck = await checkCompanyExists(clientDb, formState.regId.trim());

    const checkData = companyCheck.data as Record<string, unknown> | null;

    if (companyCheck.exists) {
      showToast(
        checkData?.name
          ? `Company "${String(checkData.name)}" is already registered. Redirecting...`
          : String(companyCheck.message || "Company already registered. Redirecting..."),
        "success"
      );

      localStorage.setItem("companyRegistered", "true");
      // Explicitly set the tenantId so the app knows which database to talk to immediately
      localStorage.setItem("tenantId", clientDb);

      if (systemType === "pos") {
        await beginPosSetup(clientDb);
        return;
      }
      
      // Pass the details to the Login Form so it correctly identifies the company
      setTimeout(() => navigate("/", { 
        replace: true,
        state: {
          clientDb: clientDb,
          message: companyCheck.message || "Device verified. Please log in to your company account."
        }
      }), 1500);
      return;
    }

    setFormNotice(
      String(companyCheck.message ||
        `Client database "${clientDb}" is ready. Complete the form to create your company.`)
    );
    setStageWithPersistence("form");
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
      localStorage.setItem("onboardingOtpToken", verification.otpToken);
      
      showToast("OTP verified! Now choose your system type.", "success");

      // ── Go to system-type step before post-OTP flow ──
      setStageWithPersistence("system-type");
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

  const handleCompletePosSetup = () => {
    const nextErrors = { branchId: "", counterId: "", seriesId: "", terminalId: "" };

    if (!posBranchId) nextErrors.branchId = "Please select a branch";
    if (!posCounterId) nextErrors.counterId = "Please select a counter";
    if (!posSeriesId) nextErrors.seriesId = "Please select a series";
    if (!posTerminalId) nextErrors.terminalId = "Please select a terminal";

    setPosSetupErrors(nextErrors);
    if (nextErrors.branchId || nextErrors.counterId || nextErrors.seriesId || nextErrors.terminalId) return;

    setupPosSession(clientDatabase, posBranchId, posCounterId, posSeriesId, posTerminalId);
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
    { Icon: Building2,     step: "Step 4", label: "Select branch and counter for POS" },
    { Icon: UserRoundPlus, step: "Step 5", label: "Complete company registration if needed" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-4 sm:py-6" style={{ fontFamily: "'Inter', sans-serif" }}>
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

          <div className="mt-8 hidden space-y-4 md:block">
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
                  id="onboarding-regId"
                  label="Registration ID"
                  required
                  autoFocus={window.innerWidth > 1024}
                  value={formState.regId}
                  onChange={(e) => {
                    setField("regId", e.target.value);
                    setErrors((current) => ({ ...current, regId: "" }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById("onboarding-email")?.focus();
                    }
                  }}
                  error={errors.regId}
                  disabled={loading}
                  tabIndex={1}
                />
                <FormInput
                  id="onboarding-email"
                  label="Email Address"
                  type="email"
                  required
                  value={formState.email}
                  onChange={(e) => {
                    setField("email", e.target.value);
                    setErrors((current) => ({ ...current, email: "" }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendOtp();
                    }
                  }}
                  error={errors.email}
                  disabled={loading}
                  tabIndex={2}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={handleSendOtp} disabled={loading}>
                  {loading ? "Sending OTP…" : "Send OTP"}
                </Button>
                <Button variant="secondary" onClick={() => navigate("/")} disabled={loading} tabIndex={-1}>
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
                  onEnter={handleVerifyOtp}
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
                  autoFocus={true}
                  onClick={() => {
                    setSystemType("pos");
                    localStorage.setItem("systemType", "pos");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      setSystemType("backoffice");
                      localStorage.setItem("systemType", "backoffice");
                      document.getElementById("system-type-backoffice")?.focus();
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmSystemType();
                    }
                  }}
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
                  onClick={() => {
                    setSystemType("backoffice");
                    localStorage.setItem("systemType", "backoffice");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      setSystemType("pos");
                      localStorage.setItem("systemType", "pos");
                      document.getElementById("system-type-pos")?.focus();
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmSystemType();
                    }
                  }}
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
                  onClick={() => setStageWithPersistence("verify")}
                  disabled={loading}
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Stage: pos-setup */}
          {stage === "pos-setup" && (
            <div className="mx-auto max-w-2xl">
              <h2 className="text-2xl font-semibold text-slate-900">Choose Branch and Counter</h2>
              <p className="mt-2 text-sm text-slate-500">
                Select where this POS terminal will operate. These details are saved on this device.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SearchableSelect
                  id="onboarding-pos-branch"
                  tabIndex={1}
                  label="Branch"
                  required
                  value={posBranchId}
                  placeholder={loadingPosSetup ? "Loading branches..." : "Select branch"}
                  disabled={loadingPosSetup}
                  error={posSetupErrors.branchId}
                  options={posBranches.map((branch) => ({
                    label: branch.name,
                    value: String(branch.id),
                  }))}
                  onChange={(val) => {
                    setPosBranchId(val);
                    setPosCounterId("");
                    setPosCounters([]);
                    setPosSeriesId("");
                    setPosSeriesList([]);
                    setPosTerminalId("");
                    setPosTerminals([]);
                    setPosSetupErrors((current) => ({ ...current, branchId: "", counterId: "", seriesId: "", terminalId: "" }));
                    loadPosCounters(val).then(() => {
                      setTimeout(() => document.getElementById("onboarding-pos-counter")?.focus(), 100);
                    });
                  }}
                  clearable={false}
                  forcePlacement="bottom"
                />

                <SearchableSelect
                  id="onboarding-pos-counter"
                  tabIndex={2}
                  label="Counter"
                  required
                  value={posCounterId}
                  placeholder={
                    !posBranchId
                      ? "Select branch first"
                      : loadingPosCounters
                        ? "Loading counters..."
                        : "Select counter"
                  }
                  disabled={!posBranchId || loadingPosCounters || loadingPosSetup}
                  error={posSetupErrors.counterId}
                  options={posCounters.map((counter) => ({
                    label: counter.name,
                    value: String(counter.id),
                  }))}
                  onChange={(val) => {
                    setPosCounterId(val);
                    setPosSeriesId("");
                    setPosTerminalId("");
                    setPosSetupErrors((current) => ({ ...current, counterId: "", seriesId: "", terminalId: "" }));
                    setTimeout(() => document.getElementById("onboarding-pos-series")?.focus(), 50);
                  }}
                  clearable={false}
                  forcePlacement="bottom"
                />

                <SearchableSelect
                  id="onboarding-pos-series"
                  tabIndex={3}
                  label="Series"
                  required
                  value={posSeriesId}
                  placeholder={
                    !posCounterId
                      ? "Select counter first"
                      : loadingPosSeries
                        ? "Loading series..."
                        : "Select series"
                  }
                  disabled={!posCounterId || loadingPosSeries || loadingPosSetup}
                  error={posSetupErrors.seriesId}
                  options={posSeriesList.map((series) => ({
                    label: series.name,
                    value: String(series.id),
                  }))}
                  onChange={(val) => {
                    setPosSeriesId(val);
                    setPosTerminalId("");
                    setPosSetupErrors((current) => ({ ...current, seriesId: "", terminalId: "" }));
                    setTimeout(() => document.getElementById("onboarding-pos-terminal")?.focus(), 50);
                  }}
                  clearable={false}
                  forcePlacement="bottom"
                />

                <SearchableSelect
                  id="onboarding-pos-terminal"
                  tabIndex={4}
                  label="Terminal"
                  required
                  value={posTerminalId}
                  placeholder={
                    !posSeriesId
                      ? "Select series first"
                      : loadingPosTerminals
                        ? "Loading terminals..."
                        : "Select terminal"
                  }
                  disabled={!posSeriesId || loadingPosTerminals || loadingPosSetup}
                  error={posSetupErrors.terminalId}
                  options={posTerminals.map((terminal) => ({
                    label: terminal.name,
                    value: String(terminal.id),
                  }))}
                  onChange={(val) => {
                    setPosTerminalId(val);
                    setPosSetupErrors((current) => ({ ...current, terminalId: "" }));
                    setTimeout(() => document.getElementById("btn-save-pos-setup")?.focus(), 50);
                  }}
                  clearable={false}
                  forcePlacement="bottom"
                />
              </div>

              {posBranchId && !loadingPosCounters && posCounters.length === 0 && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  No counters were found for the selected branch. Please add a counter in Back Office first.
                </p>
              )}
              {posBranchId && !loadingPosTerminals && posTerminals.length === 0 && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 mt-2">
                  No available terminals were found. Please assign terminal IDs in the backend.
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  id="btn-save-pos-setup"
                  onClick={handleCompletePosSetup}
                  disabled={loadingPosSetup || loadingPosCounters || posCounters.length === 0 || loadingPosTerminals || posTerminals.length === 0}
                  loading={loadingPosSetup || loadingPosCounters || loadingPosTerminals}
                  size="lg"
                >
                  Save POS Setup
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setStageWithPersistence("system-type")}
                  disabled={loadingPosSetup}
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Stage: form (company creation) */}
          {stage === "form" && (
            <div>
              <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
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
                    void beginPosSetup(clientDatabase);
                  } else {
                    localStorage.setItem("companyRegistered", "true");
                    navigate("/", {
                      state: {
                        clientDb: clientDatabase,
                        message: "Company created successfully. Please log in to your company account.",
                      },
                    });
                  }
                }}
              />
            </div>
          )}
        </section>
      </div>

    </div>
  );
};

export default CompanyOnboardingPage;
