-- AlterTable
ALTER TABLE "public"."payments" ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundCompletedAt" TIMESTAMP(3),
ADD COLUMN     "refundFailedReason" TEXT,
ADD COLUMN     "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN     "refundStatus" TEXT;
