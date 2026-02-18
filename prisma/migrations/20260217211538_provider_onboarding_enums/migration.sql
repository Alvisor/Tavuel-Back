-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BankAccountType" ADD VALUE 'NEQUI';
ALTER TYPE "BankAccountType" ADD VALUE 'DAVIPLATA';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'ANTECEDENTES';
ALTER TYPE "DocumentType" ADD VALUE 'BANK_CERTIFICATE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeMode" "UserRole" NOT NULL DEFAULT 'CLIENT',
ADD COLUMN     "wantsToBeProvider" BOOLEAN NOT NULL DEFAULT false;
