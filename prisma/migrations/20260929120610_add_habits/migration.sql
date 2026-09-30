-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKLY_COUNT', 'WEEKDAYS');

-- CreateTable
CREATE TABLE "Habit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'oklch(60% 0.14 240)',
    "frequency" "HabitFrequency" NOT NULL DEFAULT 'DAILY',
    "weekdays" TEXT,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "startDate" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitEntry" (
    "id" SERIAL NOT NULL,
    "habitId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HabitEntry_date_idx" ON "HabitEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitEntry_habitId_date_key" ON "HabitEntry"("habitId", "date");

-- AddForeignKey
ALTER TABLE "HabitEntry" ADD CONSTRAINT "HabitEntry_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
