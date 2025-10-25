/*
  Warnings:

  - You are about to drop the column `firstName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `loginCode` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `loginCodeAttempts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `loginCodeExpiry` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `resetToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `resetTokenExpiry` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verificationToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `verificationTokenExpiry` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."users_loginCode_idx";

-- DropIndex
DROP INDEX "public"."users_resetToken_idx";

-- DropIndex
DROP INDEX "public"."users_verificationToken_idx";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "loginCode",
DROP COLUMN "loginCodeAttempts",
DROP COLUMN "loginCodeExpiry",
DROP COLUMN "password",
DROP COLUMN "resetToken",
DROP COLUMN "resetTokenExpiry",
DROP COLUMN "verificationToken",
DROP COLUMN "verificationTokenExpiry",
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3),
ADD COLUMN     "otpLastSent" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "users_otpCode_idx" ON "public"."users"("otpCode");
