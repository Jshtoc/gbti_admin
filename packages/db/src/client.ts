import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

function createDb(url: string) {
  return drizzle(postgres(url, { max: 10 }), { schema });
}

let instance: Database | undefined;

/** 첫 호출 시에만 연결한다. 목데이터 모드에서는 DATABASE_URL 없이도 import 가능. */
export function getDb(): Database {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    instance = createDb(url);
  }
  return instance;
}
