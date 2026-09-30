-- добавляем флаг
ALTER TABLE "Person" ADD COLUMN "isMe" BOOLEAN NOT NULL DEFAULT false;

-- заводим запись «Я»
INSERT INTO "Person" ("name", "isMe") VALUES ('Я', true);

-- бэкфилл: задачи, которые уже "в работе" без исполнителя, назначаем на меня
UPDATE "Todo"
SET "assigneeId" = (SELECT "id" FROM "Person" WHERE "isMe" = true LIMIT 1)
WHERE "status" = 'IN_PROGRESS' AND "assigneeId" IS NULL;