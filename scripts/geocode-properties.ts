/**
 * Localise les biens enregistrés sans code commune ou sans position (adresse tapée sans choisir de
 * suggestion), à partir de leur adresse, via la Base adresse nationale. Ne remplit que les champs vides.
 *
 * Usage : npm run properties:geocode            (simulation : affiche ce qui serait fait)
 *         npm run properties:geocode -- --apply  (enregistre)
 */
import "dotenv/config";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaClient } from "@prisma/client";

const BAN_API_URL = "https://api-adresse.data.gouv.fr/search/";
const MIN_SCORE = 0.8;

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  console.log(`Base : ${new URL(process.env.DATABASE_URL || "").host} · ${apply ? "ENREGISTREMENT" : "simulation"}`);
  const properties = await prisma.property.findMany({
    where: { OR: [{ inseeCode: null }, { latitude: null }, { longitude: null }] },
    select: { id: true, fullAddress: true, inseeCode: true, latitude: true, longitude: true, postalCode: true, city: true },
  });
  let located = 0;
  for (const p of properties) {
    if (!p.fullAddress?.trim()) continue;
    const url = new URL(BAN_API_URL);
    url.searchParams.set("q", p.fullAddress);
    url.searchParams.set("limit", "1");
    const feature = (await (await fetch(url)).json())?.features?.[0];
    const props = feature?.properties;
    const ok = props && props.score >= MIN_SCORE && (props.type === "housenumber" || props.type === "street") && (!p.inseeCode || p.inseeCode === props.citycode);
    console.log(`${ok ? "✓" : "✗"} ${p.fullAddress} → ${props ? `${props.label} (${props.citycode}, score ${props.score.toFixed(2)})` : "introuvable"}`);
    if (!ok) continue;
    located++;
    if (apply) {
      await prisma.property.update({
        where: { id: p.id },
        data: {
          inseeCode: p.inseeCode ?? props.citycode,
          latitude: p.latitude ?? new Decimal(feature.geometry.coordinates[1]),
          longitude: p.longitude ?? new Decimal(feature.geometry.coordinates[0]),
          postalCode: p.postalCode ?? props.postcode ?? null,
          city: p.city ?? props.city ?? null,
        },
      });
    }
    await new Promise((r) => setTimeout(r, 120)); // limite de la Base adresse nationale
  }
  console.log(`${properties.length} biens sans localisation · ${located} localisables${apply ? " (enregistrés)" : ""}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
