import { z } from 'zod';
import { VALID_CATEGORIES } from './sahalar.js';

export const vehicleRowSchema = z.object({
  saseNo: z.unknown(),
  category: z.unknown(),
  slotNumber: z.unknown().optional(),
  rowIndex: z.number().int().nonnegative(),
});

export const jsonUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255).default('veriler.json'),
  rows: z.array(vehicleRowSchema).max(5000),
});

export const uploadIdParamsSchema = z.object({ id: z.string().trim().min(1) });

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const snapshotBodySchema = z.object({
  uploadId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  data: z.record(z.string(), z.unknown()),
});

export const validCategorySchema = z.enum(VALID_CATEGORIES as [string, ...string[]]);

export type JsonUpload = z.infer<typeof jsonUploadSchema>;
export type SnapshotBody = z.infer<typeof snapshotBodySchema>;
