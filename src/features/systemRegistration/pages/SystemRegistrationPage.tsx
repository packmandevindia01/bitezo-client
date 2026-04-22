import { useSystemRegistration } from "../hooks/useSystemRegistration";
import RegistrationSidebar from "../components/RegistrationSidebar";
import RegistrationForm from "../components/RegistrationForm";

const SystemRegistrationPage = () => {
  const {
    systemType,
    setSystemType,
    systemName,
    branchId,
    branches,
    loadingBranches,
    saving,
    errors,
    handleFieldChange,
    handleSubmit,
  } = useSystemRegistration();

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Onboarding Sidebar */}
        <RegistrationSidebar />

        {/* Action Panel */}
        <RegistrationForm
          systemType={systemType}
          setSystemType={setSystemType}
          systemName={systemName}
          branchId={branchId}
          branches={branches}
          loadingBranches={loadingBranches}
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
