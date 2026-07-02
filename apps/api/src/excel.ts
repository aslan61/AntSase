import * as XLSX from 'xlsx';
import { parseAddress } from '@sase/shared';
import type { VehicleRow } from '@sase/shared';
import { AppError } from './errors.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;
const ACCEPTED_EXTENSIONS = new Set(['xlsx', 'xls', 'csv']);

function extension(filename: string): string {
  return filename.split('.').at(-1)?.toLocaleLowerCase('tr-TR') ?? '';
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').replaceAll('ı', 'i').replaceAll(/[^a-z0-9]+/g, ' ').trim();
}

export function parseSpreadsheet(buffer: Buffer, filename: string): VehicleRow[] {
  if (!ACCEPTED_EXTENSIONS.has(extension(filename))) {
    throw new AppError(415, 'UNSUPPORTED_FILE', 'Yalnızca .xlsx, .xls veya .csv dosyaları kabul edilir.');
  }
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new AppError(413, 'FILE_TOO_LARGE', 'Dosya boyutu 5 MB sınırını aşıyor.');
  }
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
  } catch {
    throw new AppError(400, 'INVALID_SPREADSHEET', 'Dosya okunamadı; geçerli bir tablo dosyası yükleyin.');
  }
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new AppError(400, 'EMPTY_SPREADSHEET', 'Dosyada çalışma sayfası bulunamadı.');
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) throw new AppError(400, 'EMPTY_SPREADSHEET', 'İlk çalışma sayfası okunamadı.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  const headerCandidates = matrix.slice(0, 20).map((row, index) => {
    const values = row.map((item) => normalizeHeader(String(item)));
    const hasSase = values.some((value) => /(^| )(sase|sasi|vin|chassis)( |$)/.test(value));
    const hasAddress = values.some((value) => /(adres|peron|harf|kategori|lokasyon|location)/.test(value));
    return { index, score: Number(hasSase) + Number(hasAddress) };
  });
  const headerIndex = headerCandidates.sort((a, b) => b.score - a.score || a.index - b.index)[0]?.index ?? 0;
  const headerRow = matrix[headerIndex] ?? [];
  const headers = headerRow.map((item) => normalizeHeader(String(item)));
  const saseIndex = headers.findIndex((header) => /(^| )(sase|sasi|vin|chassis)( |$)/.test(header));
  const categoryIndex = headers.findIndex((header) => /(kategori|harf|peron|adres|lokasyon|location)/.test(header));
  const slotIndex = headers.findIndex((header) => /(numara|slot|sira no|park no)/.test(header) && !/(adres|peron)/.test(header));
  if (saseIndex < 0 || categoryIndex < 0 || saseIndex === categoryIndex) {
    throw new AppError(400, 'MISSING_COLUMNS', '“Şase/Şasi” ve “Adres/Peron” sütunları bulunamadı.');
  }
  const data = matrix.slice(headerIndex + 1).filter((row) => row.some((value) => String(value).trim() !== ''));
  if (data.length > MAX_ROWS) {
    throw new AppError(413, 'TOO_MANY_ROWS', 'Dosya 5000 satır sınırını aşıyor.');
  }
  return data.map((row, index) => {
    const parsed = parseAddress(row[categoryIndex]);
    return {
      saseNo: row[saseIndex] ?? '',
      category: parsed.category,
      ...((slotIndex < 0 ? parsed.peronNumber : row[slotIndex]) === null ? {} : { slotNumber: slotIndex < 0 ? parsed.peronNumber : row[slotIndex] ?? '' }),
      rowIndex: headerIndex + index + 2,
    };
  });
}
