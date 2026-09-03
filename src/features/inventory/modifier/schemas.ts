import { z } from "zod";

export const modifierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  arabic: z.string().optional(),
  typeId: z.coerce.number().optional(),
  color: z.string().optional(),
  branchIds: z.array(z.number()).min(1, "At least one branch must be allocated"),
  categoryIds: z.array(z.number()),
});

export type ModifierForm = z.infer<typeof modifierFormSchema>;

export interface ModifierRecord {
  id: number;
  sNo: number;
  name: string;
  arabic?: string;
  color?: string;
  typeId?: number;
  branchIds?: number[];
  categoryIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ModifierDetailResponse {
  modifier: {
    id: number;
    name: string;
    arabic: string;
    color: string;
    typeId: number;
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
