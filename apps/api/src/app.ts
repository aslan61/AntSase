import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import type { AppConfig } from './config.js';
import { AppError } from './errors.js';
import { MAX_FILE_BYTES } from './excel.js';
import type { UploadRepository } from './repository/types.js';
import { registerRoutes } from './routes.js';

export interface BuildAppOptions {
  readonly config: AppConfig;
  readonly repository: UploadRepository;
  readonly logger?: boolean;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: options.logger ?? options.config.NODE_ENV !== 'test' });
  await app.register(cors, { origin: options.config.WEB_ORIGIN });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: MAX_FILE_BYTES, files: 1 } });
  if (options.config.JWT_SECRET) await app.register(jwt, { secret: options.config.JWT_SECRET });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Gönderilen veri geçersiz.', details: error.issues } });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }
    if (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 413) {
      return reply.code(413).send({ error: { code: 'FILE_TOO_LARGE', message: 'Dosya boyutu 5 MB sınırını aşıyor.' } });
    }
    app.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Beklenmeyen bir sunucu hatası oluştu.' } });
  });
  app.addHook('onClose', async () => options.repository.disconnect());
  await registerRoutes(app, options);
  return app;
}
