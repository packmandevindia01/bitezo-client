import UserForm from "../components/UserForm";

const UserCreationPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">

      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto bg-white 
        p-5 sm:p-6 md:p-8 rounded-xl shadow-sm border border-gray-300">

        {/* TITLE */}
        <h1 className="text-center text-xl sm:text-2xl font-bold mb-6 md:mb-8 text-gray-800 tracking-wide">
          USER CREATION
        </h1>

        {/* FORM */}
        <UserForm />

      </div>
    </div>
  );
};

export default UserCreationPage;