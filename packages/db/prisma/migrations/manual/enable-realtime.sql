-- Niyet — Supabase Realtime için publication setup
--
-- Bu migration MANUEL çalıştırılır (prisma migrate otomatik almaz çünkü
-- supabase_realtime publication Supabase tarafından sağlanır).
--
-- Kurulum: Supabase Dashboard → Database → Replication → Add tables
-- VEYA psql ile:
--
--   psql "$DIRECT_URL" -f packages/db/prisma/migrations/manual/enable-realtime.sql
--
-- Tabloları publication'a ekler:
--  - Notification: yeni bildirim → frontend toast + invalidate
--  - Transaction: mock seed sırasında batch insert görünür (Faz 7+)
--  - AnalysisRun: AI analizi tamamlandı sinyali

ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
ALTER PUBLICATION supabase_realtime ADD TABLE "Transaction";
ALTER PUBLICATION supabase_realtime ADD TABLE "AnalysisRun";

-- Doğrulama:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
