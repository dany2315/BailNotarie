/*
  Warnings:

  - You are about to drop the `articles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."articles" DROP CONSTRAINT "articles_categoryId_fkey";

-- DropTable
DROP TABLE "public"."articles";

-- DropTable
DROP TABLE "public"."categories";
