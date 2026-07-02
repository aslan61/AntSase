import { SAHALAR, BLOCK_BY_ID } from '@sase/shared';
import type { Saha, ZoneBlock } from '@sase/shared';
import { SCENE_CONFIG } from '../config';

const pitchX = SCENE_CONFIG.slotWidth + SCENE_CONFIG.slotGap;
const pitchZ = SCENE_CONFIG.slotDepth + SCENE_CONFIG.slotGap;

export interface BlockLayout { readonly x: number; readonly z: number; readonly width: number; readonly depth: number }
export interface FieldLayout { readonly centerX: number; readonly width: number; readonly depth: number; readonly blocks: ReadonlyMap<string, BlockLayout> }

function blockSize(block: ZoneBlock): { width: number; depth: number } {
  return { width: block.cols * pitchX, depth: Math.max(...block.laneDepths) * pitchZ };
}

function localField(saha: Saha): Omit<FieldLayout, 'centerX'> {
  const rowDepths = new Map<number, number>();
  for (const block of saha.blocks) rowDepths.set(block.row, Math.max(rowDepths.get(block.row) ?? 0, blockSize(block).depth));
  const rowStarts = new Map<number, number>();
  let cursorZ = 0;
  for (const row of [...rowDepths.keys()].sort((a, b) => a - b)) {
    rowStarts.set(row, cursorZ);
    cursorZ += (rowDepths.get(row) ?? 0) + SCENE_CONFIG.blockGap;
  }
  const leftWidth = Math.max(0, ...saha.blocks.filter((b) => b.side === 'L').map((b) => blockSize(b).width));
  const rightWidth = Math.max(0, ...saha.blocks.filter((b) => b.side === 'R' && b.special !== 'PDI').map((b) => blockSize(b).width));
  const pdiWidth = Math.max(0, ...saha.blocks.filter((b) => b.special === 'PDI').map((b) => blockSize(b).width));
  const fullWidth = Math.max(0, ...saha.blocks.filter((b) => b.side === 'full').map((b) => blockSize(b).width));
  const pdiExtension = pdiWidth > 0 ? SCENE_CONFIG.blockGap + pdiWidth : 0;
  const width = Math.max(fullWidth, leftWidth + SCENE_CONFIG.centerAisle + rightWidth + pdiExtension);
  const blocks = new Map<string, BlockLayout>();
  for (const block of saha.blocks) {
    const size = blockSize(block);
    let x = 0;
    if (block.side === 'L') x = -(SCENE_CONFIG.centerAisle / 2 + size.width / 2);
    if (block.side === 'R') x = SCENE_CONFIG.centerAisle / 2 + size.width / 2;
    if (block.special === 'PDI') {
      const companion = saha.blocks.find((item) => item.row === block.row && item.side === 'R' && item.special !== 'PDI');
      if (companion) x = SCENE_CONFIG.centerAisle / 2 + blockSize(companion).width + SCENE_CONFIG.blockGap + size.width / 2;
    }
    blocks.set(block.id, { x, z: (rowStarts.get(block.row) ?? 0) + size.depth / 2, ...size });
  }
  return { width: width + SCENE_CONFIG.fieldPadding * 2, depth: Math.max(0, cursorZ - SCENE_CONFIG.blockGap) + SCENE_CONFIG.fieldPadding * 2, blocks };
}

const locals = SAHALAR.map(localField);
const totalWidth = locals.reduce((sum, item) => sum + item.width, 0) + SCENE_CONFIG.worldGap * (locals.length - 1);
let cursorX = -totalWidth / 2;

export const FIELD_LAYOUTS = new Map<string, FieldLayout>(SAHALAR.map((saha, index) => {
  const local = locals[index];
  if (!local) throw new Error('Saha yerleşimi üretilemedi.');
  const centerX = cursorX + local.width / 2;
  cursorX += local.width + SCENE_CONFIG.worldGap;
  return [saha.id, { ...local, centerX }] as const;
}));

export function worldSlot(sahaId: string, blockId: string, col: number, row: number): readonly [number, number, number] {
  const field = FIELD_LAYOUTS.get(sahaId);
  const block = field?.blocks.get(blockId);
  if (!field || !block) return [0, 0, 0];
  const blockDef = BLOCK_BY_ID.get(blockId);
  const colIndex = blockDef && blockDef.side === 'L' && sahaId !== 'saha-2' ? (blockDef.cols - 1 - col) : col;
  const x = field.centerX + block.x - block.width / 2 + SCENE_CONFIG.slotWidth / 2 + colIndex * pitchX;
  const z = -field.depth / 2 + SCENE_CONFIG.fieldPadding + block.z - block.depth / 2 + SCENE_CONFIG.slotDepth / 2 + row * pitchZ;
  return [x, 0, z];
}

export function worldBlockCenter(sahaId: string, blockId: string): readonly [number, number, number] {
  const field = FIELD_LAYOUTS.get(sahaId);
  const block = field?.blocks.get(blockId);
  if (!field || !block) return [0, 0, 0];
  return [field.centerX + block.x, 0, -field.depth / 2 + SCENE_CONFIG.fieldPadding + block.z];
}
