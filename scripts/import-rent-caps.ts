/**
 * Import des données d'encadrement des loyers (data/rent-cap/*.json) en base.
 *
 * Chaque fichier décrit un arrêté préfectoral d'un territoire (l'actuel ou un précédent) : zones,
 * contours (quartiers, îlots ou communes) et loyers de référence par catégorie.
 *
 * Déroulé, pour ne jamais exposer un référentiel importé à moitié :
 *  1. tous les fichiers sont lus et contrôlés AVANT la moindre écriture (une incohérence arrête tout) ;
 *  2. une ligne « import commencé » est écrite dans RentCapImport, avec le manifeste attendu (empreinte et
 *     comptes de chaque fichier) : à partir de là, le contrôle des loyers se déclare « impossible » ;
 *  3. chaque territoire est remplacé dans sa propre transaction ;
 *  4. la base est comparée au manifeste (territoires, zones, contours, références, liens) ;
 *  5. l'import n'est marqué « terminé » que si tout correspond. En cas de panne, relancer la même commande :
 *     elle reprend tout et ne marque « terminé » qu'après une vérification complète.
 *
 * La base visée est désignée explicitement (aucune valeur par défaut d'un fichier .env) :
 *
 *   npx tsx scripts/import-rent-caps.ts --env <NOM_VARIABLE> --confirm-host <début de l'hôte> [--env-file <chemin>] [paris lyon …]
 *   npx tsx scripts/import-rent-caps.ts --env <NOM_VARIABLE> --verify   (lecture seule : compare la base aux fichiers)
 *
 * L'import ne touche à aucune autre donnée : ni ZoneTendue, ni RentControl, ni biens, ni baux.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

type Geometry = { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };

interface TerritoryFile {
  id: string;
  label: string;
  inseeCodes: string[];
  /** « pending » : commune encadrée dont le barème n'est pas encore intégré. */
  zoneMode: "polygon" | "manual" | "pending";
  periods?: string[];
  houseTypes: boolean;
  validFrom: string;
  validTo: string;
  source: { title: string; url: string; geometry?: string };
  simulatorUrl?: string;
  mapUrl?: string;
  /** Communes entièrement dans une zone (code INSEE → zone), sans contour. */
  communeZones?: Record<string, string>;
  /** Communes encadrées en partie : hors des contours, le logement n'est pas concerné. */
  partialInseeCodes?: string[];
  /** Contours relevés sur une carte : distance (m) sous laquelle la zone est à confirmer. */
  precisionM?: number;
  zones: Array<{ code: string; label: string }>;
  areas: Array<{ zone: string; label: string; geometry: Geometry }>;
  references: Array<{
    zone: string;
    houseType: string;
    rooms: number;
    period: string;
    furnished: boolean;
    min: number;
    ref: number;
    max: number;
  }>;
}

interface ManifestEntry {
  id: string;
  file: string;
  sha256: string;
  zones: number;
  areas: number;
  references: number;
  validFrom: string;
  validTo: string;
}

const DEFAULT_PERIODS = ["BEFORE_1946", "FROM_1946_TO_1970", "FROM_1971_TO_1990", "AFTER_1990"];

