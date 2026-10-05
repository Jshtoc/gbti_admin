import { z } from 'zod';

// .env 파일이 있으면 읽는다 (없어도 됨 — 서버에서는 환경 변수로 직접 넣을 수 있다)
try {
  process.loadEnvFile();
} catch {
  // .env 없음
}

const envSchema = z.object({
  /** Discord Developer Portal → Bot → Token */
  DISCORD_TOKEN: z.string({ error: 'DISCORD_TOKEN이 필요합니다' }).min(1, 'DISCORD_TOKEN이 필요합니다'),
  /** 기록할 서버 ID (서버 이름 우클릭 → 서버 ID 복사, 개발자 모드 필요) */
  DISCORD_GUILD_ID: z.string({ error: 'DISCORD_GUILD_ID가 필요합니다' }).regex(/^\d+$/, 'DISCORD_GUILD_ID는 숫자 ID여야 합니다'),
  DATABASE_URL: z.string({ error: 'DATABASE_URL이 필요합니다' }).min(1, 'DATABASE_URL이 필요합니다'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] 환경 변수 오류:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
