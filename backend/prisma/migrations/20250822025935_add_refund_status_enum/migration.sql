/*
  Warnings:

  - The `refundStatus` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED', 'NONE');

-- AlterTable
ALTER TABLE "public"."payments" DROP COLUMN "refundStatus",
ADD COLUMN     "refundStatus" "public"."RefundStatus" NOT NULL DEFAULT 'NONE';
