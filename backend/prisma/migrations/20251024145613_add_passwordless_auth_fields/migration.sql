-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "loginCode" TEXT,
ADD COLUMN     "loginCodeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loginCodeExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_loginCode_idx" ON "public"."users"("loginCode");
