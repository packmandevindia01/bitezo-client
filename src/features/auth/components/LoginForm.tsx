import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormInput, Button } from "../../../components/common";
import { loginApi } from "../services/authApi";
import { useToast } from "../../../context/useToast";

const LoginForm = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔥 Basic validation
    if (!email || !password) {
      showToast("Please enter username and password", "error");
      return;
    }

    try {
      setLoading(true);

      const data = await loginApi(email, password);

      if (data?.userId) {
        // ✅ Save login
        localStorage.setItem("userId", data.userId);

        showToast("Login successful 🎉", "success");

        navigate("/dashboard");
      } else {
        // ❌ Invalid credentials
        showToast("Invalid username or password ❌", "error");

        // 🔥 Clear fields
        setEmail("");
        setPassword("");
      }

    } catch (error) {
      console.error(error);

      showToast("Login failed. Try again ❌", "error");

      // 🔥 Clear fields
      setEmail("");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md bg-white p-6 sm:p-8 rounded-xl shadow-md mx-auto"
    >
      {/* TITLE */}
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[#49293e]">
        Login
      </h2>

      {/* USERNAME */}
      <FormInput
        type="text"
        placeholder="Username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* PASSWORD */}
      <FormInput
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* FORGOT PASSWORD */}
      <p
        onClick={() => navigate("/forgot-password")}
        className="text-sm text-right mt-2 mb-4 text-gray-600 cursor-pointer hover:underline"
      >
        Forgot Password?
      </p>

      {/* BUTTON */}
      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
};

export default LoginForm;
