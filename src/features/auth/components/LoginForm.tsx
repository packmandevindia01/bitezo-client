import {  useNavigate } from "react-router-dom";
import { FormInput, Button } from "../../../components/common";

const LoginForm = () => {
  const navigate = useNavigate()
  return (
    <form
      className="
        w-full max-w-md
        bg-white
        p-6 sm:p-8
        rounded-xl
        shadow-md
        mx-auto
      "
    >
      {/* TITLE */}
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[#49293e]">
        Login
      </h2>

      {/* EMAIL */}
      <FormInput
        type="email"
        placeholder="Email"
      />

      {/* PASSWORD */}
      <FormInput
        type="password"
        placeholder="Password"
      />

      {/* FORGOT PASSWORD */}
      <p
  onClick={() => navigate("/forgot-password")}
  className="text-sm text-right mt-2 mb-4 text-gray-600 cursor-pointer hover:underline"
>
  Forgot Password?
</p>

      {/* BUTTON */}
      <Button type="submit" size="lg" fullWidth>
        Login
      </Button>
    </form>
  );
};

export default LoginForm;