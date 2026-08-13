import { z } from "zod";

export const extrasMasterFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  arabic: z.string().optional(),
  typeId: z.coerce.number().min(1, "Type is required"),
  price: z.coerce.number().gt(0, "Price must be greater than zero"),
  color: z.string().optional(),
  branchIds: z.array(z.number()).min(1, "At least one branch must be allocated"),
  categoryIds: z.array(z.number()),
});

export type ExtrasMasterForm = z.infer<typeof extrasMasterFormSchema>;

export interface ExtrasMasterRecord {
  id: number;
  sNo: number;
  name: string;
  arabic?: string;
  color?: string;
  typeId?: number;
  price?: number;
  branchIds?: number[];
  categoryIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtrasDetailResponse {
  modifier: {
    id: number;
    name: string;
    arabic: string;
    color: string;
    typeId: number;
    price: number;
    createdAt?: string;
    updatedAt?: string;
  }[];
  branchIds: {
    id: number;
    name: string;
  }[] | null;
  categoryIds: {
    id: number;
    name: string;
  }[] | null;
}
