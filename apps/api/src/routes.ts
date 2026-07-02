import type { FastifyInstance, FastifyRequest } from 'fastify';
import { jsonUploadSchema, paginationSchema, placeVehicles, SAHALAR, snapshotBodySchema, uploadIdParamsSchema } from '@sase/shared';
import type { VehicleRow } from '@sase/shared';
import { z } from 'zod';
import type { AppConfig } from './config.js';
import { matchesApiKey } from './config.js';
import { AppError, NotFoundError } from './errors.js';
import { parseSpreadsheet } from './excel.js';
import type { UploadRepository } from './repository/types.js';

interface RouteDependencies {
  readonly config: AppConfig;
  readonly repository: UploadRepository;
}

const placementQuerySchema = z.object({ sahaId: z.string().trim().min(1).optional(), blockId: z.string().trim().min(1).optional() });

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function registerRoutes(app: FastifyInstance, dependencies: RouteDependencies): Promise<void> {
  const requireWriteAuth = async (request: FastifyRequest): Promise<void> => {
    const apiKey = request.headers['x-api-key'];
    if (typeof apiKey === 'string' && matchesApiKey(apiKey, dependencies.config.API_KEY_HASH)) return;
    const authorization = request.headers.authorization;
    if (dependencies.config.JWT_SECRET && authorization?.startsWith('Bearer ')) {
      try {
        await request.jwtVerify();
        return;
      } catch {
        // Tutarlı 401 yanıtı aşağıda üretilir.
      }
    }
    throw new AppError(401, 'UNAUTHORIZED', 'Geçerli x-api-key veya Bearer token gerekli.');
  };

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/api/sahalar', async () => ({ items: SAHALAR }));

  app.post('/api/uploads', { preHandler: requireWriteAuth }, async (request, reply) => {
    let filename: string;
    let rows: readonly VehicleRow[];
    if (request.isMultipart()) {
      const file = await request.file();
      if (!file) throw new AppError(400, 'FILE_REQUIRED', 'Bir tablo dosyası yükleyin.');
      filename = file.filename;
      rows = parseSpreadsheet(await file.toBuffer(), filename);
    } else {
      const body = jsonUploadSchema.parse(request.body);
      filename = body.filename;
      rows = body.rows;
    }
    const report = placeVehicles(rows);
    const upload = await dependencies.repository.saveUpload({ filename, rows, report });
    return reply.code(201).send({ upload, report });
  });

  app.get('/api/uploads', async (request) => {
    const query = paginationSchema.parse(request.query);
    const result = await dependencies.repository.listUploads((query.page - 1) * query.pageSize, query.pageSize);
    return { ...result, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(result.total / query.pageSize) };
  });

  app.get('/api/uploads/:id', async (request) => {
    const { id } = uploadIdParamsSchema.parse(request.params);
    const upload = await dependencies.repository.getUpload(id);
    if (!upload) throw new NotFoundError('Yükleme');
    const report = placeVehicles(upload.rows);
    return { upload: { ...upload, rows: undefined }, report };
  });

  app.get('/api/uploads/:id/placements', async (request) => {
    const { id } = uploadIdParamsSchema.parse(request.params);
    if (!(await dependencies.repository.getUpload(id))) throw new NotFoundError('Yükleme');
    const filters = placementQuerySchema.parse(request.query);
    const repositoryFilters = {
      ...(filters.sahaId ? { sahaId: filters.sahaId } : {}),
      ...(filters.blockId ? { blockId: filters.blockId } : {}),
    };
    return { items: await dependencies.repository.getPlacements(id, repositoryFilters) };
  });

  app.get('/api/uploads/:id/export.csv', async (request, reply) => {
    const { id } = uploadIdParamsSchema.parse(request.params);
    const upload = await dependencies.repository.getUpload(id);
    if (!upload) throw new NotFoundError('Yükleme');
    const placements = await dependencies.repository.getPlacements(id);
    const lines = ['Şase No,Peron / Harf,Saha,Blok,Slot,Kolon,Satır', ...placements.map((item) => [item.saseNo, item.category, item.sahaId, item.blockId, item.slotIndex, item.col + 1, item.row + 1].map(csvCell).join(','))];
    return reply.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', `attachment; filename="${id}.csv"`).send(`\uFEFF${lines.join('\r\n')}`);
  });

  app.post('/api/snapshots', { preHandler: requireWriteAuth }, async (request, reply) => {
    const body = snapshotBodySchema.parse(request.body);
    if (!(await dependencies.repository.getUpload(body.uploadId))) throw new NotFoundError('Yükleme');
    const snapshot = await dependencies.repository.saveSnapshot(body.uploadId, body.name, body.data);
    return reply.code(201).send({ snapshot });
  });

  app.get('/api/snapshots/:id', async (request) => {
    const { id } = uploadIdParamsSchema.parse(request.params);
    const snapshot = await dependencies.repository.getSnapshot(id);
    if (!snapshot) throw new NotFoundError('Snapshot');
    return { snapshot };
  });
}
