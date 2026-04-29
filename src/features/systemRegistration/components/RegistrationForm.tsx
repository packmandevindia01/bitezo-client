import { Button, FormInput } from "../../../components/common";
import SystemTypeCard from "./SystemTypeCard";
import type { BranchOption, CounterOption, SystemType } from "../types";

interface RegistrationFormProps {
  systemType: SystemType;
  setSystemType: (type: SystemType) => void;
  systemName: string;
  branchId: string;
  counterId: string;
  branches: BranchOption[];
  counters: CounterOption[];
  loadingBranches: boolean;
  loadingCounters: boolean;
  saving: boolean;
  errors: { systemName: string; branchId: string; counterId: string };
  onFieldChange: (field: "systemName" | "branchId" | "counterId", value: string) => void;
  onSubmit: () => void;
}

const RegistrationForm = ({
  systemType,
  setSystemType,
  systemName,
  branchId,
  counterId,
  branches,
  counters,
  loadingBranches,
  loadingCounters,
  saving,
  errors,
  onFieldChange,
  onSubmit,
}: RegistrationFormProps) => {
  return (
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
          onChange={(e) => onFieldChange("systemName", e.target.value)}
          error={errors.systemName}
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {/* Branch Selector */}
        <div className="flex flex-col gap-1 w-full">
          <label htmlFor="branch-select" className="text-xs md:text-sm font-medium text-gray-700">
            Branch <span className="text-red-500 ml-1 font-bold">*</span>
          </label>
          <select
            id="branch-select"
            value={branchId}
            onChange={(e) => onFieldChange("branchId", e.target.value)}
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

        {/* Counter Selector - Only for POS */}
        {systemType === "pos" && (
          <div className="flex flex-col gap-1 w-full">
            <label htmlFor="counter-select" className="text-xs md:text-sm font-medium text-gray-700">
              Counter <span className="text-red-500 ml-1 font-bold">*</span>
            </label>
            <select
              id="counter-select"
              value={counterId}
              onChange={(e) => onFieldChange("counterId", e.target.value)}
              disabled={saving || loadingCounters || !branchId}
              className={`
                w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border outline-none transition
                ${errors.counterId ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"}
                ${saving || loadingCounters || !branchId ? "bg-gray-100 cursor-not-allowed" : ""}
                focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20
              `}
            >
              <option value="">
                {!branchId ? "Select branch first" : loadingCounters ? "Loading counters..." : "Select a counter"}
              </option>
              {counters.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.counterId && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] md:text-xs text-red-600 font-semibold">
                <span className="shrink-0">⚠️</span>
                <span>{errors.counterId}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action */}
      <div className="mt-8 flex gap-3">
        <Button
          id="register-system-btn"
          onClick={onSubmit}
          disabled={saving}
          loading={saving}
          size="lg"
          className="w-full sm:w-auto"
        >
          {saving ? "Saving…" : "Register System"}
        </Button>
      </div>
    </section>
  );
};

export default RegistrationForm;