function bbox(geometry: Geometry): number[] {
  const points = geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** Contrôles avant import : une donnée incohérente arrête tout. */
function check(file: TerritoryFile) {
  if (!file.id || !file.label || !Array.isArray(file.inseeCodes) || file.inseeCodes.length === 0) throw new Error(`${file.id || "?"} : identité du territoire incomplète`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(file.validFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(file.validTo) || file.validFrom > file.validTo) {
    throw new Error(`${file.id} : période de validité invalide (${file.validFrom} → ${file.validTo})`);
  }
  const zones = new Set(file.zones.map((z) => z.code));
  if (zones.size !== file.zones.length) throw new Error(`${file.id} : zone en double`);
  const periods = new Set(file.periods ?? DEFAULT_PERIODS);
  for (const area of file.areas) if (!zones.has(area.zone)) throw new Error(`${file.id} : contour hors zone ${area.zone}`);
  for (const [insee, zone] of Object.entries(file.communeZones ?? {})) {
    if (!zones.has(zone)) throw new Error(`${file.id} : commune ${insee} hors zone ${zone}`);
    if (!file.inseeCodes.includes(insee)) throw new Error(`${file.id} : commune ${insee} absente du territoire`);
  }
  for (const insee of file.partialInseeCodes ?? []) {
    if (!file.inseeCodes.includes(insee)) throw new Error(`${file.id} : commune partielle ${insee} absente du territoire`);
    if (file.communeZones?.[insee]) throw new Error(`${file.id} : commune ${insee} à la fois entière et partielle`);
  }
  for (const r of file.references) {
    if (!zones.has(r.zone)) throw new Error(`${file.id} : référence hors zone ${r.zone}`);
    if (!periods.has(r.period)) throw new Error(`${file.id} : époque inconnue ${r.period}`);
    if (r.rooms < 1 || r.rooms > 4) throw new Error(`${file.id} : pièces ${r.rooms}`);
    if (!(r.min < r.ref && r.ref < r.max)) throw new Error(`${file.id} : valeurs incohérentes ${JSON.stringify(r)}`);
  }
  if (file.zoneMode === "polygon" && file.areas.length === 0) throw new Error(`${file.id} : aucun contour`);
  if (file.zoneMode !== "pending" && file.references.length === 0) throw new Error(`${file.id} : aucune référence`);
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const VALUE_OPTIONS = ["env", "env-file", "confirm-host"];
/** Territoires demandés (arguments sans « -- », hors valeurs des options). */
const only = args.filter((arg, index) => !arg.startsWith("--") && !VALUE_OPTIONS.includes((args[index - 1] ?? "").replace(/^--/, "")));

function refuse(message: string): never {
  console.error(`Refusé : ${message}`);
  process.exit(2);
}

/** Lit et contrôle tous les fichiers du dossier (le référentiel attendu en entier). */
function readAll(dir: string) {
  const names = readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  if (names.length === 0) throw new Error("Aucun fichier de barème dans data/rent-cap");
  const seen = new Set<string>();
  return names.map((name) => {
    const raw = readFileSync(join(dir, name), "utf8");
    const file = JSON.parse(raw) as TerritoryFile;
    check(file);
    if (seen.has(file.id)) throw new Error(`${file.id} : territoire présent dans deux fichiers`);
    seen.add(file.id);
    const entry: ManifestEntry = {
      id: file.id,
      file: name,
      sha256: createHash("sha256").update(raw).digest("hex"),
      zones: file.zones.length,
      areas: file.areas.length,
      references: file.references.length,
      validFrom: file.validFrom,
      validTo: file.validTo,
    };
    return { name, file, entry };
  });
}

/** Compare la base au manifeste : renvoie les écarts (liste vide = référentiel complet et cohérent). */
async function verify(prisma: PrismaClient, manifest: ManifestEntry[]): Promise<string[]> {
  const gaps: string[] = [];
  const territories = await prisma.rentCapTerritory.findMany({
    select: { id: true, validFrom: true, validTo: true, _count: { select: { zones: true, areas: true, references: true } } },
  });
  const byId = new Map(territories.map((t) => [t.id, t]));
  for (const expected of manifest) {
    const found = byId.get(expected.id);
    if (!found) {
      gaps.push(`${expected.id} : territoire absent de la base`);
      continue;
    }
    if (found._count.zones !== expected.zones) gaps.push(`${expected.id} : ${found._count.zones} zones au lieu de ${expected.zones}`);
    if (found._count.areas !== expected.areas) gaps.push(`${expected.id} : ${found._count.areas} contours au lieu de ${expected.areas}`);
    if (found._count.references !== expected.references) gaps.push(`${expected.id} : ${found._count.references} références au lieu de ${expected.references}`);
    if (found.validFrom.toISOString().slice(0, 10) !== expected.validFrom || found.validTo.toISOString().slice(0, 10) !== expected.validTo) {
      gaps.push(`${expected.id} : période en base différente du fichier (${expected.validFrom} → ${expected.validTo})`);
    }
  }
  for (const territory of territories) {
    if (!manifest.some((entry) => entry.id === territory.id)) gaps.push(`${territory.id} : territoire en base sans fichier correspondant`);
  }
  // Liens : aucune zone, aucun contour ni aucune référence ne doit pointer hors des zones de son territoire.
  const orphans = await prisma.$queryRaw<Array<{ kind: string; n: bigint }>>`
    SELECT 'contour' AS kind, count(*) AS n FROM "RentCapArea" a
      WHERE NOT EXISTS (SELECT 1 FROM "RentCapZone" z WHERE z."territoryId" = a."territoryId" AND z."code" = a."zoneCode")
    UNION ALL
    SELECT 'référence' AS kind, count(*) AS n FROM "RentCapReference" r
      WHERE NOT EXISTS (SELECT 1 FROM "RentCapZone" z WHERE z."territoryId" = r."territoryId" AND z."code" = r."zoneCode")`;
  for (const row of orphans) if (Number(row.n) > 0) gaps.push(`${Number(row.n)} ${row.kind}(s) sans zone correspondante`);
  return gaps;
}

async function main() {
  const envName = option("env");
  if (!envName) refuse("--env <NOM_VARIABLE> est obligatoire (aucune base par défaut)");
  let url = process.env[envName!];
  const envFile = option("env-file");
  if (!url && envFile) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    url = require("dotenv").parse(readFileSync(envFile))[envName!];
  }
  if (!url) refuse(`variable ${envName} introuvable`);
  const host = new URL(url!).hostname;

  const dir = join(process.cwd(), "data", "rent-cap");
  // 1. Tout le référentiel attendu est lu et contrôlé avant la moindre écriture.
  const all = readAll(dir);
  const manifest = all.map((item) => item.entry);
  const selected = only.length === 0 ? all : all.filter((item) => only.includes(item.name.replace(/\.json$/, "")) || only.includes(item.file.id));
  if (selected.length === 0) throw new Error("Aucun fichier ne correspond aux territoires demandés");
  const totals = manifest.reduce((sum, e) => ({ zones: sum.zones + e.zones, areas: sum.areas + e.areas, references: sum.references + e.references }), { zones: 0, areas: 0, references: 0 });

  const prisma = new PrismaClient({ datasourceUrl: url, log: [] });
  try {
    console.log(`Base : ${host}`);
    console.log(`Référentiel attendu : ${manifest.length} territoires, ${totals.zones} zones, ${totals.areas} contours, ${totals.references} références`);

    if (flag("verify")) {
      const gaps = await verify(prisma, manifest);
      const last = await prisma.rentCapImport.findFirst({ orderBy: { startedAt: "desc" } });
      console.log(last ? `Dernier import : commencé le ${last.startedAt.toISOString()}, ${last.completedAt ? `terminé le ${last.completedAt.toISOString()}` : "NON TERMINÉ"}` : "Aucun import journalisé");
      console.log(gaps.length === 0 ? "Vérification : la base correspond aux fichiers." : `Vérification : ${gaps.length} écart(s)\n - ${gaps.join("\n - ")}`);
      if (gaps.length > 0) process.exitCode = 1;
      return;
    }

    const confirmHost = option("confirm-host");
    if (!confirmHost || !host.startsWith(confirmHost)) refuse(`--confirm-host doit reprendre le début de l'hôte visé (${host})`);

    // 2. Import commencé : tant qu'il n'est pas terminé, le contrôle des loyers se déclare « impossible ».
    const run = await prisma.rentCapImport.create({
      data: {
        manifest: manifest as unknown as Prisma.InputJsonValue,
        territories: manifest.length,
        ...totals,
        note: only.length ? `Territoires demandés : ${selected.map((s) => s.file.id).join(", ")}` : null,
      },
    });

    // 3. Un territoire à la fois, chacun dans sa transaction.
    for (const { file } of selected) {
      await prisma.$transaction(
        async (tx) => {
          await tx.rentCapTerritory.deleteMany({ where: { id: file.id } });
          await tx.rentCapTerritory.create({
            data: {
              id: file.id,
              label: file.label,
              inseeCodes: file.inseeCodes,
              zoneMode: file.zoneMode,
              periods: file.periods ?? DEFAULT_PERIODS,
              houseTypes: file.houseTypes,
              validFrom: new Date(`${file.validFrom}T00:00:00Z`),
              validTo: new Date(`${file.validTo}T12:00:00Z`),
              sourceTitle: file.source.title,
              sourceUrl: file.source.url,
              geometrySource: file.source.geometry ?? null,
              simulatorUrl: file.simulatorUrl ?? null,
              mapUrl: file.mapUrl ?? null,
              communeZones: file.communeZones ?? Prisma.DbNull,
              partialInseeCodes: file.partialInseeCodes ?? [],
              precisionM: file.precisionM ?? null,
            },
          });
          if (file.zones.length) {
            await tx.rentCapZone.createMany({ data: file.zones.map((z) => ({ territoryId: file.id, code: z.code, label: z.label })) });
          }
          if (file.areas.length) {
            await tx.rentCapArea.createMany({
              data: file.areas.map((a) => ({
                territoryId: file.id,
                zoneCode: a.zone,
                label: a.label,
                geometry: a.geometry as unknown as Prisma.InputJsonValue,
                bbox: bbox(a.geometry),
              })),
            });
          }
          if (file.references.length) {
            await tx.rentCapReference.createMany({
              data: file.references.map((r) => ({
                territoryId: file.id,
                zoneCode: r.zone,
                houseType: r.houseType,
                rooms: r.rooms,
                period: r.period,
                furnished: r.furnished,
                refMin: r.min,
                ref: r.ref,
                refMax: r.max,
              })),
            });
          }
        },
        { timeout: 120_000 },
      );
      console.log(`${file.id} : ${file.zones.length} zones, ${file.areas.length} contours, ${file.references.length} références (${file.validFrom} → ${file.validTo})`);
      // Point d'arrêt volontaire pour répéter une panne en cours d'import (essais uniquement).
      if (process.env.RENT_CAP_IMPORT_FAIL_AFTER === file.id) throw new Error(`Panne simulée après ${file.id}`);
    }

    // 4. La base entière est comparée au référentiel attendu.
    const gaps = await verify(prisma, manifest);
    if (gaps.length > 0) {
      console.error(`Import NON terminé : ${gaps.length} écart(s)\n - ${gaps.join("\n - ")}`);
      console.error("Le contrôle des loyers reste « impossible » tant que l'import n'est pas complet. Relancez l'import sans filtre.");
      process.exitCode = 1;
      return;
    }
    // 5. Tout correspond : le référentiel est ouvert au contrôle des loyers.
    await prisma.rentCapImport.update({ where: { id: run.id }, data: { completedAt: new Date() } });
    console.log(`Import terminé et vérifié : ${manifest.length} territoires, ${totals.zones} zones, ${totals.areas} contours, ${totals.references} références.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
