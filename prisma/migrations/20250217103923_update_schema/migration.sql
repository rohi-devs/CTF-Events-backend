-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "dateTime" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "instaLink" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "time" DROP NOT NULL,
ALTER COLUMN "poster" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "poster" TEXT,
    "instaLink" TEXT,
    "gformLink" TEXT,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "ClubAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
