/*
  Warnings:

  - You are about to drop the column `idDocumentBack` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `idDocumentFront` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `idNumber` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `idType` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `identityVerified` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "guestIdDocumentUrl" TEXT,
ADD COLUMN     "guestIdNumber" TEXT,
ADD COLUMN     "guestIdType" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "idDocumentBack",
DROP COLUMN "idDocumentFront",
DROP COLUMN "idNumber",
DROP COLUMN "idType",
DROP COLUMN "identityVerified";
