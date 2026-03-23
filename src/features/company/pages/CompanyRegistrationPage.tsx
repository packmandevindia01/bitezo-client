import CompanyForm from "../components/CompanyForm";

const CompanyRegistrationPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-6">

      <div className="w-full max-w-6xl bg-white p-5 sm:p-6 md:p-8 rounded-xl shadow-md">

        <h1 className="text-center text-xl sm:text-2xl font-bold mb-6 md:mb-8">
          COMPANY REGISTRATION
        </h1>

        <CompanyForm />

      </div>
    </div>
  );
};

export default CompanyRegistrationPage;