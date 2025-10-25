-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'BOOKING_UPDATED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BOOKING_AUTO_CANCELLED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PAYMENT_INITIATED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'RECEIPT_UPLOADED';

-- AlterEnum
ALTER TYPE "public"."PaymentStatus" ADD VALUE 'INITIATED';
