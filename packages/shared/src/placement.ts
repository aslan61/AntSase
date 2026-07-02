import { SAHALAR, VALID_CATEGORIES } from './sahalar.js';
import type {
  NormalizedVehicleRow,
  Placement,
  PlacementResult,
  PlacementWarning,
  PlacementWarningCode,
  Saha,
  SlotCoordinate,
  UnplacedReason,
  UnplacedRow,
  VehicleRow,
  ZoneBlock,
} from './types.js';

const SIDE_ORDER: Readonly<Record<ZoneBlock['side'], number>> = { L: 0, R: 1, full: 2 };
const VALID_CATEGORY_SET = new Set(VALID_CATEGORIES);
const BLOCK_ENTRIES = SAHALAR.flatMap((saha) => saha.blocks.map((block) => ({ saha, block })));

export interface CategoryBlock {
  readonly saha: Saha;
  readonly block: ZoneBlock;
}

export interface ParsedAddress {
  readonly category: string;
  readonly peronNumber: number | null;
  readonly raw: string;
}

const cleanCategory = (value: string): string => value.trim().toLocaleUpperCase('tr-TR');

/** H10, H-10, L-R-5 ve yalnız harf içeren adresleri ortak modele çevirir. */
export function parseAddress(value: unknown): ParsedAddress {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const upper = cleanCategory(raw);
  const sideAddress = upper.match(/^([A-ZÇĞİÖŞÜ])\s*[-_/]\s*([LR])(?:\s*[-_/ ]\s*0*(\d+))?$/u);
  if (sideAddress) {
    return {
      category: `${sideAddress[1]}-${sideAddress[2]}`,
      peronNumber: sideAddress[3] ? Number(sideAddress[3]) : null,
      raw,
    };
  }
  const combined = upper.replaceAll(/\s+/g, '').match(/^([A-ZÇĞİÖŞÜ]+?)[-_/]?0*(\d+)$/u);
  if (combined) return { category: combined[1] ?? '', peronNumber: Number(combined[2]), raw };
  return { category: upper, peronNumber: null, raw };
}

export function buildCategoryIndex(sahalar: readonly Saha[] = SAHALAR): Map<string, CategoryBlock[]> {
  const index = new Map<string, CategoryBlock[]>();
  for (const saha of [...sahalar].sort((a, b) => a.worldOrder - b.worldOrder)) {
    for (const zone of saha.blocks) {
      const current = index.get(zone.category) ?? [];
      current.push({ saha, block: zone });
      current.sort((a, b) => SIDE_ORDER[a.block.side] - SIDE_ORDER[b.block.side]);
      index.set(zone.category, current);
    }
  }
  return index;
}

function coordinates(block: ZoneBlock): SlotCoordinate[] {
  if (block.fill === 'rowMajor') {
    const result: SlotCoordinate[] = [];
    const maxDepth = Math.max(...block.laneDepths);
    for (let row = 0; row < maxDepth; row += 1) {
      for (let col = 0; col < block.laneDepths.length; col += 1) {
        if ((block.laneDepths[col] ?? 0) > row) result.push({ col, row });
      }
    }
    return result;
  }
  return block.laneDepths.flatMap((depth, col) => Array.from({ length: depth }, (_, row) => ({ col, row })));
}

export function slotToLocal(block: ZoneBlock, slotIndex: number): SlotCoordinate {
  if (!Number.isInteger(slotIndex) || slotIndex < 1 || slotIndex > block.capacity) {
    throw new RangeError(`Slot ${slotIndex}, ${block.id} bloğu için 1-${block.capacity} aralığında olmalıdır.`);
  }
  const coordinate = coordinates(block)[slotIndex - 1];
  if (!coordinate) throw new RangeError(`Slot ${slotIndex}, ${block.id} bloğunda bulunamadı.`);
  return coordinate;
}

function slotIndicesForColumn(block: ZoneBlock, col: number): number[] {
  return coordinates(block)
    .map((coordinate, index) => ({ coordinate, slotIndex: index + 1 }))
    .filter((item) => item.coordinate.col === col)
    .map((item) => item.slotIndex);
}

