/*
  Warnings:

  - You are about to drop the column `serviceFee` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `serviceFee` on the `properties` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."bookings" DROP COLUMN "serviceFee",
ADD COLUMN     "cautionFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."properties" DROP COLUMN "serviceFee",
ADD COLUMN     "cautionFee" DOUBLE PRECISION DEFAULT 100000;
