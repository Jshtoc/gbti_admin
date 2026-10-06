# gbti_admin

디스코드 봇이 수집한 서버 멤버 활동(음성 채널, 온라인 상태, 게임)을 보여주는 어드민 대시보드.

## 구조 (npm workspaces, TypeScript)

- `packages/db` — Drizzle 스키마(`src/schema.ts`), 마이그레이션(`migrations/`), 집계 쿼리(`src/queries.ts`). 봇과 웹이 함께 쓴다.
- `apps/web` — Next.js 16 대시보드. `DATA_SOURCE=mock`(기본)이면 `src/lib/repository/mock.ts`의 시드 고정 목데이터, `db`면 PostgreSQL.
- `apps/bot` — discord.js 봇. `src/tracker.ts`(디스코드와 무관한 기록 로직, DB에 구간 기록) ← `src/bot.ts`(디스코드 이벤트를 받아 그 순간의 상태를 값으로 넘김). DB 쓰기는 `queue.ts`로 직렬 실행. 봇 계정·봇 유저는 기록에서 제외.
- 봇은 1분마다 `bot_status.last_heartbeat_at` 갱신. 재시작 시 열린 구간을 마지막 하트비트 시각에 닫고(꺼져 있던 시간은 집계 안 함) 현재 상태로 다시 연다. 정상 종료(SIGINT/SIGTERM)는 지금 시각으로 닫는다.

## 데이터 규칙

- 모든 활동은 `[started_at, ended_at)` 구간으로 저장, `ended_at` null = 진행 중. 유저당 열린 음성/온라인 구간은 1개(부분 유니크 인덱스).
- "같이 플레이" = 같은 음성 채널 구간의 교집합 시간.
- 방 종류 = `packages/db/src/roomCategory.ts`의 `classifyRoom`: ① 방제목(한글·영문·숫자만 남겨 비교)에 할하방·할하·할거·각자 → "할하방" ② 방 안에 서로 다른 게임 2개 이상 → "할하방" ③ 게임 1개 → 그 게임 ④ 없으면 "정보미표시방". kind는 `hangout` / `game` / `unknown`. 봇이 판정 결과를 `voice_room_states` 구간으로 기록한다(대시보드의 방 종류별 체류 시간 화면은 2026-10-06 사용자 요청으로 제거, 기록만 유지).
- 게임 이름 별칭은 `roomCategory.ts`의 `GAME_ALIASES` (예: Modrinth → Minecraft, 리그 오브 레전드 → League of Legends). 같은 게임이 두 이름으로 남으면 ②에서 "여러 게임"으로 잘못 판정되므로 꼭 묶는다. 봇이 기록할 때 적용하므로 별칭을 추가하면 기존 DB 기록(activity_sessions.activity_name, voice_room_states.category_label)도 UPDATE로 맞춰야 한다.
- 음성 세션 목록(개요 멤버 선택 시·멤버 상세)은 조회 기간 안 세션을 **방제목(channel_name)별로 묶어** 최근 순으로 보여준다(`getVoiceSessionGroups`). 이름에 `음성방생성`이 들어간 채널은 목록과 **음성 시간 집계(멤버 표·KPI·일별 그래프)에서 뺀다**(`roomCategory.ts`의 `EXCLUDED_VOICE_CHANNEL_KEYWORDS`, SQL은 `notExcludedChannel`). 기록은 그대로 두고, 듀오(같이 플레이) 집계에는 그대로 포함한다.
- **메시지는 수집·조회·표시하지 않는다**(사용자 요청, 2026-10-06). 봇에 GuildMessages 인텐트도 없다. `message_counts_daily`는 그 전에 쌓인 기록만 남은 테이블.
- `channels` 테이블(봇이 upsert)은 채널 이름/종류. 음성 채널 이름이 바뀌면 방 종류를 다시 판정한다.
- **보관 기간 30일** (`packages/db/src/retention.ts`의 `RETENTION_DAYS`). 봇이 하루 한 번(시작 직후 첫 하트비트 포함) 끝난 지 30일 지난 구간을 지운다(`tracker.purgeOlderThan`). 진행 중이거나 기간에 걸친 구간은 남긴다.
- **통계 제외 멤버**: 닉네임에 `[게스트]`·`[부계정]`이 들어간 멤버(`packages/db/src/memberFilter.ts`). 봇은 기록하되 대시보드의 모든 집계·목록·검색에서 뺀다(SQL은 `notExcludedMember`, 목데이터는 `isExcludedFromStats`). 방 종류 판정에는 포함된다. 특정 계정을 빼려면 `stats_excluded_members` 테이블(DB에만, 공개 저장소에 계정 ID를 남기지 않음)에 guild_id/user_id를 넣는다 — 계정 기준이라 닉네임이 바뀌어도 유지되고 같은 이름의 새 멤버는 영향 없음. `scope` 컬럼: `all`(기본, 모든 통계에서 제외) / `duo`(BEST DUO·파트너·최장/최다 듀오에서만 제외, 멤버 표 등은 유지 — `notExcludedMember(alias, { duo: true })`).
- 조회 기간은 URL `?from=YYYY-MM-DD&to=YYYY-MM-DD` (KST, 양 끝 포함, 최대 `RETENTION_DAYS`일 — 그보다 오래된 날은 보관 시작일로 당긴다). 파싱/프리셋은 `apps/web/src/lib/period.ts`. `?time=night`이면 매일 KST 20:00~다음날 03:00만 집계(`DateRange.windows`, SQL은 `windowedSeconds`, 일별 그래프는 밤 시작 날짜 기준). 기록은 24시간 그대로.
- 일 단위 집계는 Asia/Seoul 자정 기준.
- 목데이터 집계(`mock.ts`)와 SQL(`queries.ts`)은 같은 규칙을 따라야 한다. 한쪽을 바꾸면 다른 쪽도 맞춘다.
- DB는 Supabase. 봇·마이그레이션은 **Session pooler(:5432)**, Vercel 대시보드는 **Transaction pooler(:6543)** 주소를 쓴다(둘 다 `?sslmode=require`). 6543이면 `client.ts`가 prepared statement를 자동으로 끈다.
- Supabase는 public 테이블을 REST API로 자동 공개하므로 **새 테이블을 만들면 RLS를 켜는 마이그레이션을 같이 추가**한다(`0004_enable_rls.sql` 참고, 정책 없음 = API 차단, 앱은 postgres 계정이라 영향 없음).
- raw `sql` 파라미터에 `Date`를 그대로 넘기지 말 것(postgres.js가 직렬화 못 함) → `iso()` 사용. 타임스탬프는 epoch ms로 받아 `new Date()`로 변환.

