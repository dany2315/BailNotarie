/**
 * Import des données d'encadrement des loyers (data/rent-cap/*.json) en base.
 *
 * Chaque fichier décrit un arrêté préfectoral d'un territoire (l'actuel ou un précédent) : zones,
 * contours (quartiers, îlots ou communes) et loyers de référence par catégorie.
 * L'import remplace un territoire à la fois, dans une transaction : il peut être
 * rejoué sans risque à chaque nouvel arrêté. Il ne touche à aucune autre donnée.
 *
 * Usage : npm run rent-cap:import            (tous les territoires)
 *         npm run rent-cap:import -- paris   (un seul)
 */
import "dotenv/config";
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
  const zones = new Set(file.zones.map((z) => z.code));
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

async function main() {
  const url = process.env.DATABASE_URL || "";
  const prisma = new PrismaClient();
  const dir = join(process.cwd(), "data", "rent-cap");
  const only = process.argv.slice(2);
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => only.length === 0 || only.includes(name.replace(/\.json$/, "")));
  if (files.length === 0) throw new Error("Aucun fichier à importer");
  console.log(`Base : ${new URL(url).host}`);

  for (const name of files) {
    const file = JSON.parse(readFileSync(join(dir, name), "utf8")) as TerritoryFile;
    check(file);
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
        if (file.references.length) await tx.rentCapReference.createMany({
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
      },
      { timeout: 120_000 },
    );
    console.log(`${file.id} : ${file.zones.length} zones, ${file.areas.length} contours, ${file.references.length} références (${file.validFrom} → ${file.validTo})`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
