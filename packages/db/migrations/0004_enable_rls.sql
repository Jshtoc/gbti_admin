-- Supabase는 public 스키마 테이블을 REST API(anon 키)로 자동 공개한다.
-- RLS를 켜고 정책을 두지 않으면 API로는 접근할 수 없다.
-- 봇/대시보드는 테이블 소유자(postgres) 계정으로 직접 접속하므로 영향이 없다.
-- 새 테이블을 만들면 여기처럼 RLS를 켜는 마이그레이션을 같이 추가할 것.
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "voice_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "voice_room_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "presence_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_counts_daily" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bot_status" ENABLE ROW LEVEL SECURITY;
