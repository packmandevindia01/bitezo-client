import { z } from "zod";

export const extrasTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(15, "Maximum 15 characters allowed"),
  arabicName: z.string().max(15, "Maximum 15 characters allowed").optional(),
});

export type ExtrasTypeForm = z.infer<typeof extrasTypeFormSchema>;

export interface ExtrasTypeRecord {
  typeId: number;
  name: string;
  sNo?: number;
}

export interface ExtrasTypeDetailRecord extends ExtrasTypeRecord {
  arabicName: string;
  createdAt: string;
  updatedAt?: string;
}
