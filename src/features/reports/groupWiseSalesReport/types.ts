export interface GroupWiseSalesReportParams {
  BranchId: number;
  GroupId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface GroupWiseSalesRow {
  groupId?: number;
  grpId?: number;
  groupCode?: string;
  code?: string;
  groupName?: string;
  name?: string;
  group?: string;
  qty?: number | string;
  quantity?: number | string;
  totalQty?: number | string;
  amount?: number | string;
  discount?: number | string;
  netValue?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface GroupWiseTotalData {
  amount?: number | string;
  discount?: number | string;
  netValue?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface GroupWiseSalesReportData {
  groupData: GroupWiseSalesRow[] | null;
  totalData: GroupWiseTotalData | null;
}

export interface GroupWiseSalesReportResponse {
  data: GroupWiseSalesReportData;
  status: number;
  message: string;
  correlationId?: string;
  errors?: any[];
  isSuccess: boolean;
  timestamp?: string;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface GroupOption {
  grpId: number;
  code?: string;
  name: string;
  isActive?: string | boolean;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess: boolean;
  errors?: any[];
}
