import { describe, expect, it } from 'vitest';
import { buildCategoryIndex, parseAddress, placeVehicles, SAHALAR, slotToLocal } from '../src/index.js';
import type { VehicleRow } from '../src/index.js';

describe('sabit saha modeli', () => {
  it('kapasite invariantlarını korur', () => {
    expect(SAHALAR.find((saha) => saha.id === 'saha-1')?.blocks.reduce((sum, block) => sum + block.capacity, 0)).toBe(832);
    expect(SAHALAR.find((saha) => saha.id === 'saha-2')?.blocks.reduce((sum, block) => sum + block.capacity, 0)).toBe(410);
  });

  it('PDI kapasitesini ve J kesik satır profilini korur', () => {
    const saha1 = SAHALAR.find((saha) => saha.id === 'saha-1');
    const pdi = saha1?.blocks.find((item) => item.id === 'PDI');
    const j = saha1?.blocks.find((item) => item.id === 'J');
    expect(pdi).toMatchObject({ capacity: 30, cols: 5, laneDepths: [6, 6, 6, 6, 6] });
    expect(j).toMatchObject({ capacity: 76, cols: 19 });
    expect(j?.laneDepths).toEqual(Array.from({ length: 19 }, () => 4));
  });

  it('aynı kategoride sol bloğu sağ bloktan önce döndürür', () => {
    expect(buildCategoryIndex().get('L')?.map(({ block }) => block.id)).toEqual(['L-L', 'L-R']);
  });
});

describe('slot koordinatları', () => {
  const aLeft = SAHALAR[0]?.blocks.find((block) => block.id === 'A-L');
  const c = SAHALAR[0]?.blocks.find((block) => block.id === 'C');

  it('colMajor yönde önce aşağı iner', () => {
    expect(aLeft).toBeDefined();
    if (!aLeft) return;
    expect(slotToLocal(aLeft, 1)).toEqual({ col: 0, row: 0 });
    expect(slotToLocal(aLeft, 2)).toEqual({ col: 0, row: 1 });
    expect(slotToLocal(aLeft, 4)).toEqual({ col: 1, row: 0 });
  });

  it('PDF’deki daralan C profilini fiziksel karelere çevirir', () => {
    expect(c).toBeDefined();
    if (!c) return;
    expect(slotToLocal(c, 63)).toEqual({ col: 20, row: 2 });
    expect(slotToLocal(c, 64)).toEqual({ col: 21, row: 0 });
    expect(slotToLocal(c, 66)).toEqual({ col: 22, row: 0 });
  });
});

describe('adres ayrıştırma', () => {
  it('stok dosyasındaki birleşik adresleri ayırır', () => {
    expect(parseAddress(' H10 ')).toMatchObject({ category: 'H', peronNumber: 10 });
    expect(parseAddress('L-R-5')).toMatchObject({ category: 'L-R', peronNumber: 5 });
    expect(parseAddress('OS')).toMatchObject({ category: 'OS', peronNumber: null });
  });
});

