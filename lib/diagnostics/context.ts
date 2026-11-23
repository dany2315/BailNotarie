import type { AssessContext } from "./assess";

/** Contexte des règles à partir du bien (fiche dossier et envoi au propriétaire : mêmes données). */
export function assessContextFor(
  property: {
    fullAddress?: string | null;
    postalCode?: string | null;
    housenumber?: string | null;
    surfaceM2?: unknown;
    dpeClass?: string | null;
    gesClass?: string | null;
    dpeDate?: Date | null;
    constructionPeriod?: string | null;
  } | null,
  commercial: boolean,
): AssessContext {
  return {
    commercial,
    property: property
      ? {
          fullAddress: property.fullAddress,
          postalCode: property.postalCode,
          housenumber: property.housenumber,
          surfaceM2: property.surfaceM2 != null ? Number(property.surfaceM2) : null,
          dpeClass: property.dpeClass,
          gesClass: property.gesClass,
          dpeDate: property.dpeDate,
          constructionPeriod: property.constructionPeriod,
        }
      : null,
  };
}
