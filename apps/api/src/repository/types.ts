import type { PlacementResult, VehicleRow } from '@sase/shared';

export interface UploadSummary {
  readonly id: string;
  readonly filename: string;
  readonly createdAt: Date;
  readonly totalRows: number;
  readonly validCount: number;
  readonly warningCount: number;
  readonly unplacedCount: number;
}

export interface StoredPlacement {
  readonly id: string;
  readonly uploadId: string;
  readonly vehicleId: string;
  readonly saseNo: string;
  readonly category: string;
  readonly rowIndex: number;
  readonly sahaId: string;
  readonly blockId: string;
  readonly slotIndex: number;
  readonly col: number;
  readonly row: number;
}

export interface SnapshotRecord {
  readonly id: string;
  readonly uploadId: string;
  readonly name: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
}

export interface UploadDetail extends UploadSummary {
  readonly rows: readonly VehicleRow[];
}

export interface SaveUploadInput {
  readonly filename: string;
  readonly rows: readonly VehicleRow[];
  readonly report: PlacementResult;
}

export interface UploadRepository {
  saveUpload(input: SaveUploadInput): Promise<UploadSummary>;
  listUploads(skip: number, take: number): Promise<{ readonly items: readonly UploadSummary[]; readonly total: number }>;
  getUpload(id: string): Promise<UploadDetail | null>;
  getPlacements(id: string, filters?: { readonly sahaId?: string; readonly blockId?: string }): Promise<readonly StoredPlacement[]>;
  saveSnapshot(uploadId: string, name: string, data: Readonly<Record<string, unknown>>): Promise<SnapshotRecord>;
  getSnapshot(id: string): Promise<SnapshotRecord | null>;
  disconnect(): Promise<void>;
}
