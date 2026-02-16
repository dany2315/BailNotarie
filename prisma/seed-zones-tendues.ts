/**
 * Script de seed pour peupler la base de données avec les zones tendues françaises
 * 
 * Ce script doit être exécuté après la migration pour charger les données initiales.
 * Les données doivent être mises à jour périodiquement depuis les sources officielles.
 * 
 * Sources de données recommandées :
 * - Décrets et arrêtés préfectoraux (loi ALUR)
 * - data.gouv.fr
 * - Sites préfectoraux
 * - ANAH (Agence Nationale de l'Habitat)
 * - Ministère du Logement
 */

import { PrismaClient, BienType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

/**
 * Liste des communes en zone tendue (exemple avec quelques communes principales)
 * À remplacer par les données officielles complètes
 * 
 * Format attendu :
 * - inseeCode: Code INSEE de la commune
 * - city: Nom de la commune
 * - postalCode: Code postal principal
 * - department: Département
 * - region: Région
 * - rentControlEnabled: Si limitation de loyer activée
 */
const zonesTenduesData = [
  // Exemples - À remplacer par les données officielles complètes
  {
    inseeCode: "75056", // Paris
    city: "Paris",
    postalCode: "75001",
    department: "75",
    region: "Île-de-France",
    rentControlEnabled: true,
    rentControls: [
      {
        propertyType: BienType.APPARTEMENT,
        maxRentPerM2: 43.58, // Exemple - à mettre à jour avec les valeurs officielles
        effectiveDate: new Date("2024-01-01"),
      },
      {
        propertyType: BienType.MAISON,
        maxRentPerM2: 43.58,
        effectiveDate: new Date("2024-01-01"),
      },
    ],
  },
  {
    inseeCode: "69123", // Lyon
    city: "Lyon",
    postalCode: "69001",
    department: "69",
    region: "Auvergne-Rhône-Alpes",
    rentControlEnabled: true,
    rentControls: [
      {
        propertyType: BienType.APPARTEMENT,
        maxRentPerM2: 20.50, // Exemple - à mettre à jour avec les valeurs officielles
        effectiveDate: new Date("2024-01-01"),
      },
      {
        propertyType: BienType.MAISON,
        maxRentPerM2: 20.50,
        effectiveDate: new Date("2024-01-01"),
      },
    ],
  },
  {
    inseeCode: "13055", // Marseille
    city: "Marseille",
    postalCode: "13001",
    department: "13",
    region: "Provence-Alpes-Côte d'Azur",
    rentControlEnabled: true,
    rentControls: [
      {
        propertyType: BienType.APPARTEMENT,
        maxRentPerM2: 19.50, // Exemple - à mettre à jour avec les valeurs officielles
        effectiveDate: new Date("2024-01-01"),
      },
      {
        propertyType: BienType.MAISON,
        maxRentPerM2: 19.50,
        effectiveDate: new Date("2024-01-01"),
      },
    ],
  },
  // Ajouter d'autres communes selon les données officielles
];

async function main() {
  console.log("🌱 Début du seed des zones tendues...");

  for (const zoneData of zonesTenduesData) {
    const { rentControls, ...zoneTendueData } = zoneData;

    // Créer ou mettre à jour la zone tendue
    const zoneTendue = await prisma.zoneTendue.upsert({
      where: {
        inseeCode: zoneData.inseeCode,
      },
      update: {
        city: zoneTendueData.city,
        postalCode: zoneTendueData.postalCode,
        department: zoneTendueData.department,
        region: zoneTendueData.region,
        rentControlEnabled: zoneTendueData.rentControlEnabled,
        isActive: true,
      },
      create: {
        inseeCode: zoneData.inseeCode,
        city: zoneTendueData.city,
        postalCode: zoneTendueData.postalCode,
        department: zoneTendueData.department,
        region: zoneTendueData.region,
        rentControlEnabled: zoneTendueData.rentControlEnabled,
        isActive: true,
      },
    });

    console.log(`✅ Zone tendue créée/mise à jour : ${zoneTendue.city} (${zoneTendue.inseeCode})`);

    // Créer ou mettre à jour les limitations de loyer
    if (rentControls && zoneTendueData.rentControlEnabled) {
      for (const rentControlData of rentControls) {
        // Vérifier si une limitation existe déjà pour cette zone et ce type de bien
        const existingRentControl = await prisma.rentControl.findFirst({
          where: {
            zoneTendueId: zoneTendue.id,
            propertyType: rentControlData.propertyType,
          },
        });

        if (existingRentControl) {
          await prisma.rentControl.update({
            where: { id: existingRentControl.id },
            data: {
              maxRentPerM2: new Decimal(rentControlData.maxRentPerM2),
              effectiveDate: rentControlData.effectiveDate,
            },
          });
        } else {
          await prisma.rentControl.create({
            data: {
              zoneTendueId: zoneTendue.id,
              propertyType: rentControlData.propertyType,
              maxRentPerM2: new Decimal(rentControlData.maxRentPerM2),
              effectiveDate: rentControlData.effectiveDate,
            },
          });
        }
      }
      console.log(`  ✅ Limitations de loyer créées/mises à jour pour ${zoneTendue.city}`);
    }
  }

  console.log("✅ Seed des zones tendues terminé !");
  console.log(`📊 ${zonesTenduesData.length} zone(s) tendue(s) chargée(s)`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed des zones tendues:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

