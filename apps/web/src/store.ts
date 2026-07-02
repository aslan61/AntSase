import { create } from 'zustand';
import type { Placement, PlacementResult, VehicleRow } from '@sase/shared';
import type { ParsedSheet, ColumnMapping } from './lib/spreadsheet';

export type ViewMode = '2d' | '3d';
export type CameraMode = 'pan' | 'rotate';

export interface SelectedSlot {
  readonly sahaId: string;
  readonly blockId: string;
  readonly slotIndex: number;
  readonly col: number;
  readonly row: number;
  readonly saseNo?: string;
  readonly category?: string;
  readonly rowIndex?: number;
  readonly requestedSlot?: number | null;
}

interface AppState {
  readonly sheet: ParsedSheet | null;
  readonly mapping: ColumnMapping | null;
  readonly rows: readonly VehicleRow[];
  readonly report: PlacementResult;
  readonly uploadId: string | null;
  readonly selected: Placement | SelectedSlot | null;
  readonly focusSaha: string | null;
  readonly focusBlock: { readonly sahaId: string; readonly blockId: string } | null;
  readonly focusNonce: number;
  readonly viewMode: ViewMode;
  readonly cameraMode: CameraMode;
  readonly canvas: HTMLCanvasElement | null;
  setSheet: (sheet: ParsedSheet, mapping: ColumnMapping) => void;
  setMapping: (mapping: ColumnMapping) => void;
  setPreview: (rows: readonly VehicleRow[], report: PlacementResult) => void;
  setUploadId: (id: string | null) => void;
  setReport: (report: PlacementResult) => void;
  select: (selected: Placement | SelectedSlot | null) => void;
  focus: (sahaId: string | null) => void;
  focusPeron: (sahaId: string, blockId: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setCanvas: (canvas: HTMLCanvasElement | null) => void;
}

const emptyReport: PlacementResult = { placements: [], unplaced: [], warnings: [] };

export const useAppStore = create<AppState>((set) => ({
  sheet: null,
  mapping: null,
  rows: [],
  report: emptyReport,
  uploadId: null,
  selected: null,
  focusSaha: null,
  focusBlock: null,
  focusNonce: 0,
  viewMode: '3d',
  cameraMode: 'pan',
  canvas: null,
  setSheet: (sheet, mapping) => set({ sheet, mapping }),
  setMapping: (mapping) => set({ mapping }),
  setPreview: (rows, report) => set({ rows, report, selected: null, uploadId: null }),
  setUploadId: (uploadId) => set({ uploadId }),
  setReport: (report) => set({ report, selected: null }),
  select: (selected) => set((state) => ({
    selected,
    focusSaha: selected?.sahaId ?? state.focusSaha,
    focusBlock: selected ? { sahaId: selected.sahaId, blockId: selected.blockId } : state.focusBlock,
    focusNonce: state.focusNonce + 1,
  })),
  focus: (focusSaha) => set((state) => ({ focusSaha, focusBlock: null, selected: null, focusNonce: state.focusNonce + 1 })),
  focusPeron: (sahaId, blockId) => set((state) => ({ focusSaha: sahaId, focusBlock: { sahaId, blockId }, selected: null, focusNonce: state.focusNonce + 1 })),
  setViewMode: (viewMode) => set({ viewMode }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setCanvas: (canvas) => set({ canvas }),
}));
