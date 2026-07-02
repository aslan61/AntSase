import { PrismaClient } from '@prisma/client';
import { normalizeVehicleRow } from '@sase/shared';
import type { SaveUploadInput, SnapshotRecord, StoredPlacement, UploadDetail, UploadRepository, UploadSummary } from './types.js';

export class PrismaUploadRepository implements UploadRepository {
  public constructor(private readonly prisma = new PrismaClient()) {}

  public async saveUpload(input: SaveUploadInput): Promise<UploadSummary> {
    return this.prisma.$transaction(async (tx) => {
      const upload = await tx.upload.create({
        data: {
          filename: input.filename,
          totalRows: input.rows.length,
          validCount: input.report.placements.length,
          warningCount: input.report.warnings.length,
          unplacedCount: input.report.unplaced.length,
        },
      });
      const placementRows = new Map(input.report.placements.map((item) => [item.rowIndex, item]));
      for (const source of input.rows) {
        const row = normalizeVehicleRow(source);
        const placement = placementRows.get(row.rowIndex);
        const vehicle = await tx.vehicle.create({
          data: { uploadId: upload.id, saseNo: row.saseNo, category: row.category, slotNumber: row.slotNumber, rowIndex: row.rowIndex, valid: Boolean(placement) },
        });
        if (placement) {
          await tx.placement.create({
            data: {
              uploadId: upload.id,
              vehicleId: vehicle.id,
              sahaId: placement.sahaId,
              blockId: placement.blockId,
              slotIndex: placement.slotIndex,
              col: placement.col,
              row: placement.row,
            },
          });
        }
      }
      return upload;
    });
  }

  public async listUploads(skip: number, take: number): Promise<{ items: readonly UploadSummary[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.upload.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.upload.count(),
    ]);
    return { items, total };
  }

  public async getUpload(id: string): Promise<UploadDetail | null> {
    const upload = await this.prisma.upload.findUnique({ include: { vehicles: { orderBy: { rowIndex: 'asc' } } }, where: { id } });
    if (!upload) return null;
    return { ...upload, rows: upload.vehicles.map(({ saseNo, category, slotNumber, rowIndex }) => ({ saseNo, category, slotNumber, rowIndex })) };
  }

  public async getPlacements(id: string, filters?: { sahaId?: string; blockId?: string }): Promise<readonly StoredPlacement[]> {
    const items = await this.prisma.placement.findMany({
      where: { uploadId: id, ...(filters?.sahaId ? { sahaId: filters.sahaId } : {}), ...(filters?.blockId ? { blockId: filters.blockId } : {}) },
      include: { vehicle: true },
      orderBy: [{ sahaId: 'asc' }, { blockId: 'asc' }, { slotIndex: 'asc' }],
    });
    return items.map(({ vehicle, ...item }) => ({ ...item, saseNo: vehicle.saseNo, category: vehicle.category, rowIndex: vehicle.rowIndex }));
  }

  public async saveSnapshot(uploadId: string, name: string, data: Readonly<Record<string, unknown>>): Promise<SnapshotRecord> {
    const result = await this.prisma.snapshot.create({ data: { uploadId, name, dataJson: JSON.stringify(data) } });
    return { ...result, data: JSON.parse(result.dataJson) as Readonly<Record<string, unknown>> };
  }

  public async getSnapshot(id: string): Promise<SnapshotRecord | null> {
    const result = await this.prisma.snapshot.findUnique({ where: { id } });
    return result ? { ...result, data: JSON.parse(result.dataJson) as Readonly<Record<string, unknown>> } : null;
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
