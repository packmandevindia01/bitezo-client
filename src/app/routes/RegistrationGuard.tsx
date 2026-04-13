import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader } from "../../components/common";

const AUTH_BASE = "http://84.255.173.131:8068";

const PUBLIC_ROUTES = [
  "/company/onboarding",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
];

/**
 * Calls the send-otp endpoint with a dummy check just to see if the
 * server is reachable and the app_db exists. Instead we use masterload
 * which is a public endpoint that returns data only if the system is set up.
 */
const checkCompanyRegistered = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${AUTH_BASE}/api/company/masterload`, {
      method: "GET",
      headers: { accept: "*/*" },
    });

    if (!res.ok) return false;

    const json = await res.json();

    // masterload returns { data: { currencies: [...], countries: [...] } }
    // If currencies or countries exist, the system/company is set up
    const data = json?.data;
    if (!data) return false;

    const hasCurrencies = Array.isArray(data.currencies) && data.currencies.length > 0;
    const hasCountries = Array.isArray(data.countries) && data.countries.length > 0;

    return hasCurrencies || hasCountries;
  } catch {
    // Network error — assume registered to avoid blocking the app
    return true;
  }
};

interface Props {
  children: React.ReactNode;
}

const RegistrationGuard = ({ children }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Skip check on public routes
    if (PUBLIC_ROUTES.includes(location.pathname)) {
      setChecking(false);
      return;
    }

    const run = async () => {
      // Fast path 1: user has an active session → definitely registered
      const hasToken = !!localStorage.getItem("accessToken");
      if (hasToken) {
        localStorage.setItem("companyRegistered", "true");
        setChecking(false);
        return;
      }

      // Fast path 2: already confirmed registered this browser
      const alreadyRegistered = localStorage.getItem("companyRegistered") === "true";
      if (alreadyRegistered) {
        setChecking(false);
        return;
      }

      // Slow path: ask the API
      const registered = await checkCompanyRegistered();

      if (registered) {
        localStorage.setItem("companyRegistered", "true");
        setChecking(false);
      } else {
        navigate("/company/onboarding", { replace: true });
        setChecking(false);
      }
    };

    void run();
  }, [location.pathname, navigate]);

  if (checking) {
    return <Loader fullScreen text="Checking registration..." />;
  }

  return <>{children}</>;
};

export default RegistrationGuard;