import * as XLSX from 'xlsx';
import type { VehicleRow } from '@sase/shared';
import { parseAddress, VALID_CATEGORIES } from '@sase/shared';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;
const ACCEPTED = new Set(['xlsx', 'xls', 'csv']);

export interface ParsedSheet {
  readonly filename: string;
  readonly headers: readonly string[];
  readonly records: readonly (readonly unknown[])[];
  readonly headerRow?: number;
}

export interface ColumnMapping {
  readonly saseColumn: number;
  readonly categoryColumn: number;
  readonly slotColumn: number | null;
}

const normalized = (value: string): string => value
  .trim()
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replaceAll(/[\u0300-\u036f]/g, '')
  .replaceAll('ı', 'i')
  .replaceAll(/[^a-z0-9]+/g, ' ')
  .trim();

export function guessMapping(headers: readonly string[]): ColumnMapping {
  const saseIdx = Math.max(
    0,
    headers.findIndex((h) => {
      const norm = normalized(h);
      return ['sase no', 'sasi', 'sasi no', 'vin', 'chassis', 'chassis no'].includes(norm) || norm.includes('sase') || norm.includes('sasi') || norm.includes('vin');
    })
  );

  let catIdx = headers.findIndex((h) => {
    const norm = normalized(h);
    return (
      ['kategori', 'category', 'harf', 'peron'].includes(norm) ||
      norm.includes('kategori') ||
      norm.includes('category') ||
      norm.includes('harf') ||
      norm.includes('peron') ||
      norm.includes('adres') ||
      norm.includes('lokasyon') ||
      norm.includes('location')
    );
  });

  if (catIdx < 0) {
    catIdx = saseIdx === 0 ? 1 : 0;
  }

  const slotIdx = headers.findIndex((h) => {
    const norm = normalized(h);
    return (
      ['numara', 'slot', 'slot no', 'sira no', 'park no'].includes(norm) ||
      norm.includes('slot') ||
      norm.includes('numara') ||
      norm.includes('sira') ||
      norm.includes('park')
    );
  });

  return {
    saseColumn: saseIdx,
    categoryColumn: catIdx,
    slotColumn: slotIdx < 0 ? null : slotIdx,
  };
}

export async function parseFile(file: File): Promise<ParsedSheet> {
  const extension = file.name.split('.').at(-1)?.toLocaleLowerCase('tr-TR') ?? '';
  if (!ACCEPTED.has(extension)) throw new Error('Yalnızca .xlsx, .xls veya .csv dosyası seçin.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Dosya boyutu 5 MB sınırını aşıyor.');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
  const firstName = workbook.SheetNames[0];
  const sheet = firstName ? workbook.Sheets[firstName] : undefined;
  if (!sheet) throw new Error('Dosyada okunabilir çalışma sayfası yok.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  const headerScores = matrix.slice(0, 20).map((row, index) => {
    const values = row.map((value) => normalized(String(value)));
    const hasSase = values.some((value) => /(^| )(sase|sasi|vin|chassis)( |$)/.test(value));
    const hasAddress = values.some((value) => /(adres|peron|harf|kategori|lokasyon|location)/.test(value));
    return { index, score: Number(hasSase) + Number(hasAddress) };
  });
  const headerIndex = headerScores.sort((a, b) => b.score - a.score || a.index - b.index)[0]?.index ?? 0;
  const headers = (matrix[headerIndex] ?? []).map(String);
  const records = matrix.slice(headerIndex + 1).filter((row) => row.some((value) => String(value).trim() !== ''));
  if (records.length > MAX_ROWS) throw new Error('Dosya 5000 satır sınırını aşıyor.');
  if (headers.length < 2) throw new Error('En az iki ayrı sütun bulunmalıdır.');
  return { filename: file.name, headers, records, headerRow: headerIndex + 1 };
}

export function mapRows(sheet: ParsedSheet, mapping: ColumnMapping): VehicleRow[] {
  const headers = sheet.headers;
  const saseIdx = mapping.saseColumn;

  // Check if we have multiple peron columns in the headers (Matrix format)
  const validCategoryCleaned = VALID_CATEGORIES.map(c => c.toUpperCase());
  const matrixHeaders = headers.map((h, idx) => {
    if (idx === saseIdx) return null;
    const norm = h.trim().toUpperCase().replaceAll(/[\s_-]+/g, '');
    
    if (['SCLASS', 'SCLASS72', 'S_CLASS', 'S-CLASS', 'S'].includes(norm)) {
      return { idx, category: 'A' };
    }
    const sideBlockMatch = norm.match(/^([A-Z])\s*([LR])$/);
    if (sideBlockMatch && VALID_CATEGORIES.includes(sideBlockMatch[1]!)) {
      return { idx, category: sideBlockMatch[1]! };
    }
    if (VALID_CATEGORIES.includes(norm)) {
      return { idx, category: norm };
    }
    return null;
  }).filter((x): x is { idx: number; category: string } => x !== null);

  const isMatrixFormat = matrixHeaders.length >= 3;

  if (isMatrixFormat) {
    const rows: VehicleRow[] = [];
    sheet.records.forEach((record, index) => {
      const saseNo = String(record[saseIdx] || '').trim();
      if (!saseNo) return;

      for (const mh of matrixHeaders) {
        const val = record[mh.idx];
        if (val !== undefined && val !== null && val !== '') {
          const num = parseInt(String(val).trim(), 10);
          if (!isNaN(num)) {
            rows.push({
              saseNo,
              category: mh.category,
              slotNumber: num,
              rowIndex: (sheet.headerRow ?? 1) + index + 1
            });
            break;
          }
        }
      }
    });
    return rows;
  }

  // Classic fallback
  if (mapping.saseColumn === mapping.categoryColumn) throw new Error('Şase No ve Kategori için farklı sütunlar seçin.');
  if (mapping.slotColumn === mapping.saseColumn || mapping.slotColumn === mapping.categoryColumn) throw new Error('Slot/Numara için farklı bir sütun seçin.');
  
  return sheet.records.map((record, index) => {
    const saseNo = String(record[saseIdx] ?? '').trim();
    const rawCat = String(record[mapping.categoryColumn] ?? '').trim();
    const parsedAddress = parseAddress(rawCat);
    const slotVal = mapping.slotColumn !== null ? record[mapping.slotColumn] : null;
    let slotNumber = slotVal !== undefined && slotVal !== null && slotVal !== '' ? parseInt(String(slotVal).trim(), 10) : undefined;
    if (slotNumber !== undefined && isNaN(slotNumber)) slotNumber = undefined;

    return {
      saseNo,
      category: parsedAddress.category,
      ...((slotNumber ?? parsedAddress.peronNumber) !== null && (slotNumber ?? parsedAddress.peronNumber) !== undefined ? { slotNumber: slotNumber ?? parsedAddress.peronNumber } : {}),
      rowIndex: (sheet.headerRow ?? 1) + index + 1
    };
  });
}

export function downloadTemplate(): void {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Şase No', 'Adres / Peron', 'Peron / Numara'],
    ['WDDÖRNEK000000001', 'A', 1],
    ['WDDÖRNEK000000002', 'K', 12],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Yerleşim');
  XLSX.writeFile(workbook, 'sase-yerlesim-sablonu.xlsx');
}
