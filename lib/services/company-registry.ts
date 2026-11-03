// Module serveur interne (pas une action appelable depuis le navigateur).
//
// Recherche d'une société dans l'API Recherche d'entreprises (DINUM, gratuite, sans clé) :
// https://recherche-entreprises.api.gouv.fr/docs/ — 7 requêtes/s par IP, 429 + Retry-After au-delà.
// Les sociétés non diffusibles n'y figurent pas : « introuvable » ne veut pas dire « inexistante ».

import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  type CompanyLookupResult,
  type RegistryCompany,
  type RegistryRepresentative,
  legalFormLabel,
  normalizeRegistrationNumber,
  sirenFromRegistration,
  siretFromRegistration,
} from "@/lib/utils/company-registry";

const API_URL = "https://recherche-entreprises.api.gouv.fr/search";
const TIMEOUT_MS = 5000;
const HIDDEN = "[NON-DIFFUSIBLE]";

class RegistryUnavailableError extends Error {}
class RegistryNotFoundError extends Error {}

function visible(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed !== HIDDEN ? trimmed : null;
}

// Qualités qui engagent la société ; on écarte associés, administrateurs,
// commissaires aux comptes, conseil de surveillance et « Autre ».
const REPRESENTATIVE_ROLE = /pr[ée]sident|g[ée]rant|directeur g[ée]n[ée]ral/i;
const NON_REPRESENTATIVE_ROLE = /surveillance|commissaire/i;

function pickRepresentatives(dirigeants: any[]): RegistryRepresentative[] {
  return dirigeants
    .filter((d) => {
      const role = typeof d?.qualite === "string" ? d.qualite : "";
      return REPRESENTATIVE_ROLE.test(role) && !NON_REPRESENTATIVE_ROLE.test(role);
    })
    .map((d) => {
      const isCompany = d.type_dirigeant === "personne morale";
      const name = isCompany
        ? visible(d.denomination)
        : [visible(d.prenoms)?.split(" ")[0], visible(d.nom)].filter(Boolean).join(" ") || null;
      return name ? { name: titleCase(name, isCompany), role: d.qualite ?? null, isCompany } : null;
    })
    .filter((r): r is RegistryRepresentative => r !== null);
}

/** « SEBASTIEN CHOLLET (CHOLLET) » → « Sebastien Chollet » ; les dénominations restent telles quelles. */
function titleCase(name: string, keep: boolean): string {
  const cleaned = name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (keep) return cleaned;
  return cleaned.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
}

function toCompany(result: any): RegistryCompany {
  const siege = result.siege ?? {};
  const dirigeants: any[] = Array.isArray(result.dirigeants) ? result.dirigeants : [];
  const legalFormCode = visible(result.nature_juridique);
  return {
    siren: result.siren,
    siret: visible(siege.siret),
    legalName: visible(result.nom_raison_sociale) ?? visible(result.nom_complet) ?? "",
    tradeName: visible(siege.nom_commercial) ?? visible(result.sigle),
    legalFormCode,
    legalFormLabel: legalFormLabel(legalFormCode),
    nafCode: visible(result.activite_principale),
    headOfficeAddress: visible(siege.adresse),
    creationDate: visible(result.date_creation),
    isActive: result.etat_administratif === "A" && !result.date_fermeture,
    partialDiffusion: result.statut_diffusion === "P" || siege.statut_diffusion_etablissement === "P",
    isIndividual: legalFormCode === "1000" || result.complements?.est_entrepreneur_individuel === true,
    inLiquidation: dirigeants.some((d) => /liquidateur/i.test(d?.qualite ?? "")),
    representatives: pickRepresentatives(dirigeants),
  };
}

async function fetchCompany(siren: string): Promise<RegistryCompany> {
  const url = `${API_URL}?q=${siren}&minimal=true&include=siege,dirigeants,complements&per_page=1`;
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": "BailNotarie (contact@bailnotarie.fr)", Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new RegistryUnavailableError("Registre injoignable");
    }
    if (response.status === 429 && attempt === 0) {
      const retryAfter = Math.min(Number(response.headers.get("Retry-After")) || 1, 3);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    if (!response.ok) throw new RegistryUnavailableError(`Registre : HTTP ${response.status}`);
    const data = await response.json();
    // Un numéro inconnu peut renvoyer un résultat vide (sans nom ni siège) : c'est un « introuvable »
    const result = (data?.results ?? []).find((r: any) => r?.siren === siren);
    if (!result || (!result.nom_raison_sociale && !result.nom_complet)) {
      throw new RegistryNotFoundError(siren);
    }
    return toCompany(result);
  }
  throw new RegistryUnavailableError("Registre saturé");
}

// Seules les sociétés trouvées sont gardées en cache (24 h, le RNE est mis à jour chaque jour) :
// une erreur n'est pas mise en cache, une société en cours d'immatriculation sera retrouvée dès sa parution.
const cachedFetchCompany = unstable_cache(fetchCompany, ["company-registry"], { revalidate: 86400 });

/** Recherche une société par SIREN ou SIRET (le SIRET ramène à sa société). */
export async function lookupCompany(registration: string): Promise<CompanyLookupResult> {
  const siren = sirenFromRegistration(registration);
  if (!siren) return { found: false, reason: "invalid" };
  try {
    return { found: true, company: await cachedFetchCompany(siren) };
  } catch (error) {
    if (error instanceof RegistryNotFoundError) return { found: false, reason: "not_found" };
    console.error("[company-registry] recherche impossible", siren, error);
    return { found: false, reason: "unavailable" };
  }
}

/**
 * Colonnes « registre » de l'Entreprise à écrire lors d'une sauvegarde d'intake.
 * Le navigateur n'envoie que le numéro et la confirmation : les données du registre
 * sont relues ici, jamais reprises telles que le client les transmet.
 * Retourne {} quand il n'y a rien à changer (ex. registre indisponible).
 */
export async function entrepriseRegistryFields(entreprise: any): Promise<Prisma.EntrepriseUpdateInput> {
  if (!entreprise || typeof entreprise !== "object" || entreprise.registration === undefined) return {};
  const confirmed = entreprise.registryConfirmed === true || entreprise.registryConfirmed === "true";
  const siren = sirenFromRegistration(entreprise.registration);
  const siret = siretFromRegistration(entreprise.registration);

  if (confirmed && siren) {
    const result = await lookupCompany(siren);
    if (!result.found) return {};
    const company = result.company;
    return {
      siren: company.siren,
      siret: siret ?? company.siret,
      legalFormCode: company.legalFormCode,
      legalFormLabel: company.legalFormLabel,
      nafCode: company.nafCode,
      registryStatus: company.partialDiffusion ? "P" : company.isActive ? "A" : "C",
      registrySource: "RECHERCHE_ENTREPRISES",
      registryCheckedAt: new Date(),
      registryConfirmedByClient: true,
      // Instantané réduit (sans date de naissance) : preuve de la vérification et base de comparaison
      registrySnapshot: company as unknown as Prisma.InputJsonValue,
    };
  }

  // Saisie manuelle (société introuvable, pas encore immatriculée, numéro modifié) :
  // on efface une éventuelle vérification précédente qui ne correspondrait plus.
  return {
    siren,
    siret,
    legalFormCode: null,
    legalFormLabel: null,
    nafCode: null,
    registryStatus: null,
    registrySource: normalizeRegistrationNumber(entreprise.registration) ? "MANUAL" : null,
    registryCheckedAt: null,
    registryConfirmedByClient: false,
    registrySnapshot: Prisma.DbNull,
  };
}
