export interface PaymodeRecord {
  paymodeId: number;
  sNo: number;
  code: number;
  paymodeName: string;
  isActive: string | boolean; // API returns string "Active", Form uses boolean
}

export interface PaymodeForm {
  paymodeId: number;
  code: string | number;
  paymodeName: string;
  isActive: boolean;
  counterIds: number[];
}

export interface CounterOption {
  counterId: number;
  counterName: string;
}

export interface PaymodeDetailResponse {
  paymode: {
    paymodeId: number;
    code: number;
    paymodeName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  counter: {
    counterId: number;
    counterName: string;
  }[];
}

