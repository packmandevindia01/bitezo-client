import { z } from "zod";

export const tableMasterFormSchema = z.object({
  sectionId: z.coerce.number().min(1, "Section is required"),
  tableName: z.string().trim()
    .min(1, "Table Name is required")
    .max(15, "Maximum 15 characters allowed"),
  chairs: z.coerce.number().min(1, "At least 1 chair is required"),
  isActive: z.boolean().default(true),
  position: z.number().default(0),
});

export type TableMasterForm = z.infer<typeof tableMasterFormSchema>;

export interface TableRecord {
  tableId: number;
  tableName: string;
  chairs: number;
  isActive: boolean;
  position: number;
}

export interface TableDetail extends TableRecord {
  sectionId: number;
}
