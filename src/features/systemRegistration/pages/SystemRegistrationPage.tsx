import { useSystemRegistration } from "../hooks/useSystemRegistration";
import RegistrationSidebar from "../components/RegistrationSidebar";
import RegistrationForm from "../components/RegistrationForm";

const SystemRegistrationPage = () => {
  const {
    systemType,
    setSystemType,
    terminalId,
    branchId,
    counterId,
    branches,
    counters,
    terminals,
    loadingBranches,
    loadingCounters,
    loadingTerminals,
    saving,
    errors,
    handleFieldChange,
    handleSubmit,
  } = useSystemRegistration();

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-4 md:gap-6 lg:gap-8 md:grid-cols-[320px_minmax(0,1fr)] lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Onboarding Sidebar */}
        <RegistrationSidebar />

        {/* Action Panel */}
        <RegistrationForm
          systemType={systemType}
          setSystemType={setSystemType}
          terminalId={terminalId}
          branchId={branchId}
          counterId={counterId}
          branches={branches}
          counters={counters}
          terminals={terminals}
          loadingBranches={loadingBranches}
          loadingCounters={loadingCounters}
          loadingTerminals={loadingTerminals}
          saving={saving}
          errors={errors}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default SystemRegistrationPage;
