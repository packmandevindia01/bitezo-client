import type {
  CompanyLookupPayload,
  CompanyLookupResponse,
  SendOtpResponse,
  VerifyOtpResponse,
} from "../types";

const AUTH_API_BASE = "http://84.255.173.131:8068";
const COMPANY_API_BASE = "http://84.255.173.131:8068";

const getJsonErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    if (data?.message) {
      return data.message as string;
    }
  } catch {
    try {
      const text = await response.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export const sendCompanyOtp = async (regId: string, email: string) => {
  const response = await fetch(
    `${AUTH_API_BASE}/api/auth/send-otp?regId=${encodeURIComponent(regId)}&email=${encodeURIComponent(email)}`,
    {
    method: "POST",
    headers: {
      Accept: "*/*",
    },
    }
  );

  if (!response.ok) {
    throw new Error(await getJsonErrorMessage(response, "Failed to send OTP"));
  }

  return (await response.json()) as SendOtpResponse;
};

export const verifyCompanyOtp = async (regId: string, email: string, otp: string) => {
  const response = await fetch(
    `${AUTH_API_BASE}/api/auth/verify-otp?regId=${encodeURIComponent(regId)}`,
    {
    method: "POST",
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
    }
  );

  if (!response.ok) {
    throw new Error(await getJsonErrorMessage(response, "OTP verification failed"));
  }

  const json = (await response.json()) as VerifyOtpResponse & {
    data?: { otpToken?: string };
    otp_token?: string;
  };

  return {
    otpToken: json.otpToken ?? json.data?.otpToken ?? json.otp_token ?? "",
  };
};

export const fetchCompanyRegistration = async <T = unknown>(
  payload: CompanyLookupPayload,
  otpToken: string
) => {
  const url = `${AUTH_API_BASE}/api/admin/${encodeURIComponent(payload.regId)}/${encodeURIComponent(payload.email)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "*/*",
      "Otp-Token": otpToken,
    },
  });

  const json = (await response.json().catch(() => null)) as CompanyLookupResponse<T> | null;

  // ✅ Wrong credentials or not found → throw with API message
  if (response.status === 404) {
    throw new Error(json?.message ?? "Wrong credentials. Please check your Registration ID and email.");
  }

  // ✅ Invalid/expired OTP token
  if (response.status === 401) {
    throw new Error(json?.message ?? "OTP verification failed. Please try again.");
  }

  // ✅ Any other error → throw and block
  if (!response.ok) {
    throw new Error(json?.message ?? "Failed to verify credentials. Please try again.");
  }

  const database = (json as any)?.data?.database ?? null;
  const tempToken = (json as any)?.temp_token ?? null;
  const isNew = (json as any)?.isNew ?? false;

  return {
    data: json?.data ?? null,
    status: response.status,
    message: json?.message ?? "",
    isRegistered: !isNew,
    database,
    tempToken,
    raw: json,
  };
};
export const checkCompanyExists = async (clientDb: string, regId: string) => {
  const url = `${COMPANY_API_BASE}/api/company/isExist/${encodeURIComponent(clientDb)}/${encodeURIComponent(regId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "*/*",
    },
  });

  const json = await response.json().catch(() => null);

  if (response.status === 400) {
    throw new Error(json?.message ?? "Registration ID mismatch.");
  }

  if (response.status === 409) {
    return {
      exists: true,
      data: json?.data ?? null,
      message: json?.message ?? "Company already exists.",
    };
  }

  if (!response.ok) {
    throw new Error(json?.message ?? "Failed to verify company registration.");
  }

  if (!json?.isSuccess || !json?.data) {
    return {
      exists: false,
      data: null,
      message: json?.message ?? "Company not found",
    };
  }

  return {
    exists: true,
    data: json.data as { regId: string; name: string },
    message: json.message ?? "Company found",
  };
};
