import type { Saha, ZoneBlock } from './types.js';

type BlockInput = Omit<ZoneBlock, 'capacity' | 'cols' | 'fill'> & {
  readonly fill?: ZoneBlock['fill'];
};

const repeat = (depth: number, count: number): readonly number[] => Array.from({ length: count }, () => depth);

const block = (value: BlockInput): ZoneBlock => ({
  ...value,
  capacity: value.laneDepths.reduce((sum, depth) => sum + depth, 0),
  cols: value.laneDepths.length,
  fill: value.fill ?? 'colMajor',
});

/**
 * Operasyonel A-J adresleri, PDF'deki fiziksel bloklara sırayla bağlanır.
 * planLabel PDF üzerinde görülen harfi, category ise Excel'deki ADRES harfini taşır.
 * Değişken laneDepths değerleri Saha 1 PDF'sindeki gerçek çizili kare profilleridir.
 */
export const SAHALAR: readonly Saha[] = [
  {
    id: 'saha-1',
    name: 'Saha 1',
    total: 832,
    worldOrder: 0,
    blocks: [
      block({ id: 'A-L', category: 'A', label: 'A · S CLASS', planLabel: 'A / S CLASS', side: 'L', row: 0, laneDepths: repeat(3, 24), special: 'S_CLASS' }),
      block({ id: 'B', category: 'B', label: 'B · PDF A', planLabel: 'A', side: 'R', row: 0, laneDepths: repeat(3, 21) }),
      block({ id: 'C', category: 'C', label: 'C', planLabel: 'C', side: 'L', row: 1, laneDepths: [...repeat(3, 21), 2, 1] }),
      block({ id: 'D', category: 'D', label: 'D · PDF B', planLabel: 'B', side: 'R', row: 1, laneDepths: repeat(3, 19) }),
      block({ id: 'E', category: 'E', label: 'E', planLabel: 'E', side: 'L', row: 2, laneDepths: [...repeat(6, 14), 5, 4, 3, 2, 1] }),
      block({ id: 'F', category: 'F', label: 'F · PDF D', planLabel: 'D', side: 'R', row: 2, laneDepths: repeat(6, 19) }),
      block({ id: 'G', category: 'G', label: 'G', planLabel: 'G', side: 'L', row: 3, laneDepths: [...repeat(8, 9), 5, 2, 1] }),
      block({ id: 'H', category: 'H', label: 'H · PDF F', planLabel: 'F', side: 'R', row: 3, laneDepths: [...repeat(7, 10), 5, 5] }),
      block({ id: 'PDI', category: 'P', label: 'P · PDI', planLabel: 'PDI', side: 'R', row: 3, laneDepths: repeat(6, 5), special: 'PDI' }),
      block({ id: 'I', category: 'I', label: 'I', planLabel: 'I', side: 'L', row: 4, laneDepths: [...repeat(8, 11), 5, 2] }),
      block({ id: 'J', category: 'J', label: 'J · PDF H', planLabel: 'H', side: 'R', row: 4, laneDepths: repeat(4, 19) }),
    ],
  },
  {
    id: 'saha-2',
    name: 'Saha 2',
    total: 410,
    worldOrder: 1,
    blocks: [
      block({ id: 'K', category: 'K', label: 'K', planLabel: 'K', side: 'full', row: 0, laneDepths: repeat(3, 18) }),
      block({ id: 'L-L', category: 'L', label: 'L · Sol', planLabel: 'L', side: 'L', row: 1, laneDepths: repeat(5, 8) }),
      block({ id: 'L-R', category: 'L', label: 'L · Sağ', planLabel: 'L', side: 'R', row: 1, laneDepths: repeat(5, 8) }),
      block({ id: 'M-L', category: 'M', label: 'M · Sol', planLabel: 'M', side: 'L', row: 2, laneDepths: repeat(5, 8) }),
      block({ id: 'M-R', category: 'M', label: 'M · Sağ', planLabel: 'M', side: 'R', row: 2, laneDepths: repeat(5, 8) }),
      block({ id: 'N-L', category: 'N', label: 'N · Sol', planLabel: 'N', side: 'L', row: 3, laneDepths: repeat(5, 8) }),
      block({ id: 'N-R', category: 'N', label: 'N · Sağ', planLabel: 'N', side: 'R', row: 3, laneDepths: repeat(5, 8) }),
      block({ id: 'O-L', category: 'O', label: 'O · Sol', planLabel: 'O', side: 'L', row: 4, laneDepths: repeat(5, 8) }),
      block({ id: 'O-R', category: 'O', label: 'O · Sağ', planLabel: 'O', side: 'R', row: 4, laneDepths: repeat(5, 8) }),
      block({ id: 'R', category: 'R', label: 'R', planLabel: 'R', side: 'full', row: 5, laneDepths: repeat(2, 18) }),
    ],
  },
] as const;

export const VALID_CATEGORIES = Object.freeze(
  Array.from(new Set(SAHALAR.flatMap((saha) => saha.blocks.map((item) => item.category)))),
);

export const SAHA_BY_ID = new Map(SAHALAR.map((saha) => [saha.id, saha]));

export const BLOCK_BY_ID = new Map(
  SAHALAR.flatMap((saha) => saha.blocks.map((item) => [item.id, item] as const)),
);
