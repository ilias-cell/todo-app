-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurrence" "Recurrence",
ADD COLUMN     "recurrenceEnd" DATE;
