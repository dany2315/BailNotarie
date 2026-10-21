import { prisma } from "@/lib/prisma";
import {
  OUTSIDE_PERIMETER,
  distanceToBoundaryM,
  inBbox,
  isFurnishedBail,
  periodForTerritory,
  pointInGeometry,
  toCents,
  type CapGeometry,
} from "@/lib/utils/rent-cap";

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
    bailFamily?: string | null;
    effectiveDate: Date | string | null;
    rentSupplementReason: string | null;
    rentCapExemption?: string | null;
    rentCapExemptionNote?: string | null;
  };
}

export type RentCapStatus =
  /** Pas de plafond à respecter (raison dans notConcerned). */
  | "not_concerned"
  /** Commune encadrée dont le barème officiel n'est pas encore intégré : contrôle à la main. */
  | "no_data"
  /** Il manque une donnée pour calculer le plafond (pièces, époque, zone, surface, loyer), ou la zone est à confirmer. */
  | "missing"
  /** Loyer au plus égal au loyer de référence majoré. */
  | "ok"
  /** Loyer au-dessus : bloquant, sauf complément de loyer justifié. */
  | "over";

export type RentCapNotConcerned =
  /** Bail commercial : hors loi du 6 juillet 1989. */
  | "commercial"
  /** Adresse non localisée (pas de code INSEE). */
  | "no_address"
  /** Commune hors encadrement. */
  | "not_regulated"
  /** Logement exclu par l'équipe (logement social, conventionné, loi de 1948…). */
  | "exempt"
  /** Commune encadrée en partie, logement hors du périmètre. */
  | "outside_perimeter";

export interface RentCapAssessment {
  status: RentCapStatus;
  notConcerned: RentCapNotConcerned | null;
  territory: {
    id: string;
    label: string;
    zoneMode: string;
    periods: string[];
    houseTypes: boolean;
    validFrom: string;
    validTo: string;
    importedAt: string;
    sourceTitle: string;
    sourceUrl: string;
    simulatorUrl: string | null;
    mapUrl: string | null;
    zones: Array<{ code: string; label: string }>;
    /** La commune du bien n'est encadrée qu'en partie : « hors périmètre » est un choix possible. */
    partialCommune: boolean;
  } | null;
  /** Zone retenue, et comment : trouvée sur la carte, par la commune ou choisie par l'équipe. */
  zone: { code: string; label: string; source: "map" | "commune" | "manual"; area?: string } | null;
  /** Zone à confirmer : adresse trop proche d'une limite pour trancher sur la carte. */
  zoneHint: { code: string | null; label: string; distanceM: number; kind: "limit" | "perimeter" } | null;
  /** Hors périmètre : constaté sur la carte (distance au périmètre) ou choisi par l'équipe. */
  outside: { source: "map" | "manual"; distanceM?: number } | null;
  exemption: { code: string; note: string | null } | null;
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
  /** Prise d'effet du bail : avant l'arrêté intégré (le précédent s'applique), pendant, ou après sa fin. */
  validity: "before" | "in" | "after";
  supplement: string | null;
}

const empty = (rent: number, furnished: boolean, surface: number | null, notConcerned: RentCapNotConcerned | null): RentCapAssessment => ({
  status: "not_concerned",
  notConcerned,
  territory: null,
  zone: null,
  zoneHint: null,
  outside: null,
  exemption: null,
  missing: [],
  furnished,
  surface,
  rent,
  rentPerM2: null,
  reference: null,
  maxRent: null,
  overBy: null,
  validity: "in",
  supplement: null,
});

