export type BlockSide = 'L' | 'R' | 'full';
export type FillDirection = 'colMajor' | 'rowMajor';
export type SpecialBlock = 'S_CLASS' | 'PDI';

export interface ZoneBlock {
  readonly id: string;
  readonly category: string;
  readonly label: string;
  readonly side: BlockSide;
  readonly row: number;
  readonly capacity: number;
  readonly cols: number;
  readonly fill: FillDirection;
  /** PDF'deki fiziksel peron sırasına göre her peronun araç derinliği. */
  readonly laneDepths: readonly number[];
  /** PDF üzerinde yazan harf; operasyonel Excel harfinden farklı olabilir. */
  readonly planLabel?: string;
  readonly special?: SpecialBlock;
}

export interface Saha {
  readonly id: string;
  readonly name: string;
  readonly total: number;
  readonly worldOrder: number;
  readonly blocks: readonly ZoneBlock[];
}

export interface VehicleRow {
  readonly saseNo: unknown;
  readonly category: unknown;
  readonly slotNumber?: unknown;
  readonly rowIndex: number;
}

export interface NormalizedVehicleRow {
  readonly saseNo: string;
  readonly category: string;
  readonly slotNumber: number | null;
  readonly rowIndex: number;
}

export type UnplacedReason =
  | 'EMPTY_SASE'
  | 'EMPTY_CATEGORY'
  | 'INVALID_CATEGORY'
  | 'INVALID_SLOT'
  | 'SLOT_OCCUPIED'
  | 'DUPLICATE'
  | 'CAPACITY_EXCEEDED';

export type PlacementWarningCode = UnplacedReason | 'ADDRESS_OUT_OF_RANGE' | 'PERON_OVERFLOW';

export interface Placement {
  readonly saseNo: string;
  readonly category: string;
  readonly requestedSlot: number | null;
  readonly rowIndex: number;
  readonly sahaId: string;
  readonly blockId: string;
  readonly slotIndex: number;
  readonly col: number;
  readonly row: number;
}

export interface UnplacedRow {
  readonly saseNo: string;
  readonly category: string;
  readonly slotNumber: number | null;
  readonly rowIndex: number;
  readonly reason: UnplacedReason;
}

export interface PlacementWarning {
  readonly rowIndex: number;
  readonly code: PlacementWarningCode;
  readonly message: string;
}

export interface PlacementResult {
  readonly placements: readonly Placement[];
  readonly unplaced: readonly UnplacedRow[];
  readonly warnings: readonly PlacementWarning[];
}

export interface SlotCoordinate {
  readonly col: number;
  readonly row: number;
}
