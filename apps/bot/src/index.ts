// env를 가장 먼저 불러와 .env를 읽고 검증한다 (DB 연결 전에)
import { env } from './env';

import { getDb } from '@gbti/db';

import { createBot } from './bot';
import { Tracker } from './tracker';

const tracker = new Tracker(getDb(), env.DISCORD_GUILD_ID);
const { client, stop } = createBot(tracker);

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`[bot] ${signal} 받음, 열린 기록을 닫고 종료합니다…`);
  try {
    await stop();
  } catch (error) {
    console.error('[bot] 종료 중 오류:', error);
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

client.login(env.DISCORD_TOKEN).catch((error: unknown) => {
  console.error('[bot] 디스코드 로그인 실패. DISCORD_TOKEN을 확인하세요.', error);
  process.exit(1);
});