/** Contrôle du loyer d'un bail au regard de l'arrêté d'encadrement en vigueur. */
export async function assessRentCap({ property, bail }: RentCapInput): Promise<RentCapAssessment> {
  const furnished = isFurnishedBail(bail.bailType);
  const surface = property.surfaceM2 ? Number(property.surfaceM2) : null;
  if (bail.bailFamily === "COMMERCIAL") return empty(bail.rentAmount, furnished, surface, "commercial");
  if (!property.inseeCode) return empty(bail.rentAmount, furnished, surface, "no_address");

  const candidates = inseeCandidates(property.inseeCode);
  const territory = await prisma.rentCapTerritory.findFirst({
    where: { inseeCodes: { hasSome: candidates } },
    include: { zones: { orderBy: { code: "asc" } } },
  });
  if (!territory) return empty(bail.rentAmount, furnished, surface, "not_regulated");

  const partialCommune = candidates.some((code) => territory.partialInseeCodes.includes(code));
  const result: RentCapAssessment = {
    ...empty(bail.rentAmount, furnished, surface, null),
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
      importedAt: territory.importedAt.toISOString(),
      sourceTitle: territory.sourceTitle,
      sourceUrl: territory.sourceUrl,
      simulatorUrl: territory.simulatorUrl,
      mapUrl: territory.mapUrl,
      zones: territory.zones.map((z) => ({ code: z.code, label: z.label })),
      partialCommune,
    },
  };
  const effective = bail.effectiveDate ? new Date(bail.effectiveDate) : new Date();
  result.validity = effective < territory.validFrom ? "before" : effective > territory.validTo ? "after" : "in";

  if (bail.rentCapExemption) {
    return {
      ...result,
      status: "not_concerned",
      notConcerned: "exempt",
      exemption: { code: bail.rentCapExemption, note: bail.rentCapExemptionNote ?? null },
    };
  }
  if (territory.zoneMode === "pending") return { ...result, status: "no_data" };

  // Zone : choisie par l'équipe, sinon celle de la commune entière, sinon trouvée sur la carte.
  const zoneLabel = (code: string) => territory.zones.find((z) => z.code === code)?.label || `Zone ${code}`;
  const communeZones = (territory.communeZones ?? {}) as Record<string, string>;
  const communeZone = candidates.map((code) => communeZones[code]).find(Boolean);
  if (property.rentCapZone === OUTSIDE_PERIMETER && partialCommune) {
    return { ...result, status: "not_concerned", notConcerned: "outside_perimeter", outside: { source: "manual" } };
  }
  if (property.rentCapZone && territory.zones.some((z) => z.code === property.rentCapZone)) {
    result.zone = { code: property.rentCapZone, label: zoneLabel(property.rentCapZone), source: "manual" };
  } else if (communeZone) {
    result.zone = { code: communeZone, label: zoneLabel(communeZone), source: "commune" };
  } else if (territory.zoneMode === "polygon" && property.latitude != null && property.longitude != null) {
    const point: [number, number] = [Number(property.longitude), Number(property.latitude)];
    const areas = await prisma.rentCapArea.findMany({ where: { territoryId: territory.id } });
    const geometry = (area: (typeof areas)[number]) => area.geometry as unknown as CapGeometry;
    const hit = areas.find((a) => inBbox(point, a.bbox) && pointInGeometry(point, geometry(a)));
    if (hit) {
      // Contours relevés sur une carte : trop près d'une limite, la zone se confirme sur la carte officielle.
      const distance = territory.precisionM ? distanceToBoundaryM(point, geometry(hit)) : Infinity;
      if (territory.precisionM && distance < territory.precisionM) {
        result.zoneHint = { code: hit.zoneCode, label: zoneLabel(hit.zoneCode), distanceM: Math.round(distance), kind: "limit" };
      } else {
        result.zone = { code: hit.zoneCode, label: zoneLabel(hit.zoneCode), source: "map", area: hit.label };
      }
    } else if (partialCommune) {
      // Commune encadrée en partie : loin de tout contour, le logement est hors périmètre.
      const margin = 0.01; // ≈ 1 km : seuls les contours voisins comptent
      const nearest = areas
        .filter((a) => inBbox(point, [a.bbox[0] - margin, a.bbox[1] - margin, a.bbox[2] + margin, a.bbox[3] + margin]))
        .map((a) => ({ area: a, distance: distanceToBoundaryM(point, geometry(a)) }))
        .sort((a, b) => a.distance - b.distance)[0];
      // Contours exacts : la carte tranche. Contours relevés sur une carte (precisionM) : près du
      // périmètre, la zone se confirme (marge doublée, se tromper supprimerait un plafond).
      const tolerance = territory.precisionM ? territory.precisionM * 2 : 0;
      if (!nearest || nearest.distance >= tolerance) {
        return {
          ...result,
          status: "not_concerned",
          notConcerned: "outside_perimeter",
          outside: { source: "map", distanceM: nearest ? Math.round(nearest.distance) : undefined },
        };
      }
      result.zoneHint = {
        code: null,
        label: zoneLabel(nearest.area.zoneCode),
        distanceM: Math.round(nearest.distance),
        kind: "perimeter",
      };
    }
  }

  const houseType = territory.houseTypes ? property.type : "ALL";
  const period = periodForTerritory(property.constructionPeriod, territory.periods);
  if (result.zoneHint) {
    result.missing.push(
      result.zoneHint.kind === "limit"
        ? `zone à confirmer (adresse à ${result.zoneHint.distanceM} m d'une limite de zone)`
        : `zone à confirmer (adresse à ${result.zoneHint.distanceM} m de la limite du périmètre encadré)`,
    );
  } else if (!result.zone) {
    result.missing.push("zone");
  }
  if (!property.mainRooms) result.missing.push("pièces principales");
  if (!period) result.missing.push("époque de construction");
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
        period: period!,
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

/**
 * Bloque l'envoi au notaire : catégorie incomplète, ou dépassement sans complément justifié
 * (sauf bail hors de la période de l'arrêté intégré : l'équipe vérifie alors à la main).
 */
export function rentCapBlocking(cap: RentCapAssessment): boolean {
  return cap.status === "missing" || (cap.status === "over" && !cap.supplement && cap.validity === "in");
}

const euros = (value: number) =>
  `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, " ")} €`;
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

/** La zone en clair : trouvée, à confirmer ou hors périmètre, et comment. */
export function describeRentCapZone(cap: RentCapAssessment): string {
  if (cap.notConcerned === "outside_perimeter") {
    return cap.outside?.source === "manual"
      ? "hors du périmètre encadré (choisi par l'équipe)"
      : `hors du périmètre encadré${cap.outside?.distanceM != null ? ` (adresse à ${cap.outside.distanceM} m de sa limite)` : ""}`;
  }
  if (cap.zone) {
    const how =
      cap.zone.source === "manual"
        ? " (choisie par l'équipe)"
        : cap.zone.source === "commune"
          ? " (commune entière)"
          : cap.zone.area
            ? ` (${cap.zone.area})`
            : "";
    return `${cap.zone.label}${how}`;
  }
  if (cap.zoneHint) {
    return cap.zoneHint.kind === "limit"
      ? `zone à confirmer : probablement ${cap.zoneHint.label}, adresse à ${cap.zoneHint.distanceM} m d'une limite`
      : `à confirmer : adresse à ${cap.zoneHint.distanceM} m de la limite du périmètre encadré (${cap.zoneHint.label})`;
  }
  return "zone à déterminer";
}
