export interface SectionRecord {
  sectionId: number;
  sNo: number;
  name: string;
  counter: string;
}

export interface SectionDetail {
  sectionId: number;
  sectionName: string;
  counterId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SectionForm {
  name: string;
  counterId: string; // String for Select compatibility
}

export interface SectionPayload {
  sectionId?: number;
  sectionName: string;
  counterId: number;
  createdAt?: string;
  updatedAt?: string;
}
