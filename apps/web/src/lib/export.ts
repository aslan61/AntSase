import type { Placement } from '@sase/shared';

function download(blob: Blob, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

const cell = (value: string | number): string => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function exportCsv(placements: readonly Placement[]): void {
  const lines = ['Şase No,Adres,Saha,Blok,Peron,Derinlik,Fiziksel Slot', ...placements.map((item) => [item.saseNo, `${item.category}${item.requestedSlot ?? item.col + 1}`, item.sahaId, item.blockId, item.col + 1, item.row + 1, item.slotIndex].map(cell).join(','))];
  download(new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), 'saha-yerlesim.csv');
}

export function exportPng(canvas: HTMLCanvasElement | null): void {
  if (!canvas) throw new Error('Sahne henüz hazır değil.');
  canvas.toBlob((blob) => {
    if (blob) download(blob, 'saha-yerlesim.png');
  }, 'image/png');
}
