import { randomUUID } from 'node:crypto';
import type { VehicleRow } from '@sase/shared';
import type { SaveUploadInput, SnapshotRecord, StoredPlacement, UploadDetail, UploadRepository, UploadSummary } from './types.js';

export class MemoryUploadRepository implements UploadRepository {
  private readonly uploads = new Map<string, UploadDetail>();
  private readonly placements = new Map<string, StoredPlacement[]>();
  private readonly snapshots = new Map<string, SnapshotRecord>();

  public async saveUpload(input: SaveUploadInput): Promise<UploadSummary> {
    const id = randomUUID();
    const createdAt = new Date();
    const summary: UploadSummary = {
      id,
      filename: input.filename,
      createdAt,
      totalRows: input.rows.length,
      validCount: input.report.placements.length,
      warningCount: input.report.warnings.length,
      unplacedCount: input.report.unplaced.length,
    };
    const rows: VehicleRow[] = input.rows.map((row) => ({ ...row }));
    this.uploads.set(id, { ...summary, rows });
    this.placements.set(
      id,
      input.report.placements.map((placement) => ({
        id: randomUUID(),
        uploadId: id,
        vehicleId: randomUUID(),
        ...placement,
      })),
    );
    return summary;
  }

  public async listUploads(skip: number, take: number): Promise<{ items: readonly UploadSummary[]; total: number }> {
    const all = [...this.uploads.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  public async getUpload(id: string): Promise<UploadDetail | null> {
    return this.uploads.get(id) ?? null;
  }

  public async getPlacements(id: string, filters?: { sahaId?: string; blockId?: string }): Promise<readonly StoredPlacement[]> {
    return (this.placements.get(id) ?? []).filter(
      (item) => (!filters?.sahaId || item.sahaId === filters.sahaId) && (!filters?.blockId || item.blockId === filters.blockId),
    );
  }

  public async saveSnapshot(uploadId: string, name: string, data: Readonly<Record<string, unknown>>): Promise<SnapshotRecord> {
    const snapshot: SnapshotRecord = { id: randomUUID(), uploadId, name, data, createdAt: new Date() };
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  public async getSnapshot(id: string): Promise<SnapshotRecord | null> {
    return this.snapshots.get(id) ?? null;
  }

  public async disconnect(): Promise<void> {}
}
