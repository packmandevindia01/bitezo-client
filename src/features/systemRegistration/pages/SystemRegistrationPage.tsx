import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, Settings2 } from "lucide-react";
import { Button, FormInput } from "../../../components/common";
import { useToast } from "../../../app/providers/useToast";
import SystemTypeCard from "../components/SystemTypeCard";
import { fetchBranches } from "../services/branchService";
import type { BranchOption, SystemType } from "../types";

const SystemRegistrationPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [systemType, setSystemType] = useState<SystemType>("pos");
  const [systemName, setSystemName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ systemName: "", branchId: "" });

  // Already registered? Let them update if they re-visit
  useEffect(() => {
    const existing = localStorage.getItem("systemName");
    if (existing) setSystemName(existing);
    const existingBranch = localStorage.getItem("systemBranchId");
    if (existingBranch) setBranchId(existingBranch);
    const existingType = localStorage.getItem("systemType") as SystemType | null;
    if (existingType) setSystemType(existingType);
  }, []);

  useEffect(() => {
    setLoadingBranches(true);
    fetchBranches()
      .then(setBranches)
      .catch(() => showToast("Could not load branches", "error"))
      .finally(() => setLoadingBranches(false));
  }, [showToast]);

  const validate = () => {
    const next = { systemName: "", branchId: "" };
    if (!systemName.trim()) next.systemName = "System name is required";
    if (!branchId) next.branchId = "Please select a branch";
    setErrors(next);
    return !next.systemName && !next.branchId;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const selectedBranch = branches.find((b) => String(b.id) === branchId);

      localStorage.setItem("systemType", systemType);
      localStorage.setItem("systemName", systemName.trim());
      localStorage.setItem("systemBranchId", branchId);
      localStorage.setItem("systemBranchName", selectedBranch?.name ?? "");
      localStorage.setItem("systemRegisteredAt", new Date().toISOString());

      showToast(
        `System registered as ${systemType === "pos" ? "POS Terminal" : "Back Office"}`,
        "success"
      );

      // POS → cashier in first; Back Office → dashboard
      if (systemType === "pos") {
        navigate("/cashier/in", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">

        {/* ── Sidebar ── */}
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#49293e] via-[#5c3450] to-[#7b556c] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
            Device Setup
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">
            Register This System
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/80">
            Each machine must be registered before it can be used. This tells
            the system whether this is a cashier POS terminal or a management
            workstation.
          </p>

          <div className="mt-8 space-y-4">
            {[
              {
                Icon: Settings2,
                title: "One-time setup",
                desc: "Register once — the setting is stored on this device.",
              },
              {
                Icon: Monitor,
                title: "POS or Back Office",
                desc: "POS requires a cashier to open a shift. Back Office goes straight to the dashboard.",
              },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <Icon size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-sm text-white/75">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Main Panel ── */}
        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">System Type</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select how this machine will be used in your restaurant.
          </p>

          {/* System type cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <SystemTypeCard
              type="pos"
              selected={systemType === "pos"}
              onClick={() => setSystemType("pos")}
            />
            <SystemTypeCard
              type="backoffice"
              selected={systemType === "backoffice"}
              onClick={() => setSystemType("backoffice")}
            />
          </div>

          {/* System Name */}
          <div className="mt-6">
            <FormInput
              id="systemName"
              label="System / Terminal Name"
              required
              placeholder='e.g. "Counter 1", "Cashier 2", "Manager Desk"'
              value={systemName}
              onChange={(e) => {
                setSystemName(e.target.value);
                setErrors((prev) => ({ ...prev, systemName: "" }));
              }}
              error={errors.systemName}
              disabled={saving}
            />
          </div>

          {/* Branch Selector */}
          <div className="flex flex-col gap-1 mb-4 w-full">
            <label htmlFor="branch-select" className="text-xs md:text-sm font-medium text-gray-700">
              Branch <span className="text-red-500 ml-1 font-bold">*</span>
            </label>
            <select
              id="branch-select"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setErrors((prev) => ({ ...prev, branchId: "" }));
              }}
              disabled={saving || loadingBranches}
              className={`
                w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border outline-none transition
                ${errors.branchId ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"}
                ${saving || loadingBranches ? "bg-gray-100 cursor-not-allowed" : ""}
                focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20
              `}
            >
              <option value="">
                {loadingBranches ? "Loading branches..." : "Select a branch"}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.branchId && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] md:text-xs text-red-600 font-semibold">
                <span className="shrink-0">⚠️</span>
                <span>{errors.branchId}</span>
              </div>
            )}
          </div>

          {/* Action */}
          <div className="mt-6 flex gap-3">
            <Button
              id="register-system-btn"
              onClick={handleSubmit}
              disabled={saving}
              loading={saving}
              size="lg"
            >
              {saving ? "Saving…" : "Register System"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SystemRegistrationPage;
