/*
  Warnings:

  - The values [REFUND_PENDING,REFUND_FAILED,REFUND_PROCESSING] on the enum `RefundStatus` will be removed. If these variants are still used in the database, this will fail.
  - Changed the type of `status` on the `Refund` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."RefundStatus_new" AS ENUM ('REFUNDED', 'NONE', 'PENDING', 'FAILED', 'PROCESSING');
ALTER TABLE "public"."payments" ALTER COLUMN "refundStatus" DROP DEFAULT;
ALTER TABLE "public"."payments" ALTER COLUMN "refundStatus" TYPE "public"."RefundStatus_new" USING ("refundStatus"::text::"public"."RefundStatus_new");
ALTER TABLE "public"."Refund" ALTER COLUMN "status" TYPE "public"."RefundStatus_new" USING ("status"::text::"public"."RefundStatus_new");
ALTER TYPE "public"."RefundStatus" RENAME TO "RefundStatus_old";
ALTER TYPE "public"."RefundStatus_new" RENAME TO "RefundStatus";
DROP TYPE "public"."RefundStatus_old";
ALTER TABLE "public"."payments" ALTER COLUMN "refundStatus" SET DEFAULT 'NONE';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Refund" DROP COLUMN "status",
ADD COLUMN     "status" "public"."RefundStatus" NOT NULL;
