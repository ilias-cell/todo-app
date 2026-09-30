-- CreateEnum
CREATE TYPE "Status" AS ENUM ('INBOX', 'IN_PROGRESS', 'WAITING', 'REVIEW', 'DONE');

-- CreateTable Person
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- AlterTable: добавляем новые колонки (status пока с дефолтом INBOX)
ALTER TABLE "Todo" ADD COLUMN "status" "Status" NOT NULL DEFAULT 'INBOX';
ALTER TABLE "Todo" ADD COLUMN "followUpDate" TIMESTAMP(3);
ALTER TABLE "Todo" ADD COLUMN "waitingSince" TIMESTAMP(3);
ALTER TABLE "Todo" ADD COLUMN "customerId" INTEGER;
ALTER TABLE "Todo" ADD COLUMN "assigneeId" INTEGER;

-- >>> ПЕРЕНОС ДАННЫХ: старое done -> status <<<
UPDATE "Todo" SET "status" = 'DONE'  WHERE "done" = true;
UPDATE "Todo" SET "status" = 'INBOX' WHERE "done" = false;

-- Только теперь удаляем старую колонку
ALTER TABLE "Todo" DROP COLUMN "done";

-- Внешние ключи
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;