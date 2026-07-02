export const SCENE_CONFIG = {
  slotWidth: 0.72,
  slotDepth: 1.28,
  slotGap: 0.12,
  blockGap: 3.5,
  centerAisle: 7.0,
  worldGap: 16,
  vehicleHeight: 0.38,
  fieldPadding: 2.2,
  camera: { perspective: [0, 62, 72] as const, orthographic: [0, 90, 0.01] as const },
  palette: {
    A: '#38bdf8', B: '#fb7185', C: '#34d399', D: '#fbbf24', E: '#a78bfa', F: '#f97316',
    G: '#2dd4bf', H: '#e879f9', I: '#84cc16', J: '#ec4899', K: '#60a5fa', L: '#4ade80',
    M: '#facc15', N: '#f472b6', O: '#c084fc', P: '#f8fafc', R: '#fb923c',
  } as Readonly<Record<string, string>>,
} as const;

export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
export const API_KEY = import.meta.env.VITE_API_KEY ?? '';
