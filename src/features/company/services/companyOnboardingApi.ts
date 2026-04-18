import axiosInstance from "../../../api/axiosInstance";
import type {
  CompanyLookupPayload,
  CompanyLookupResponse,
  SendOtpResponse,
} from "../types";

export const sendCompanyOtp = async (regId: string, email: string): Promise<SendOtpResponse> => {
  const { data } = await axiosInstance.post<SendOtpResponse>("/auth/send-otp", null, {
    params: { regId, email }
  });

  return data;
};

export const verifyCompanyOtp = async (regId: string, email: string, otp: string) => {
  const { data } = await axiosInstance.post<any>("/auth/verify-otp", 
    { email, otp },
    { params: { regId } }
  );

  return {
    otpToken: data.otpToken ?? data.data?.otpToken ?? data.otp_token ?? "",
  };
};

export const fetchCompanyRegistration = async <T = unknown>(
  payload: CompanyLookupPayload,
  otpToken: string
) => {
  try {
    const { data: json, status } = await axiosInstance.get<CompanyLookupResponse<T>>(
      `/admin/${encodeURIComponent(payload.regId)}/${encodeURIComponent(payload.email)}`,
      {
        headers: { "Otp-Token": otpToken },
      }
    );

    const database = (json as any)?.data?.database ?? null;
    const tempToken = (json as any)?.temp_token ?? null;
    const isNew = (json as any)?.isNew ?? false;

    return {
      data: json?.data ?? null,
      status: status,
      message: json?.message ?? "",
      isRegistered: !isNew,
      database,
      tempToken,
      raw: json,
    };
  } catch (err: any) {
    const json = err.response?.data;
    if (err.response?.status === 404) {
      throw new Error(json?.message ?? "Wrong credentials. Please check your Registration ID and email.");
    }
    if (err.response?.status === 401) {
      throw new Error(json?.message ?? "OTP verification failed. Please try again.");
    }
    throw new Error(json?.message ?? "Failed to verify credentials. Please try again.");
  }
};

export const checkCompanyExists = async (clientDb: string, regId: string) => {
  try {
    const { data: json, status } = await axiosInstance.get<any>(
      `/company/isExist/${encodeURIComponent(clientDb)}/${encodeURIComponent(regId)}`,
      {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404 || s === 409 || s === 400
      }
    );

    // 400 = bad request / regId mismatch — hard error
    if (status === 400) {
      throw new Error(json?.message ?? "Registration ID mismatch.");
    }

    // 404 = "Company not created yet" — this is the HAPPY PATH for new customers
    if (status === 404) {
      return {
        exists: false,
        data: null,
        message: json?.message ?? "Company not found. Proceed to create the company.",
      };
    }

    // 409 = company already exists
    if (status === 409) {
      return {
        exists: true,
        data: json?.data ?? null,
        message: json?.message ?? "Company already exists.",
      };
    }

    // 200 with data = company found
    if (json?.isSuccess && json?.data) {
      return {
        exists: true,
        data: json.data as { regId: string; name: string },
        message: json.message ?? "Company found",
      };
    }

    return {
      exists: false,
      data: null,
      message: json?.message ?? "Company not found.",
    };
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Failed to verify company registration.");
  }
};