function asTrimmedString(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

export function normalizeVehicleRow(row: VehicleRow): NormalizedVehicleRow {
  const parsed = parseAddress(row.category);
  const explicitSlot = asTrimmedString(row.slotNumber);
  const rawSlot = explicitSlot || (parsed.peronNumber === null ? '' : String(parsed.peronNumber));
  const numericSlot = rawSlot === '' ? null : Number(rawSlot);
  return {
    saseNo: asTrimmedString(row.saseNo),
    category: parsed.category,
    slotNumber: numericSlot !== null && Number.isInteger(numericSlot) ? numericSlot : rawSlot === '' ? null : Number.NaN,
    rowIndex: row.rowIndex,
  };
}

function warning(row: NormalizedVehicleRow, code: PlacementWarningCode, message: string): PlacementWarning {
  return { rowIndex: row.rowIndex, code, message };
}

function slotKey(target: CategoryBlock, slotIndex: number): string {
  return `${target.saha.id}:${target.block.id}:${slotIndex}`;
}

export function placeVehicles(rows: readonly VehicleRow[]): PlacementResult {
  const categoryIndex = buildCategoryIndex();
  const categoryCounts = new Map<string, number>();
  const seenSase = new Set<string>();
  const occupiedSlots = new Set<string>();
  const placements: Placement[] = [];
  const unplaced: UnplacedRow[] = [];
  const warnings: PlacementWarning[] = [];

  const reject = (row: NormalizedVehicleRow, reason: UnplacedReason, message: string): void => {
    unplaced.push({ ...row, reason });
    warnings.push(warning(row, reason, message));
  };

  for (const sourceRow of rows) {
    const normalized = normalizeVehicleRow(sourceRow);
    const compactCategory = normalized.category.replaceAll(/[\s_-]+/g, '');
    const isSClassAlias = ['SCLASS', 'SCLASS72ADET', 'SCLASS72', 'S'].includes(compactCategory);
    const row: NormalizedVehicleRow = { ...normalized, category: isSClassAlias ? 'A-L' : normalized.category };

    if (!row.saseNo) {
      reject(row, 'EMPTY_SASE', `Satır ${row.rowIndex}: Şase No boş.`);
      continue;
    }
    if (!row.category) {
      reject(row, 'EMPTY_CATEGORY', `Satır ${row.rowIndex}: Adres/Peron boş.`);
      continue;
    }

    const directBlock = BLOCK_ENTRIES.find(({ block }) => block.id.replaceAll(/[\s_-]+/g, '') === row.category.replaceAll(/[\s_-]+/g, ''));
    if (!VALID_CATEGORY_SET.has(row.category) && !directBlock) {
      reject(row, 'INVALID_CATEGORY', `Satır ${row.rowIndex}: “${sourceRow.category}” iki PDF planında tanımlı bir adres değil.`);
      continue;
    }
    if (row.slotNumber !== null && (!Number.isFinite(row.slotNumber) || row.slotNumber < 1)) {
      reject(row, 'INVALID_SLOT', `Satır ${row.rowIndex}: Peron numarası pozitif bir tam sayı olmalıdır.`);
      continue;
    }

    const dedupeKey = row.saseNo.toLocaleUpperCase('tr-TR');
    if (seenSase.has(dedupeKey)) {
      reject(row, 'DUPLICATE', `Satır ${row.rowIndex}: “${row.saseNo}” daha önce işlendi; tekrar atlandı.`);
      continue;
    }
    seenSase.add(dedupeKey);

    const category = directBlock?.block.category ?? row.category;
    const blocks = directBlock ? [directBlock] : categoryIndex.get(category) ?? [];
    let target: CategoryBlock | undefined;
    let chosenSlot: number | undefined;

    if (row.slotNumber !== null) {
      const columns = blocks.flatMap((candidate) => candidate.block.laneDepths.map((_depth, col) => ({ candidate, col })));
      if (columns.length === 0) {
        reject(row, 'CAPACITY_EXCEEDED', `Satır ${row.rowIndex}: ${category} için park karesi bulunamadı.`);
        continue;
      }
      const requestedColumn = row.slotNumber - 1;
      const wrappedColumn = requestedColumn % columns.length;
      const preferred = columns[wrappedColumn];
      if (!preferred) {
        reject(row, 'CAPACITY_EXCEEDED', `Satır ${row.rowIndex}: ${category}${row.slotNumber} peronu çözümlenemedi.`);
        continue;
      }
      if (requestedColumn >= columns.length) {
        warnings.push(warning(row, 'ADDRESS_OUT_OF_RANGE', `Satır ${row.rowIndex}: ${category}${row.slotNumber} plan sınırını aşıyor; aynı bloktaki en yakın fiziksel perona yönlendirildi.`));
      }
      const preferredSlots = slotIndicesForColumn(preferred.candidate.block, preferred.col);
      chosenSlot = preferredSlots.find((slotIndex) => !occupiedSlots.has(slotKey(preferred.candidate, slotIndex)));
      target = preferred.candidate;

      if (chosenSlot === undefined) {
        const orderedColumns = columns
          .map((column, index) => ({ ...column, distance: Math.abs(index - wrappedColumn) }))
          .sort((a, b) => a.distance - b.distance);
        for (const column of orderedColumns) {
          const available = slotIndicesForColumn(column.candidate.block, column.col)
            .find((slotIndex) => !occupiedSlots.has(slotKey(column.candidate, slotIndex)));
          if (available !== undefined) {
            target = column.candidate;
            chosenSlot = available;
            warnings.push(warning(row, 'PERON_OVERFLOW', `Satır ${row.rowIndex}: ${category}${row.slotNumber} peronu dolu; araç aynı harfin en yakın boş karesine alındı.`));
            break;
          }
        }
      }
    } else {
      let globalOffset = categoryCounts.get(category) ?? 0;
      const allSlots = blocks.flatMap((candidate) => Array.from({ length: candidate.block.capacity }, (_, index) => ({ candidate, slotIndex: index + 1 })));
      while (globalOffset < allSlots.length && occupiedSlots.has(slotKey(allSlots[globalOffset]!.candidate, allSlots[globalOffset]!.slotIndex))) globalOffset += 1;
      const available = allSlots[globalOffset];
      if (available) {
        target = available.candidate;
        chosenSlot = available.slotIndex;
        categoryCounts.set(category, globalOffset + 1);
      }
    }

    if (!target || chosenSlot === undefined) {
      reject(row, 'CAPACITY_EXCEEDED', `Satır ${row.rowIndex}: ${category} alanında boş park karesi kalmadı.`);
      continue;
    }

    occupiedSlots.add(slotKey(target, chosenSlot));
    const coordinate = slotToLocal(target.block, chosenSlot);
    placements.push({
      ...row,
      category,
      requestedSlot: row.slotNumber,
      sahaId: target.saha.id,
      blockId: target.block.id,
      slotIndex: chosenSlot,
      ...coordinate,
    });
  }
  return { placements, unplaced, warnings };
}
