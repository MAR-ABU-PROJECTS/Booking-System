-- AlterTable
ALTER TABLE "users" ADD COLUMN     "idDocumentBack" TEXT,
ADD COLUMN     "idDocumentFront" TEXT,
ADD COLUMN     "idRejectionReason" TEXT,
ADD COLUMN     "idVerificationStatus" TEXT DEFAULT 'pending';
