-- AlterEnum
ALTER TYPE "public"."NotificationType" ADD VALUE 'REFUND_PROCESSED';

-- AlterTable
ALTER TABLE "public"."Refund" ALTER COLUMN "reason" DROP NOT NULL;
