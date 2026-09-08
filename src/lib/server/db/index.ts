import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

export const databaseUrl = process.env.DATABASE_URL ?? 'data/verlaufs-planer.sqlite';

const sqlitePath = isAbsolute(databaseUrl) ? databaseUrl : resolve(process.cwd(), databaseUrl);

mkdirSync(dirname(sqlitePath), { recursive: true });

const sqlite = new Database(sqlitePath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
