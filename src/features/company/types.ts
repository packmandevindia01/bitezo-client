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