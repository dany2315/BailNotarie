import { prisma } from "@/lib/prisma";
import { inBbox, isFurnishedBail, pointInGeometry, toCents, type CapGeometry } from "@/lib/utils/rent-cap";

/** Paris, Lyon, Marseille : le code INSEE de l'arrondissement ou de la ville. */
function inseeCandidates(insee: string): string[] {
  const list = [insee];
  if (/^751\d\d$/.test(insee)) list.push("75056");
  if (/^6938\d$/.test(insee)) list.push("69123");
  return list;
}

export interface RentCapInput {
  property: {
    inseeCode: string | null;
    latitude: unknown;
    longitude: unknown;
    surfaceM2: unknown;
    type: string | null;
    mainRooms: number | null;
    constructionPeriod: string | null;
    rentCapZone: string | null;
  };
  bail: {
    rentAmount: number;
    bailType: string;
    effectiveDate: Date | string | null;
    rentSupplementReason: string | null;
  };
}

export type RentCapStatus =
  /** Commune hors encadrement (ou adresse non localisée) : rien à contrôler. */
  | "not_concerned"
  /** Commune encadrée dont le barème officiel n'est pas encore intégré : contrôle à la main. */
  | "no_data"
  /** Il manque une donnée pour calculer le plafond (pièces, époque, zone, surface, loyer). */
  | "missing"
  /** Loyer au plus égal au loyer de référence majoré. */
  | "ok"
  /** Loyer au-dessus : bloquant, sauf complément de loyer justifié. */
  | "over";

export interface RentCapAssessment {
  status: RentCapStatus;
  territory: {
    id: string;
    label: string;
    zoneMode: string;
    periods: string[];
    houseTypes: boolean;
    validFrom: string;
    validTo: string;
    sourceTitle: string;
    sourceUrl: string;
    simulatorUrl: string | null;
    mapUrl: string | null;
    zones: Array<{ code: string; label: string }>;
  } | null;
  /** Zone retenue, et comment : trouvée sur la carte ou choisie par l'équipe. */
  zone: { code: string; label: string; source: "map" | "manual"; area?: string } | null;
  missing: string[];
  furnished: boolean;
  surface: number | null;
  rent: number;
  rentPerM2: number | null;
  reference: { min: number; ref: number; max: number } | null;
  /** Loyer maximal hors charges (référence majorée × surface). */
  maxRent: number | null;
  /** Dépassement en euros par mois (positif si au-dessus). */
  overBy: number | null;
  /** La date de prise d'effet tombe après la fin de l'arrêté en vigueur. */
  outsideValidity: boolean;
  supplement: string | null;
}

const empty = (rent: number, furnished: boolean, surface: number | null): RentCapAssessment => ({
  status: "not_concerned",
  territory: null,
  zone: null,
  missing: [],
  furnished,
  surface,
  rent,
  rentPerM2: null,
  reference: null,
  maxRent: null,
  overBy: null,
  outsideValidity: false,
  supplement: null,
});

