export interface CounterRecord {
  counterId: number;
  sNo: number;
  counterName: string;
  branch: string;
  branchId?: number; // Added for editing convenience
}

export interface CounterDetail {
  counterId: number;
  counterName: string;
  branchId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CounterForm {
  name: string;
  branchId: string; // Using string for Select compatibility
}

export interface CounterPayload {
  counterId?: number;
  counterName: string;
  branchId: number;
  createdAt?: string;
  updatedAt?: string;
}
