/*
  Warnings:

  - Added the required column `userId` to the `SharedFolder` table without a default value. This is not possible if the table is not empty.
  - Made the column `folderId` on table `SharedFolder` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "SharedFolder" DROP CONSTRAINT "SharedFolder_folderId_fkey";

-- DropIndex
DROP INDEX "SharedFolder_folderId_key";

-- AlterTable
ALTER TABLE "SharedFolder" ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "folderId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "SharedFolder" ADD CONSTRAINT "SharedFolder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedFolder" ADD CONSTRAINT "SharedFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
