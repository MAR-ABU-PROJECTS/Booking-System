/*
  Warnings:

  - You are about to drop the column `subtotal` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "subtotal";

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "zipCode" TEXT;
