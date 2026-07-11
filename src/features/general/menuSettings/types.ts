export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: any[];
  isSuccess: boolean;
}

export interface MutationResult {
  id: number;
}

export interface MenuSettingsListItem {
  menuId: number;
  sNo: number;
  code: string;
  name: string;
  isActive: "Active" | "Inactive";
}

export interface MenuSettingsDetail {
  menuId: number;
  code: string;
  name: string;
  arabicName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  startTime: string;
  endTime: string;
}

export interface CreateMenuSettingsPayload {
  code: string;
  name: string;
  arabicName: string;
  isActive: boolean;
  createdAt: string;
  startTime: string;
  endTime: string;
}

export interface UpdateMenuSettingsPayload {
  menuId: number;
  code: string;
  name: string;
  arabicName: string;
  isActive: boolean;
  updatedAt: string;
  startTime: string;
  endTime: string;
}
