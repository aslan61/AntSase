import { createHash, timingSafeEqual } from 'node:crypto';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_KEY_HASH: z.string().regex(/^[a-f\d]{64}$/i),
  JWT_SECRET: z.string().min(32).optional().or(z.literal('')),
});

export type AppConfig = z.infer<typeof envSchema>;

export function readConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(source);
}

export function hashApiKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function matchesApiKey(value: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashApiKey(value), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
