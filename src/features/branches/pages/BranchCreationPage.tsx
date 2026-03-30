import BranchForm from "../components/BranchForm";

const BranchCreationPage = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-6">
    <div className="w-full max-w-6xl bg-white p-5 sm:p-6 md:p-8 rounded-xl shadow-md">
      <BranchForm />

    </div>
  </div>
);

export default BranchCreationPage;