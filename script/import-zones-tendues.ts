/**
 * Script d'import des zones tendues depuis un fichier CSV
 * 
 * Format CSV attendu (séparateur: point-virgule ou tabulation) :
 * AGGLOMÉRATIONS;DÉPARTEMENTS;COMMUNES;CODE INSEE
 * 
 * Usage :
 *   1. Exporter votre Excel en CSV (UTF-8, séparateur ; ou tabulation)
 *   2. Placer le fichier dans le dossier prisma/ (ex: prisma/zones-tendues.csv)
 *   3. Exécuter : npx tsx script/import-zones-tendues.ts prisma/zones-tendues.csv
 * 
 * Options :
 *   --dry-run    Affiche les données sans les insérer en base
 *   --reset      Supprime toutes les zones tendues existantes avant l'import
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Mapping département → région
const departmentToRegion: Record<string, string> = {
  "01": "Auvergne-Rhône-Alpes",
  "02": "Hauts-de-France",
  "03": "Auvergne-Rhône-Alpes",
  "04": "Provence-Alpes-Côte d'Azur",
  "05": "Provence-Alpes-Côte d'Azur",
  "06": "Provence-Alpes-Côte d'Azur",
  "07": "Auvergne-Rhône-Alpes",
  "08": "Grand Est",
  "09": "Occitanie",
  "10": "Grand Est",
  "11": "Occitanie",
  "12": "Occitanie",
  "13": "Provence-Alpes-Côte d'Azur",
  "14": "Normandie",
  "15": "Auvergne-Rhône-Alpes",
  "16": "Nouvelle-Aquitaine",
  "17": "Nouvelle-Aquitaine",
  "18": "Centre-Val de Loire",
  "19": "Nouvelle-Aquitaine",
  "2A": "Corse",
  "2B": "Corse",
  "21": "Bourgogne-Franche-Comté",
  "22": "Bretagne",
  "23": "Nouvelle-Aquitaine",
  "24": "Nouvelle-Aquitaine",
  "25": "Bourgogne-Franche-Comté",
  "26": "Auvergne-Rhône-Alpes",
  "27": "Normandie",
  "28": "Centre-Val de Loire",
  "29": "Bretagne",
  "30": "Occitanie",
  "31": "Occitanie",
  "32": "Occitanie",
  "33": "Nouvelle-Aquitaine",
  "34": "Occitanie",
  "35": "Bretagne",
  "36": "Centre-Val de Loire",
  "37": "Centre-Val de Loire",
  "38": "Auvergne-Rhône-Alpes",
  "39": "Bourgogne-Franche-Comté",
  "40": "Nouvelle-Aquitaine",
  "41": "Centre-Val de Loire",
  "42": "Auvergne-Rhône-Alpes",
  "43": "Auvergne-Rhône-Alpes",
  "44": "Pays de la Loire",
  "45": "Centre-Val de Loire",
  "46": "Occitanie",
  "47": "Nouvelle-Aquitaine",
  "48": "Occitanie",
  "49": "Pays de la Loire",
  "50": "Normandie",
  "51": "Grand Est",
  "52": "Grand Est",
  "53": "Pays de la Loire",
  "54": "Grand Est",
  "55": "Grand Est",
  "56": "Bretagne",
  "57": "Grand Est",
  "58": "Bourgogne-Franche-Comté",
  "59": "Hauts-de-France",
  "60": "Hauts-de-France",
  "61": "Normandie",
  "62": "Hauts-de-France",
  "63": "Auvergne-Rhône-Alpes",
  "64": "Nouvelle-Aquitaine",
  "65": "Occitanie",
  "66": "Occitanie",
  "67": "Grand Est",
  "68": "Grand Est",
  "69": "Auvergne-Rhône-Alpes",
  "70": "Bourgogne-Franche-Comté",
  "71": "Bourgogne-Franche-Comté",
  "72": "Pays de la Loire",
  "73": "Auvergne-Rhône-Alpes",
  "74": "Auvergne-Rhône-Alpes",
  "75": "Île-de-France",
  "76": "Normandie",
  "77": "Île-de-France",
  "78": "Île-de-France",
  "79": "Nouvelle-Aquitaine",
  "80": "Hauts-de-France",
  "81": "Occitanie",
  "82": "Occitanie",
  "83": "Provence-Alpes-Côte d'Azur",
  "84": "Provence-Alpes-Côte d'Azur",
  "85": "Pays de la Loire",
  "86": "Nouvelle-Aquitaine",
  "87": "Nouvelle-Aquitaine",
  "88": "Grand Est",
  "89": "Bourgogne-Franche-Comté",
  "90": "Bourgogne-Franche-Comté",
  "91": "Île-de-France",
  "92": "Île-de-France",
  "93": "Île-de-France",
  "94": "Île-de-France",
  "95": "Île-de-France",
  "971": "Guadeloupe",
  "972": "Martinique",
  "973": "Guyane",
  "974": "La Réunion",
  "976": "Mayotte",
};

// Extraire le code département depuis un code INSEE
function getDepartmentFromInsee(inseeCode: string): string {
  if (inseeCode.startsWith("97")) {
    return inseeCode.substring(0, 3); // DOM-TOM : 971, 972, etc.
  }
  if (inseeCode.startsWith("2A") || inseeCode.startsWith("2B")) {
    return inseeCode.substring(0, 2); // Corse
  }
  return inseeCode.substring(0, 2); // Métropole
}

// Récupérer le code postal via l'API geo.api.gouv.fr
async function fetchPostalCode(inseeCode: string): Promise<string> {
  try {
    const response = await fetch(
      `https://geo.api.gouv.fr/communes/${inseeCode}?fields=codesPostaux`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.codesPostaux && data.codesPostaux.length > 0) {
        return data.codesPostaux[0]; // Premier code postal
      }
    }
  } catch (error) {
    // Silencieux - on utilisera le fallback
  }
  // Fallback : générer un code postal approximatif depuis le département
  const dept = getDepartmentFromInsee(inseeCode);
  return `${dept}000`;
}

interface CsvRow {
  agglomeration: string;
  department: string;
  commune: string;
  inseeCode: string;
}

function parseCsvLine(line: string): string[] {
  // Supporter les séparateurs : tabulation, point-virgule, virgule
  if (line.includes("\t")) {
    return line.split("\t").map((s) => s.trim());
  }
  if (line.includes(";")) {
    return line.split(";").map((s) => s.trim());
  }
  return line.split(",").map((s) => s.trim());
}

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("Le fichier CSV doit contenir au moins un en-tête et une ligne de données");
  }

  // Ignorer l'en-tête
  const dataLines = lines.slice(1);
  const rows: CsvRow[] = [];

  for (const line of dataLines) {
    const cols = parseCsvLine(line);

    if (cols.length < 4) {
      console.warn(`⚠️  Ligne ignorée (moins de 4 colonnes) : "${line}"`);
      continue;
    }

    const inseeCode = cols[3].replace(/['"]/g, "").trim();
    
    // Valider le code INSEE (5 caractères, chiffres sauf Corse 2A/2B)
    if (!inseeCode || inseeCode.length < 4 || inseeCode.length > 5) {
      console.warn(`⚠️  Code INSEE invalide ignoré : "${inseeCode}" (ligne: "${line}")`);
      continue;
    }

    rows.push({
      agglomeration: cols[0].replace(/['"]/g, "").trim(),
      department: cols[1].replace(/['"]/g, "").trim(),
      commune: cols[2].replace(/['"]/g, "").trim(),
      inseeCode: inseeCode.padStart(5, "0"), // S'assurer que le code fait 5 caractères
    });
  }

  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const reset = args.includes("--reset");
  const csvPath = args.find((a) => !a.startsWith("--"));

  if (!csvPath) {
    console.error("❌ Usage : npx tsx script/import-zones-tendues.ts <chemin-csv> [--dry-run] [--reset]");
    console.error("");
    console.error("  <chemin-csv>  Chemin vers le fichier CSV exporté depuis Excel");
    console.error("  --dry-run     Affiche les données sans les insérer en base");
    console.error("  --reset       Supprime toutes les zones tendues existantes avant l'import");
    console.error("");
    console.error("  Format CSV attendu (séparateur ; ou tabulation) :");
    console.error('  AGGLOMÉRATIONS;DÉPARTEMENTS;COMMUNES;CODE INSEE');
    process.exit(1);
  }

  const fullPath = path.resolve(csvPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Fichier introuvable : ${fullPath}`);
    process.exit(1);
  }

  console.log(`📄 Lecture du fichier : ${fullPath}`);
  const content = fs.readFileSync(fullPath, "utf-8");
  const rows = parseCsv(content);

  console.log(`📊 ${rows.length} communes trouvées dans le CSV`);

  if (rows.length === 0) {
    console.error("❌ Aucune donnée valide trouvée dans le CSV");
    process.exit(1);
  }

  // Afficher un aperçu
  console.log("\n📋 Aperçu des 5 premières lignes :");
  for (const row of rows.slice(0, 5)) {
    console.log(`   ${row.inseeCode} | ${row.commune} | ${row.department} | ${row.agglomeration}`);
  }
  if (rows.length > 5) {
    console.log(`   ... et ${rows.length - 5} autres`);
  }

  if (dryRun) {
    console.log("\n🔍 Mode dry-run — aucune donnée insérée en base");
    
    // Afficher toutes les lignes
    console.log("\n📋 Liste complète :");
    for (const row of rows) {
      const dept = getDepartmentFromInsee(row.inseeCode);
      const region = departmentToRegion[dept] || "Inconnue";
      console.log(`   ${row.inseeCode} | ${row.commune.padEnd(30)} | ${dept.padEnd(3)} | ${region}`);
    }
    
    // Stats
    const departments = new Set(rows.map((r) => r.department));
    const agglomerations = new Set(rows.map((r) => r.agglomeration));
    console.log(`\n📊 Statistiques :`);
    console.log(`   ${rows.length} communes`);
    console.log(`   ${departments.size} départements`);
    console.log(`   ${agglomerations.size} agglomérations`);
    
    return;
  }

  // Vérifier les doublons dans le CSV
  const inseeCodesInCsv = rows.map((r) => r.inseeCode);
  const duplicates = inseeCodesInCsv.filter((code, i) => inseeCodesInCsv.indexOf(code) !== i);
  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    console.warn(`\n⚠️  ${uniqueDuplicates.length} code(s) INSEE en doublon dans le CSV :`);
    for (const dup of uniqueDuplicates.slice(0, 10)) {
      const matching = rows.filter((r) => r.inseeCode === dup);
      console.warn(`   ${dup} → ${matching.map((r) => r.commune).join(", ")}`);
    }
    console.warn("   Les doublons seront ignorés (seule la première occurrence sera gardée).");
  }

  // Dédupliquer par code INSEE
  const uniqueRows = new Map<string, CsvRow>();
  for (const row of rows) {
    if (!uniqueRows.has(row.inseeCode)) {
      uniqueRows.set(row.inseeCode, row);
    }
  }

  // Reset si demandé
  if (reset) {
    console.log("\n🗑️  Suppression des zones tendues existantes...");
    const deleted = await prisma.zoneTendue.deleteMany({});
    console.log(`   ${deleted.count} zone(s) tendue(s) supprimée(s)`);
  }

  // Import
  console.log(`\n🚀 Import de ${uniqueRows.size} communes en base de données...`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  // Récupérer les codes postaux par batch via l'API
  console.log("📮 Récupération des codes postaux via geo.api.gouv.fr...");

  for (const [inseeCode, row] of uniqueRows) {
    try {
      const dept = getDepartmentFromInsee(inseeCode);
      const region = departmentToRegion[dept] || "Inconnue";
      const postalCode = await fetchPostalCode(inseeCode);

      const result = await prisma.zoneTendue.upsert({
        where: { inseeCode },
        update: {
          city: row.commune,
          postalCode,
          department: dept,
          region,
          isActive: true,
          // Ne pas toucher à rentControlEnabled lors d'un update
        },
        create: {
          inseeCode,
          city: row.commune,
          postalCode,
          department: dept,
          region,
          isActive: true,
          rentControlEnabled: false, // Par défaut, pas d'encadrement
        },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }

      // Log progression tous les 50
      if ((created + updated) % 50 === 0) {
        console.log(`   ... ${created + updated}/${uniqueRows.size} traité(s)`);
      }

      // Petite pause pour ne pas surcharger l'API geo
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error: any) {
      errors++;
      console.error(`   ❌ Erreur pour ${inseeCode} (${row.commune}) : ${error.message}`);
    }
  }

  console.log("\n✅ Import terminé !");
  console.log(`   📊 Résultats :`);
  console.log(`      ✅ ${created} créée(s)`);
  console.log(`      🔄 ${updated} mise(s) à jour`);
  if (errors > 0) {
    console.log(`      ❌ ${errors} erreur(s)`);
  }

  // Afficher le total en base
  const totalInDb = await prisma.zoneTendue.count({ where: { isActive: true } });
  console.log(`\n   📊 Total en base : ${totalInDb} zone(s) tendue(s) actives`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



