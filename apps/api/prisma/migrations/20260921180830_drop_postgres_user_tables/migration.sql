-- User and RefreshToken moved to DynamoDB (Phase 1 auth cutover) — Postgres
-- no longer has a `users` table at all, so the FK constraints tying
-- expenses/expense_participants/settlements to it are dropped too. The user
-- id columns stay as plain (unconstrained) strings.

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "expense_participants" DROP CONSTRAINT "expense_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_from_user_id_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_to_user_id_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropTable
DROP TABLE "refresh_tokens";

-- DropTable
DROP TABLE "users";
