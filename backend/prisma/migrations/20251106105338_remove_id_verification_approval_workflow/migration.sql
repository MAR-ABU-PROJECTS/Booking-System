/*
  Warnings:

  - You are about to drop the column `idRejectionReason` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `idVerificationStatus` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "idRejectionReason",
DROP COLUMN "idVerificationStatus";