## 인증

- 관리자 1명, ID/PW는 환경 변수 `ADMIN_ID` / `ADMIN_PASSWORD` (공개 저장소라 코드·커밋에 넣지 않는다. 로컬은 `apps/web/.env.local`).
- 로그인 성공 시 HMAC 서명 세션 쿠키(`gbti_session`, httpOnly, 30일). 서명 키는 ID/PW(+선택 `AUTH_SECRET`)에서 만들므로 비밀번호를 바꾸면 기존 세션이 끊긴다.
- `src/proxy.ts`(Next 16의 middleware)가 비로그인 요청을 `/login?next=...`로 보내고, 각 페이지도 `requireSession()`으로 한 번 더 확인한다. 새 페이지를 만들면 `requireSession()`을 꼭 넣는다.

## 명령

- `npm run dev` — 대시보드 (apps/web). 포트 지정은 `cd apps/web && npx next dev --port 3100`
- `npm run bot` — 디스코드 봇 실행 (`apps/bot/.env`에 DISCORD_TOKEN / DISCORD_GUILD_ID / DATABASE_URL)
- 봇 서버(Google Cloud e2-micro, Ubuntu): 설치 `bash <(curl -fsSL https://raw.githubusercontent.com/Jshtoc/gbti_admin/main/deploy/bot/install.sh)`, 업데이트 `bash /opt/gbti_admin/deploy/bot/update.sh`, 로그 `sudo journalctl -u gbti-bot -f`. systemd 서비스 `gbti-bot`(자동 재시작). **봇은 반드시 한 곳에서만 실행**(두 개가 돌면 기록이 중복된다).
- `npm run typecheck`
- `npm run db:generate` — 스키마 변경 후 마이그레이션 생성 / `npm run db:migrate` — 적용 (앱 시작 시 자동 실행하지 않는다)

## 디자인 규칙

- UI/페이지/컴포넌트를 새로 만들거나 리디자인할 때는 반드시 `.claude/skills/dark-editorial-design` 스킬을 먼저 로드하고 그 토큰·타이포·컴포넌트 패턴을 따른다.
- 원본 레퍼런스 구현: `C:\Users\admin\gbti_manual\index.html`
- 어드민처럼 데이터 밀도가 높은 화면은 스킬의 톤(컬러 토큰, 폰트, 옅은 보더, 절제된 모션)은 유지하되, 좁은 680px 단일 컬럼·마퀴·스크롤 리빌 같은 랜딩용 장치는 화면 성격에 맞게 조정한다. (현재 컨테이너 1180px)
- **숫자는 배민 주아체(Google Fonts `Jua`, `--font-num`)** 로 표시한다. KPI 값, 그래프 축/툴팁, 표 숫자 칸, 순위 등. Syne은 숫자 폭이 들쑥날쑥해서 숫자에 쓰지 않는다. Jua는 400 단일 굵기.
- **PC 레이아웃은 고정**, 모바일은 `@media (max-width: 640px)` 안에서만 따로 잡는다. 모바일에선 고정 폭(표 min-width 등)을 풀고 카드형으로 바꿔도 된다 (예: 멤버 표 → 카드 목록, 일별 그래프 → 막대 최소 8px 가로 스크롤).
