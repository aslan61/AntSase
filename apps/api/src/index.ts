import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { PrismaUploadRepository } from './repository/prisma.js';

const config = readConfig();
const app = await buildApp({ config, repository: new PrismaUploadRepository() });

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
