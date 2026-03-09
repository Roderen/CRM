-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'MEETING', 'EMAIL', 'NOTE');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "note" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
