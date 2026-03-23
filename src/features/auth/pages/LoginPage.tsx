import LoginForm from "../components/LoginForm";

const LoginPage = () => {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2">

      {/* LEFT SIDE (IMAGE) */}
      <div className="hidden md:flex items-center justify-center bg-gray-200 p-6">
        <div className="w-full max-w-md h-75 md:h-[80%] border-2 border-orange-400 rounded-3xl flex items-center justify-center">
          IMAGE
        </div>
      </div>

      {/* RIGHT SIDE (FORM) */}
      <div className="flex items-center justify-center bg-white px-4 py-8">
        <LoginForm />
      </div>

    </div>
  );
};

export default LoginPage;