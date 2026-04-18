import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FormInput, Button } from "../../../components/common";
import { loginApi } from "../services/authApi";
import { useToast } from "../../../app/providers/useToast";
import { useAppDispatch } from "../../../app/hooks";
import { setCredentials } from "../store/authSlice";

interface LocationState {
  username?: string;
  password?: string;
  clientDb?: string;
  message?: string;
}

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const dispatch = useAppDispatch();

  const state = (location.state ?? {}) as LocationState;

  // clientDb is hidden from UI — comes from onboarding state, localStorage, or falls back to "app_db"
  const [clientDb] = useState(state.clientDb ?? localStorage.getItem("tenantId") ?? "app_db");
  const [username, setUsername] = useState(state.username ?? "");
  const [password, setPassword] = useState(state.password ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.message) {
      showToast(state.message, "success");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      showToast("Please enter username and password", "error");
      return;
    }

    try {
      setLoading(true);

      const data = await loginApi(username.trim(), password.trim(), clientDb);

      if (data?.accessToken && data?.user?.userId) {
        localStorage.setItem("userId", String(data.user.userId));
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("tenantId", data.tenantId ?? clientDb);
        localStorage.setItem("userName", data.user.userName);
        localStorage.setItem("isMaster", String(Boolean(data.user.isMaster)));
        if (data.session?.expiresAt) {
          localStorage.setItem("sessionExpiresAt", data.session.expiresAt);
        }

        dispatch(
          setCredentials({
            tenantId: data.tenantId ?? clientDb,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            userId: data.user.userId,
            userName: data.user.userName,
            isMaster: Boolean(data.user.isMaster),
          })
        );

        // Mark device as registered so refresh doesn't trigger onboarding
        localStorage.setItem("companyRegistered", "true");

        showToast("Login successful", "success");
        const systemType = localStorage.getItem("systemType");
        if (systemType === "pos") {
          navigate("/", { replace: true });
        } else {
          navigate("/dashboard");
        }
        return;
      }

      showToast("Invalid credentials", "error");
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Try again.";
      showToast(message, "error");
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
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoFocus
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