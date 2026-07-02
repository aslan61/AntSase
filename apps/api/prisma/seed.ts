import { PrismaClient } from '@prisma/client';
import { placeVehicles } from '@sase/shared';
import { PrismaUploadRepository } from '../src/repository/prisma.js';

const prisma = new PrismaClient();
const repository = new PrismaUploadRepository(prisma);
const rows = [
  { saseNo: 'WDD-SEED-A-001', category: 'A', rowIndex: 2 },
  { saseNo: 'WDD-SEED-K-001', category: 'K', rowIndex: 3 },
  { saseNo: 'WDD-SEED-PDI-001', category: 'PDI', rowIndex: 4 },
];

await repository.saveUpload({ filename: 'ornek-karisik.xlsx', rows, report: placeVehicles(rows) });
await repository.disconnect();