describe('placeVehicles', () => {
  it('karışık satırları doğru saha, blok ve sıralı slota yerleştirir', () => {
    const rows: VehicleRow[] = [
      { saseNo: 'VIN-K-1', category: ' k ', rowIndex: 2 },
      { saseNo: 'VIN-A-1', category: 'A', rowIndex: 3 },
      { saseNo: 'VIN-L-1', category: 'l', rowIndex: 4 },
      { saseNo: 'VIN-A-2', category: 'a', rowIndex: 5 },
    ];
    expect(placeVehicles(rows).placements).toMatchObject([
      { saseNo: 'VIN-K-1', sahaId: 'saha-2', blockId: 'K', slotIndex: 1 },
      { saseNo: 'VIN-A-1', sahaId: 'saha-1', blockId: 'A-L', slotIndex: 1 },
      { saseNo: 'VIN-L-1', sahaId: 'saha-2', blockId: 'L-L', slotIndex: 1 },
      { saseNo: 'VIN-A-2', sahaId: 'saha-1', blockId: 'A-L', slotIndex: 2 },
    ]);
  });

  it('A kategorisi dolunca kapasite aşım hatası verir', () => {
    const rows = Array.from({ length: 73 }, (_, index) => ({ saseNo: `A-${index}`, category: 'A', rowIndex: index + 2 }));
    const result = placeVehicles(rows);
    expect(result.placements).toHaveLength(72);
    expect(result.unplaced).toContainEqual(expect.objectContaining({ saseNo: 'A-72', reason: 'CAPACITY_EXCEEDED' }));
  });

  it('kapasite aşımını yerleştirilmemiş olarak raporlar', () => {
    const rows = Array.from({ length: 55 }, (_, index) => ({ saseNo: `K-${index}`, category: 'K', rowIndex: index + 2 }));
    const result = placeVehicles(rows);
    expect(result.placements).toHaveLength(54);
    expect(result.unplaced).toContainEqual(expect.objectContaining({ saseNo: 'K-54', reason: 'CAPACITY_EXCEEDED' }));
  });

  it('Excel numarasını doğrudan fiziksel slota uygular', () => {
    const result = placeVehicles([
      { saseNo: 'VIN-K-12', category: 'K', slotNumber: 12, rowIndex: 2 },
      { saseNo: 'VIN-LR-5', category: 'L-R', slotNumber: 5, rowIndex: 3 },
      { saseNo: 'VIN-B-5', category: 'B', slotNumber: 5, rowIndex: 4 },
    ]);
    expect(result.placements).toMatchObject([
      { saseNo: 'VIN-K-12', blockId: 'K', slotIndex: 34, requestedSlot: 12, col: 11, row: 0 },
      { saseNo: 'VIN-LR-5', blockId: 'L-R', slotIndex: 21, requestedSlot: 5, col: 4, row: 0 },
      { saseNo: 'VIN-B-5', blockId: 'B', slotIndex: 13, requestedSlot: 5, col: 4, row: 0 },
    ]);
  });

  it('S-Class varyasyonlarını otomatik A-L bloğuna yerleştirir', () => {
    const result = placeVehicles([
      { saseNo: 'VIN-S1', category: 'S CLASS', rowIndex: 2 },
      { saseNo: 'VIN-S2', category: 'S_Class', rowIndex: 3 },
      { saseNo: 'VIN-S3', category: 'S-CLASS', slotNumber: 5, rowIndex: 4 },
    ]);
    expect(result.placements).toMatchObject([
      { saseNo: 'VIN-S1', blockId: 'A-L', slotIndex: 1 },
      { saseNo: 'VIN-S2', blockId: 'A-L', slotIndex: 2 },
      { saseNo: 'VIN-S3', blockId: 'A-L', slotIndex: 13, col: 4, row: 0 },
    ]);
  });

  it('aynı perondaki araçları derinlik karelerine sırayla dizer', () => {
    const result = placeVehicles([
      { saseNo: 'VIN-1', category: 'K', slotNumber: 7, rowIndex: 2 },
      { saseNo: 'VIN-2', category: 'K', slotNumber: 7, rowIndex: 3 },
      { saseNo: 'VIN-3', category: 'K', slotNumber: 7, rowIndex: 4 },
    ]);
    expect(result.placements).toMatchObject([
      { saseNo: 'VIN-1', col: 6, row: 0 },
      { saseNo: 'VIN-2', col: 6, row: 1 },
      { saseNo: 'VIN-3', col: 6, row: 2 },
    ]);
  });

  it('plan sınırını aşan peronu reddetmek yerine görünür uyarıyla en yakın boş kareye alır', () => {
    const result = placeVehicles([{ saseNo: 'VIN-K23', category: 'K23', rowIndex: 2 }]);
    expect(result.placements).toHaveLength(1);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'ADDRESS_OUT_OF_RANGE' }));
  });

  it('otomatik yerleşimde daha önce numarayla ayrılmış kareyi atlar', () => {
    const result = placeVehicles([
      { saseNo: 'VIN-SABIT', category: 'K', slotNumber: 1, rowIndex: 2 },
      { saseNo: 'VIN-OTOMATIK', category: 'K', rowIndex: 3 },
    ]);
    expect(result.placements.at(-1)).toMatchObject({ saseNo: 'VIN-OTOMATIK', slotIndex: 2 });
  });

  it('geçersiz, boş ve yinelenen satırları açıkça raporlar', () => {
    const result = placeVehicles([
      { saseNo: 'VIN-1', category: 'A', rowIndex: 2 },
      { saseNo: ' VIN-1 ', category: 'B', rowIndex: 3 },
      { saseNo: 'VIN-X', category: 'X', rowIndex: 4 },
      { saseNo: '', category: 'A', rowIndex: 5 },
      { saseNo: 'VIN-E', category: '', rowIndex: 6 },
    ]);
    expect(result.placements).toHaveLength(1);
    expect(result.unplaced.map((item) => item.reason)).toEqual(['DUPLICATE', 'INVALID_CATEGORY', 'EMPTY_SASE', 'EMPTY_CATEGORY']);
  });
});
