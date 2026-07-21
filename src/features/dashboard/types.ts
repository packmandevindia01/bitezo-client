export interface StatCardData {
  orderToday: string;
  customersToday: number;
  salesToday: string;
  salesTotal: string;
  employee: number;
}

export interface MonthlySale {
  month: string;
  amount: string;
}

export interface DailySale {
  day: string;
  amount: string;
}

export interface OrderTypeSale {
  orderType: string;
  amount: string;
}

export interface PaymodeSale {
  paymode: string;
  amount: string;
}

export interface AdminDashboardData {
  statcard: StatCardData;
  monthlysales: MonthlySale[];
  dailysales: DailySale[];
  ordertypsales: OrderTypeSale[];
  paymodesales: PaymodeSale[];
}

export interface AdminDashboardResponse {
  data: AdminDashboardData;
  status: number;
  message: string;
  correlationId: string;
  errors: any[];
  isSuccess: boolean;
  timestamp: string;
  debug: any;
}
