import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";

const BAN_API_URL = "https://api-adresse.data.gouv.fr/search/";
/** Score minimal de la Base adresse nationale pour retenir une adresse sans confirmation. */
const MIN_SCORE = 0.8;

export interface GeocodedAddress {
  inseeCode: string;
  latitude: number;
  longitude: number;
  postalCode: string | null;
  city: string | null;
  label: string;
  score: number;
}

/** Adresse localisée par la Base adresse nationale (au numéro ou à la rue), ou null si incertaine. */
export async function geocodeAddress(fullAddress: string): Promise<GeocodedAddress | null> {
  const query = fullAddress.trim();
  if (query.length < 5) return null;
  try {
    const url = new URL(BAN_API_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!response.ok) return null;
    const feature = (await response.json())?.features?.[0];
    const props = feature?.properties;
    const coords = feature?.geometry?.coordinates;
    if (!props || !Array.isArray(coords) || props.score < MIN_SCORE) return null;
    if (props.type !== "housenumber" && props.type !== "street") return null;
    return {
      inseeCode: props.citycode,
      longitude: coords[0],
      latitude: coords[1],
      postalCode: props.postcode ?? null,
      city: props.city ?? null,
      label: props.label,
      score: props.score,
    };
  } catch {
    return null;
  }
}

/**
 * Bien enregistré sans code commune ou sans position (adresse saisie sans choisir de suggestion,
 * anciens dossiers) : on le localise à partir de son adresse. Ne remplace jamais une donnée existante.
 */
export async function ensurePropertyGeocoded(propertyId: string): Promise<void> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { fullAddress: true, inseeCode: true, latitude: true, longitude: true, postalCode: true, city: true },
  });
  if (!property?.fullAddress || (property.inseeCode && property.latitude != null && property.longitude != null)) return;
  const found = await geocodeAddress(property.fullAddress);
  if (!found) return;
  // Code commune déjà connu et différent : l'adresse trouvée n'est pas la bonne.
  if (property.inseeCode && property.inseeCode !== found.inseeCode) return;
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      inseeCode: property.inseeCode ?? found.inseeCode,
      latitude: property.latitude ?? new Decimal(found.latitude),
      longitude: property.longitude ?? new Decimal(found.longitude),
      postalCode: property.postalCode ?? found.postalCode,
      city: property.city ?? found.city,
    },
  });
}
