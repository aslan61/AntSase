import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColumnMapping } from '../src/components/ColumnMapping';
import { guessMapping, mapRows } from '../src/lib/spreadsheet';

const sheet = { filename: 'karisik.xlsx', headers: ['Peron', 'Sase No', 'Numara', 'Not'], records: [['K', 'VIN-K', 12, 'x'], ['A', 'VIN-A', 3, 'y']] } as const;

describe('sütun eşleme ve önizleme', () => {
  it('başlıkları otomatik tahmin eder ve karışık kolonları canonical satırlara çevirir', () => {
    const mapping = guessMapping(sheet.headers);
    expect(mapping).toEqual({ saseColumn: 1, categoryColumn: 0, slotColumn: 2 });
    expect(mapRows(sheet, mapping)).toEqual([
      { saseNo: 'VIN-K', category: 'K', slotNumber: 12, rowIndex: 2 },
      { saseNo: 'VIN-A', category: 'A', slotNumber: 3, rowIndex: 3 },
    ]);
  });

  it('kullanıcının eşlemeyi değiştirmesine izin verir', async () => {
    const onChange = vi.fn();
    render(<ColumnMapping sheet={sheet} mapping={{ saseColumn: 1, categoryColumn: 0, slotColumn: 2 }} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Adres / Peron sütunu'), '3');
    expect(onChange).toHaveBeenCalledWith({ saseColumn: 1, categoryColumn: 3, slotColumn: 2 });
  });

  it('STOK KARTEPE biçimindeki ŞASİ + ADRES sütunlarını ve H10 değerini otomatik çözer', () => {
    const stockSheet = { filename: 'STOK KARTEPE SAHA.xlsx', headers: ['ŞASİ', 'ADRES'], records: [['VIN-H-1', 'H10'], ['VIN-H-2', 'H10'], ['VIN-N', 'N12'], ['VIN-OS', 'OS']] } as const;
    const mapping = guessMapping(stockSheet.headers);
    expect(mapping).toEqual({ saseColumn: 0, categoryColumn: 1, slotColumn: null });
    expect(mapRows(stockSheet, mapping)).toEqual([
      { saseNo: 'VIN-H-1', category: 'H', slotNumber: 10, rowIndex: 2 },
      { saseNo: 'VIN-H-2', category: 'H', slotNumber: 10, rowIndex: 3 },
      { saseNo: 'VIN-N', category: 'N', slotNumber: 12, rowIndex: 4 },
      { saseNo: 'VIN-OS', category: 'OS', rowIndex: 5 },
    ]);
  });

  it('aynı sütun iki alana seçildiğinde erişilebilir hata gösterir', () => {
    render(<ColumnMapping sheet={sheet} mapping={{ saseColumn: 1, categoryColumn: 1, slotColumn: 2 }} onChange={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Her alan için farklı bir sütun seçin.');
  });
});
