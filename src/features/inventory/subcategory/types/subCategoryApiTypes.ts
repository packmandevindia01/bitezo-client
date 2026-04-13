export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: string[];
  isSuccess: boolean;
}

export interface SubCategoryListItem {
  id: number;
  code: string;
  name: string;
  arabicName?: string;
  categoryName?: string;
  categoryId?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubCategoryPayload {
  code: string;
  name: string;
  arabicName: string;
  categoryId: number;
  isActive: boolean;
  fileName: string;
  filePath: string;
  createdAt?: string;
}

export interface UpdateSubCategoryPayload {
  subCatId: number;
  code: string;
  name: string;
  arabicName: string;
  categoryId: number;
  isActive: boolean;
  fileName: string;
  filePath: string;
  updatedAt?: string;
}