/** Contrôle du loyer d'un bail au regard de l'arrêté d'encadrement en vigueur. */
export async function assessRentCap({ property, bail }: RentCapInput): Promise<RentCapAssessment> {
  const furnished = isFurnishedBail(bail.bailType);
  const surface = property.surfaceM2 ? Number(property.surfaceM2) : null;
  const base = empty(bail.rentAmount, furnished, surface);
  if (!property.inseeCode) return base;

  const territory = await prisma.rentCapTerritory.findFirst({
    where: { inseeCodes: { hasSome: inseeCandidates(property.inseeCode) } },
    include: { zones: { orderBy: { code: "asc" } } },
  });
  if (!territory) return base;

  const result: RentCapAssessment = {
    ...base,
    status: "missing",
    supplement: bail.rentSupplementReason,
    territory: {
      id: territory.id,
      label: territory.label,
      zoneMode: territory.zoneMode,
      periods: territory.periods,
      houseTypes: territory.houseTypes,
      validFrom: territory.validFrom.toISOString(),
      validTo: territory.validTo.toISOString(),
      sourceTitle: territory.sourceTitle,
      sourceUrl: territory.sourceUrl,
      simulatorUrl: territory.simulatorUrl,
      mapUrl: territory.mapUrl,
      zones: territory.zones.map((z) => ({ code: z.code, label: z.label })),
    },
  };
  const effective = bail.effectiveDate ? new Date(bail.effectiveDate) : new Date();
  result.outsideValidity = effective > territory.validTo;
  if (territory.zoneMode === "pending") return { ...result, status: "no_data" };

  // Zone : choisie par l'équipe, sinon trouvée sur la carte à partir de l'adresse géolocalisée.
  const zoneLabel = (code: string) => territory.zones.find((z) => z.code === code)?.label || `Zone ${code}`;
  if (property.rentCapZone && territory.zones.some((z) => z.code === property.rentCapZone)) {
    result.zone = { code: property.rentCapZone, label: zoneLabel(property.rentCapZone), source: "manual" };
  } else if (territory.zoneMode === "polygon" && property.latitude != null && property.longitude != null) {
    const point: [number, number] = [Number(property.longitude), Number(property.latitude)];
    const areas = await prisma.rentCapArea.findMany({ where: { territoryId: territory.id } });
    const hit = areas.find((a) => inBbox(point, a.bbox) && pointInGeometry(point, a.geometry as unknown as CapGeometry));
    if (hit) result.zone = { code: hit.zoneCode, label: zoneLabel(hit.zoneCode), source: "map", area: hit.label };
  }

  const houseType = territory.houseTypes ? property.type : "ALL";
  if (!result.zone) result.missing.push("zone");
  if (!property.mainRooms) result.missing.push("pièces principales");
  if (!property.constructionPeriod || !territory.periods.includes(property.constructionPeriod)) result.missing.push("époque de construction");
  if (territory.houseTypes && houseType !== "APPARTEMENT" && houseType !== "MAISON") result.missing.push("type de logement (maison ou appartement)");
  if (!surface) result.missing.push("surface habitable");
  if (!bail.rentAmount) result.missing.push("loyer");
  if (result.missing.length) return result;

  const row = await prisma.rentCapReference.findUnique({
    where: {
      territoryId_zoneCode_houseType_rooms_period_furnished: {
        territoryId: territory.id,
        zoneCode: result.zone!.code,
        houseType: houseType as string,
        rooms: Math.min(4, property.mainRooms!),
        period: property.constructionPeriod!,
        furnished,
      },
    },
  });
  if (!row) {
    result.missing.push("catégorie absente de l'arrêté");
    return result;
  }
  result.reference = { min: Number(row.refMin), ref: Number(row.ref), max: Number(row.refMax) };
  result.rentPerM2 = toCents(bail.rentAmount / surface!);
  result.maxRent = toCents(result.reference.max * surface!);
  result.overBy = toCents(bail.rentAmount - result.maxRent);
  result.status = result.overBy > 0 ? "over" : "ok";
  return result;
}

const euros = (value: number) =>
  `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[\u00a0\u202f]/g, " ")} €`;
const perM2 = (value: number) => `${value.toFixed(2).replace(".", ",")} €/m²`;

/** Détail du dépassement (fenêtre de confirmation et e-mail au propriétaire), ou null si le loyer est conforme. */
export function rentCapOverLines(cap: RentCapAssessment): string[] | null {
  if (cap.status !== "over" || !cap.reference || cap.maxRent == null || cap.overBy == null || !cap.surface) return null;
  return [
    `Loyer indiqué : ${euros(cap.rent)} hors charges par mois, soit ${perM2(cap.rentPerM2 ?? 0)}`,
    `Loyer de référence majoré (${cap.territory?.label}, ${cap.zone?.label}) : ${perM2(cap.reference.max)}, soit ${euros(cap.maxRent)} au maximum pour ${cap.surface} m²`,
    `Dépassement : ${euros(cap.overBy)} par mois`,
  ];
}
