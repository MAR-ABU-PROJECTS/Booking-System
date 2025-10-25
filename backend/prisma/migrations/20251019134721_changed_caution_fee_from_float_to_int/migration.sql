/*
  Warnings:

  - You are about to alter the column `cautionFee` on the `bookings` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `cautionFee` on the `properties` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "public"."bookings" ALTER COLUMN "cautionFee" SET DEFAULT 100000,
ALTER COLUMN "cautionFee" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "public"."properties" ALTER COLUMN "cautionFee" SET DEFAULT 100000,
ALTER COLUMN "cautionFee" SET DATA TYPE INTEGER;
