import { createHash } from 'node:crypto';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { MemoryUploadRepository } from '../src/repository/memory.js';

const API_KEY = 'test-anahtari';
const config = {
  NODE_ENV: 'test' as const,
  HOST: '127.0.0.1',
  PORT: 3001,
  DATABASE_URL: 'file:./test.db',
  WEB_ORIGIN: 'http://localhost:5173',
  API_KEY_HASH: createHash('sha256').update(API_KEY).digest('hex'),
  JWT_SECRET: '',
};

describe('API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({ config, repository: new MemoryUploadRepository(), logger: false });
    await app.ready();
  });

  afterEach(async () => app.close());

  it('health ve sabit saha modelini döndürür', async () => {
    await request(app.server).get('/health').expect(200).expect(({ body }) => expect(body.status).toBe('ok'));
    await request(app.server).get('/api/sahalar').expect(200).expect(({ body }) => expect(body.items).toHaveLength(2));
  });

  it('JSON yüklemeyi yerleştirir ve kalıcı repository geçmişinden okur', async () => {
    const created = await request(app.server)
      .post('/api/uploads')
      .set('x-api-key', API_KEY)
      .send({ filename: 'karisik.json', rows: [
        { saseNo: 'VIN-K', category: 'K', slotNumber: 12, rowIndex: 2 },
        { saseNo: 'VIN-A', category: 'B', slotNumber: 1, rowIndex: 3 },
      ] })
      .expect(201);
    expect(created.body.report.placements).toMatchObject([
      { saseNo: 'VIN-K', sahaId: 'saha-2', blockId: 'K', slotIndex: 34, col: 11, row: 0 },
      { saseNo: 'VIN-A', sahaId: 'saha-1', blockId: 'B', slotIndex: 1 },
    ]);
    const uploadId = String(created.body.upload.id);
    await request(app.server).get(`/api/uploads/${uploadId}/placements`).expect(200).expect(({ body }) => expect(body.items).toHaveLength(2));
    await request(app.server).get('/api/uploads').expect(200).expect(({ body }) => expect(body.total).toBe(1));
  });

  it('ŞASİ + ADRES biçimli stok Excelini ve aynı perondaki araçları işler', async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['ŞASİ', 'ADRES'],
      ['VIN-H-1', 'H10'],
      ['VIN-H-2', 'H10'],
      ['VIN-N-1', 'N12'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sayfa1');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const created = await request(app.server)
      .post('/api/uploads')
      .set('x-api-key', API_KEY)
      .attach('file', buffer, { filename: 'STOK KARTEPE SAHA.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);
    expect(created.body.report.placements).toMatchObject([
      { saseNo: 'VIN-H-1', blockId: 'H', requestedSlot: 10, col: 9, row: 0 },
      { saseNo: 'VIN-H-2', blockId: 'H', requestedSlot: 10, col: 9, row: 1 },
      { saseNo: 'VIN-N-1', blockId: 'N-R', requestedSlot: 12 },
    ]);
  });

  it('yazma uçlarını anahtarsız çağrılara kapatır', async () => {
    await request(app.server).post('/api/uploads').send({ filename: 'x.json', rows: [] }).expect(401).expect(({ body }) => expect(body.error.code).toBe('UNAUTHORIZED'));
  });

  it('geçersiz body için tutarlı doğrulama hatası döndürür', async () => {
    await request(app.server).post('/api/uploads').set('x-api-key', API_KEY).send({ filename: '', rows: 'hatalı' }).expect(400).expect(({ body }) => expect(body.error.code).toBe('VALIDATION_ERROR'));
  });

  it('snapshot kaydeder ve geri okur', async () => {
    const created = await request(app.server).post('/api/uploads').set('x-api-key', API_KEY).send({ filename: 'x.json', rows: [] }).expect(201);
    const snapshot = await request(app.server).post('/api/snapshots').set('x-api-key', API_KEY).send({ uploadId: created.body.upload.id, name: 'Görünüm', data: { camera: [1, 2, 3] } }).expect(201);
    await request(app.server).get(`/api/snapshots/${String(snapshot.body.snapshot.id)}`).expect(200).expect(({ body }) => expect(body.snapshot.data.camera).toEqual([1, 2, 3]));
  });
});
