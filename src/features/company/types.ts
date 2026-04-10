export interface CompanyFormData {
  custName: string;
  custMob: string;
  custMob2?: string;

  country: string;

  block?: string;
  area?: string;
  road?: string;
  building?: string;

  branchCount: number;

  regId: string;
  startDate: string;
  isDemo: boolean;
  flatNo: string,
  database: string;

  // ✅ NEW FIELDS (based on your design)
  crNo?: string;
  email?: string;
  taxRegNo?: string;

  currency: string;
  decimals: string;

  customerId: string;
}

export interface CompanyLookupPayload {
  regId: string;
  email: string;
}

export interface CompanyOnboardingState {
  regId: string;
  email: string;
  otp: string[];
  otpToken: string;
  tempToken?: string;
}

export interface SendOtpResponse {
  message: string;
}

export interface VerifyOtpResponse {
  otpToken: string;
}

export interface CompanyLookupResponse<T = unknown> {
  data: T | null;
  status: number;
  message: string;
  correlationId?: string;
  errors?: string[];
  isSuccess?: boolean;
}

export interface CompanyMasterOption {
  id: number;
  name: string;
  code?: string;
}

export interface CompanyMasterloadResponse {
  data?: {
    countries?: CompanyMasterOption[];
    countryList?: CompanyMasterOption[];
    currency?: CompanyMasterOption[];
    currencies?: CompanyMasterOption[];
    currencyList?: CompanyMasterOption[];
  } | null;
  message?: string;
  isSuccess?: boolean;
}
