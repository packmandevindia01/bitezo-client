import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormInput, Button } from "../../../components/common";
import { loginApi } from "../services/authApi";
import { useToast } from "../../../app/providers/useToast";

const LoginForm = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [clientDb, setClientDb] = useState("app_db");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientDb || !username || !password) {
      showToast("Please enter client DB, username and password", "error");
      return;
    }

    try {
      setLoading(true);

      const data = await loginApi(username, password, clientDb);

      if (data?.accessToken && data?.user?.userId) {
        localStorage.setItem("userId", String(data.user.userId));
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("tenantId", data.tenantId ?? clientDb);
        localStorage.setItem("userName", data.user.userName);
        localStorage.setItem("isMaster", String(Boolean(data.user.isMaster)));

        showToast("Login successful", "success");
        navigate("/dashboard");
        return;
      }

      showToast("Invalid username or password", "error");
      setUsername("");
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Try again.";
      showToast(message, "error");
      setUsername("");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-md sm:p-8"
    >
      <h2 className="mb-6 text-center text-xl font-bold text-[#49293e] sm:text-2xl">Login</h2>

      <FormInput
        type="text"
        placeholder="Client DB"
        value={clientDb}
        onChange={(e) => setClientDb(e.target.value)}
      />

      <FormInput
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <FormInput
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <p
        onClick={() => navigate("/forgot-password")}
        className="mt-2 mb-4 cursor-pointer text-right text-sm text-gray-600 hover:underline"
      >
        Forgot Password?
      </p>

      <Button type="submit" size="lg" fullWidth disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
};

export default LoginForm;
