import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

/**
 * Supabase Transaction pooler(포트 6543, PgBouncer 트랜잭션 모드)는 prepared statement를 지원하지 않는다.
 * 서버리스(Vercel)는 이 주소를 쓰므로 포트로 판별해 끈다. 봇은 Session pooler(5432)를 쓴다.
 */
function isTransactionPooler(url: string): boolean {
  try {
    return new URL(url).port === '6543';
  } catch {
    return false;
  }
}

function createDb(url: string) {
  return drizzle(postgres(url, { max: 10, prepare: !isTransactionPooler(url) }), { schema });
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
