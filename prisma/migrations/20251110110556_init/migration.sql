-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMINISTRATEUR', 'NOTAIRE', 'OPERATEUR', 'REVIEWER');

-- CreateEnum
CREATE TYPE "public"."ClientType" AS ENUM ('PERSONNE_PHYSIQUE', 'PERSONNE_MORALE');

-- CreateEnum
CREATE TYPE "public"."ProfilType" AS ENUM ('PROPRIETAIRE', 'LOCATAIRE');

-- CreateEnum
CREATE TYPE "public"."FamilyStatus" AS ENUM ('CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF', 'PACS');

-- CreateEnum
CREATE TYPE "public"."MatrimonialRegime" AS ENUM ('COMMUNAUTE_REDUITE', 'SEPARATION_DE_BIENS', 'PARTICIPATION_AUX_AQUETS', 'COMMUNAUTE_UNIVERSELLE');

-- CreateEnum
CREATE TYPE "public"."PropertyStatus" AS ENUM ('LOUER', 'NON_LOUER');

-- CreateEnum
CREATE TYPE "public"."BienType" AS ENUM ('APPARTEMENT', 'MAISON', 'CHAMBRE', 'LOCAL_COMMERCIAL', 'LOCAL_PROFESSIONNEL', 'LOCAL_SAISONNIER');

-- CreateEnum
CREATE TYPE "public"."BienLegalStatus" AS ENUM ('PLEIN_PROPRIETE', 'CO_PROPRIETE', 'LOTISSEMENT');

-- CreateEnum
CREATE TYPE "public"."BailType" AS ENUM ('BAIL_NU_3_ANS', 'BAIL_NU_6_ANS', 'BAIL_MEUBLE_1_ANS', 'BAIL_MEUBLE_9_MOIS');

