-- Nefes Ayı: User'a opsiyonel pausedUntil DateTime alanı.
-- Null veya geçmiş = aktif kullanıcı. Gelecek tarih = duraklatılmış.
ALTER TABLE "User" ADD COLUMN "pausedUntil" TIMESTAMP(3);
