-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "userFeedback" "UserFeedback";
ALTER TABLE "chat_messages" ADD COLUMN "feedbackUpdatedAt" TIMESTAMP(3);

-- Backfill explicit historical ratings from linked evaluations.
UPDATE "chat_messages" AS cm
SET
  "userFeedback" = e."userFeedback",
  "feedbackUpdatedAt" = e."createdAt"
FROM "evaluations" AS e
WHERE e."assistantMessageId" = cm."id"
  AND e."userFeedback" IS NOT NULL
  AND cm."role" = 'ASSISTANT';