-- CreateEnum
CREATE TYPE "public"."BailFamille" AS ENUM ('HABITATION', 'MEUBLE', 'COMMERCIAL', 'PROFESSIONNEL', 'SAISONNIER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."BailStatus" AS ENUM ('DRAFT', 'PENDING_VALIDATION', 'READY_FOR_NOTARY', 'ACTIVE', 'TERMINATED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."IntakeTarget" AS ENUM ('OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "public"."CommentTarget" AS ENUM ('CLIENT', 'PROPERTY', 'BAIL', 'DOCUMENT', 'INTAKE');

-- CreateEnum
CREATE TYPE "public"."DocumentKind" AS ENUM ('KBIS', 'STATUTES', 'INSURANCE', 'TITLE_DEED', 'BIRTH_CERT', 'ID_IDENTITY', 'LIVRET_DE_FAMILLE', 'CONTRAT_DE_PACS', 'DIAGNOSTICS', 'REGLEMENT_COPROPRIETE', 'CAHIER_DE_CHARGE_LOTISSEMENT', 'STATUT_DE_LASSOCIATION_SYNDICALE', 'RIB');

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'ADMINISTRATEUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "type" "public"."ClientType" NOT NULL,
    "profilType" "public"."ProfilType" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "profession" TEXT,
    "legalName" TEXT,
    "registration" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "fullAddress" TEXT,
    "nationality" TEXT,
    "familyStatus" "public"."FamilyStatus",
    "matrimonialRegime" "public"."MatrimonialRegime",
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Property" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "fullAddress" TEXT NOT NULL,
    "surfaceM2" DECIMAL(12,2),
    "legalStatus" TEXT,
    "status" "public"."PropertyStatus" NOT NULL DEFAULT 'NON_LOUER',
    "baseRentAmount" DECIMAL(12,2),
    "monthlyCharges" DECIMAL(12,2),
    "securityDeposit" DECIMAL(12,2),
    "paymentDay" INTEGER,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bail" (
    "id" TEXT NOT NULL,
    "bailType" "public"."BailType" NOT NULL DEFAULT 'BAIL_NU_3_ANS',
    "bailFamily" "public"."BailFamille" NOT NULL,
    "status" "public"."BailStatus" NOT NULL DEFAULT 'DRAFT',
    "rentAmount" DECIMAL(12,2) NOT NULL,
    "monthlyCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "securityDeposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "paymentDay" TIMESTAMP(3),
    "propertyId" TEXT NOT NULL,
    "locataireId" TEXT,
    "proprietaireId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Bail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntakeLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "target" "public"."IntakeTarget" NOT NULL,
    "propertyId" TEXT,
    "bailId" TEXT,
    "clientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "IntakeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "kind" "public"."DocumentKind" NOT NULL DEFAULT 'BIRTH_CERT',
    "label" TEXT,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "clientId" TEXT,
    "propertyId" TEXT,
    "bailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedById" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommentInterface" (
    "id" TEXT NOT NULL,
    "target" "public"."CommentTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "CommentInterface_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "public"."articles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "public"."Client"("email");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "public"."Client"("type");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "public"."Property"("status");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "public"."Property"("ownerId");

-- CreateIndex
CREATE INDEX "Bail_status_idx" ON "public"."Bail"("status");

-- CreateIndex
CREATE INDEX "Bail_propertyId_idx" ON "public"."Bail"("propertyId");

-- CreateIndex
CREATE INDEX "Bail_locataireId_idx" ON "public"."Bail"("locataireId");

-- CreateIndex
CREATE INDEX "Bail_proprietaireId_idx" ON "public"."Bail"("proprietaireId");

-- CreateIndex
CREATE INDEX "Bail_effectiveDate_idx" ON "public"."Bail"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeLink_token_key" ON "public"."IntakeLink"("token");

-- CreateIndex
CREATE INDEX "IntakeLink_target_idx" ON "public"."IntakeLink"("target");

-- CreateIndex
CREATE INDEX "IntakeLink_status_idx" ON "public"."IntakeLink"("status");

-- CreateIndex
CREATE INDEX "IntakeLink_propertyId_idx" ON "public"."IntakeLink"("propertyId");

-- CreateIndex
CREATE INDEX "IntakeLink_bailId_idx" ON "public"."IntakeLink"("bailId");

-- CreateIndex
CREATE INDEX "IntakeLink_clientId_idx" ON "public"."IntakeLink"("clientId");

-- CreateIndex
CREATE INDEX "Document_kind_idx" ON "public"."Document"("kind");

-- CreateIndex
CREATE INDEX "Document_clientId_idx" ON "public"."Document"("clientId");

-- CreateIndex
CREATE INDEX "Document_propertyId_idx" ON "public"."Document"("propertyId");

-- CreateIndex
CREATE INDEX "Document_bailId_idx" ON "public"."Document"("bailId");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "public"."Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Document_fileKey_idx" ON "public"."Document"("fileKey");

-- CreateIndex
CREATE INDEX "CommentInterface_target_targetId_idx" ON "public"."CommentInterface"("target", "targetId");

-- CreateIndex
CREATE INDEX "CommentInterface_createdById_idx" ON "public"."CommentInterface"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "public"."Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_identifier_value_key" ON "public"."Verification"("identifier", "value");

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bail" ADD CONSTRAINT "Bail_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bail" ADD CONSTRAINT "Bail_locataireId_fkey" FOREIGN KEY ("locataireId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bail" ADD CONSTRAINT "Bail_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bail" ADD CONSTRAINT "Bail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bail" ADD CONSTRAINT "Bail_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntakeLink" ADD CONSTRAINT "IntakeLink_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntakeLink" ADD CONSTRAINT "IntakeLink_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "public"."Bail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntakeLink" ADD CONSTRAINT "IntakeLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntakeLink" ADD CONSTRAINT "IntakeLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_bailId_fkey" FOREIGN KEY ("bailId") REFERENCES "public"."Bail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentInterface" ADD CONSTRAINT "CommentInterface_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
