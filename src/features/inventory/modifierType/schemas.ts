import { z } from "zod";

export const modifierTypeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  arabicName: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number").optional().default(0),
});

export type ModifierTypeForm = z.infer<typeof modifierTypeFormSchema>;

export interface ModifierTypeRecord {
  typeId: number;
  name: string;
  arabicName: string;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
  sNo?: number;
}
