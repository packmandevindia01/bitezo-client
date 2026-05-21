import axiosInstance from "../../../api/axiosInstance";
import type {
  CompanyLookupPayload,
  CompanyLookupResponse,
  SendOtpResponse,
  VerifyOtpResponse,
} from "../types";
import type { ApiResponse } from "../../inventory/product/types";

export interface OnboardBranchOption {
  branchId: number;
  branchName: string;
}

export interface OnboardCounterOption {
  counterId: number;
  counterName: string;
}

export interface OnboardSeriesOption {
  seriesId: number;
  seriesName: string;
}

export const sendCompanyOtp = async (regId: string, email: string): Promise<SendOtpResponse> => {
  const { data } = await axiosInstance.post<SendOtpResponse>("/auth/send-otp", { email }, {
    params: { regId, email },
  });

  // Handle "200-OK-but-logical-error" pattern
  if (data.status !== 200 || !data.isSuccess) {
    throw new Error(data.message || "Failed to send OTP. Please check your credentials.");
  }

  return data;
};

export const verifyCompanyOtp = async (regId: string, email: string, otp: string) => {
  const { data } = await axiosInstance.post<VerifyOtpResponse>("/auth/verify-otp", 
    { email, otp },
    { params: { regId } }
  );

  // Handle "200-OK-but-logical-error" pattern
  if (!data.otpToken || !data.otpToken.isSuccess) {
    throw new Error((data.otpToken as { message?: string })?.message || "OTP verification failed. Please try again.");
  }

  const tokenString = data.otpToken.data;

  return {
    otpToken: typeof tokenString === "string" ? tokenString : "",
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

    const raw = json as unknown as Record<string, unknown>;
    const rawData = raw?.data as Record<string, unknown> | null | undefined;
    const database = rawData?.database ?? null;
    const tempToken = raw?.temp_token ?? null;
    const isNew = (raw?.isNew ?? false) as boolean;

    return {
      data: json?.data ?? null,
      status: status,
      message: json?.message ?? "",
      isRegistered: !isNew,
      database,
      tempToken,
      raw: json,
    };
  } catch (err: unknown) {
    const axErr = err as { response?: { status?: number; data?: { message?: string } } };
    const json = axErr.response?.data;
    if (axErr.response?.status === 404) {
      throw new Error(json?.message ?? "Wrong credentials. Please check your Registration ID and email.");
    }
    if (axErr.response?.status === 401) {
      throw new Error(json?.message ?? "OTP verification failed. Please try again.");
    }
    throw new Error(json?.message ?? "Failed to verify credentials. Please try again.");
  }
};

export const checkCompanyExists = async (clientDb: string, regId: string) => {
  try {
    const { data: json, status } = await axiosInstance.get<Record<string, unknown>>(
      `/company/isExist/${encodeURIComponent(clientDb)}/${encodeURIComponent(regId)}`,
      {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404 || s === 409 || s === 400
      }
    );

    // 400 = bad request / regId mismatch — hard error
    if (status === 400) {
      throw new Error((json?.message as string) ?? "Registration ID mismatch.");
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
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: { message?: string } } };
    throw new Error(axErr.response?.data?.message || "Failed to verify company registration.");
  }
};

export const fetchOnboardBranches = async (
  allStatus: boolean = false
): Promise<OnboardBranchOption[]> => {
  const { data } = await axiosInstance.get<ApiResponse<OnboardBranchOption[]>>(
    `/Branch/${allStatus}/onboard-list-name`
  );

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load branches");
  }

  return data.data ?? [];
};

export const fetchOnboardCounters = async (
  branchId: string | number
): Promise<OnboardCounterOption[]> => {
  const { data } = await axiosInstance.get<ApiResponse<OnboardCounterOption[]>>(
    `/counter/${branchId}/onboard-list-name`
  );

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load counters");
  }

  return data.data ?? [];
};

export const fetchOnboardSeries = async (
  branchId: string | number
): Promise<OnboardSeriesOption[]> => {
  const { data } = await axiosInstance.get<ApiResponse<OnboardSeriesOption[]>>(
    `/voucherseries/${branchId}/onboard-list-name`
  );

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load voucher series");
  }

  return data.data ?? [];
};
