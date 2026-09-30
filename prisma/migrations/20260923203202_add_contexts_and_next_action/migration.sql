-- вместо ALTER TABLE ... ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Todo" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- снимаем дефолт, чтобы дальше значение ставил только Prisma через @updatedAt
ALTER TABLE "Todo" ALTER COLUMN "updatedAt" DROP DEFAULT;