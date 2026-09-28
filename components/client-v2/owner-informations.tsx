"use client";

import * as React from "react";
import { Building2, FileText, Home, KeyRound, Mail, MapPin, Phone, ShieldCheck, UserRound, Users } from "lucide-react";
import { ClientType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";
import {
  EmptyState,
  FieldGrid,
  IconTile,
  MicroLabel,
  OwnerCanvas,
  Pill,
  ReadField,
  Surface,
} from "./owner-ui";

/* =========================================================================
   « Mes informations » — refonte.

   L'ancienne page affichait onze champs dans une seule grille à deux colonnes,
   suivis des documents : tout au même niveau, donc rien de repérable. Ici les
   mêmes champs (aucun ajout, aucune suppression) sont rangés par nature —
   identité, situation, coordonnées, documents — chacun dans sa surface, avec
   un en-tête d'identité qui résume qui est le titulaire du compte.

   Les champs vides restent masqués, comme avant. Le sélecteur de personne
   n'apparaît qu'à partir de deux personnes.
   ========================================================================= */

const FAMILY_STATUS_LABELS: Record<string, string> = {
  CELIBATAIRE: "Célibataire",
  MARIE: "Marié(e)",
  DIVORCE: "Divorcé(e)",
  VEUF: "Veuf/Veuve",
  PACS: "Pacsé(e)",
};

const REGIME_LABELS: Record<string, string> = {
  COMMUNAUTE_REDUITE: "Communauté réduite aux acquêts",
  SEPARATION_DE_BIENS: "Séparation de biens",
  PARTICIPATION_AUX_AQUETS: "Participation aux acquêts",
  COMMUNAUTE_UNIVERSELLE: "Communauté universelle",
};

type Doc = {
  id: string;
  kind: string;
  fileKey: string;
  mimeType: string | null;
  label: string | null;
  createdAt: Date | string;
};

export interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profession: string | null;
  familyStatus: string | null;
  matrimonialRegime: string | null;
  birthPlace: string | null;
  birthDate: Date | string | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  nationality: string | null;
  isPrimary: boolean;
  documents: Doc[];
}

export interface Entreprise {
  id: string;
  legalName: string | null;
  name: string | null;
  registration: string | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  documents: Doc[];
}

export interface OwnerInformationsProps {
  clientType: ClientType | string;
  persons?: Person[];
  entreprise?: Entreprise | null;
  clientDocuments?: Doc[];
  /** Le profil du titulaire : change la pastille, et rien d'autre. */
  profil?: "proprietaire" | "locataire";
}

const PROFIL_VIEW = {
  proprietaire: { label: "Propriétaire", icon: Home },
  locataire: { label: "Locataire", icon: KeyRound },
} as const;

/* ---------- Blocs ---------------------------------------------------------- */

function Block({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Surface tone="raised" className={cn("p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <IconTile icon={icon} tone="blue" size="sm" />
        <MicroLabel>{title}</MicroLabel>
      </div>
      {children}
    </Surface>
  );
}

/** Les documents : on garde le composant existant (URL signée, aperçu,
    téléchargement) et on le reteinte pour qu'il se fonde dans la liste. */
function DocumentList({ docs }: { docs: Doc[] }) {
  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="[&>div]:rounded-xl [&>div]:border-slate-200/80 [&>div]:bg-white [&>div]:px-3 [&>div]:py-2.5 [&>div]:transition-colors [&>div:hover]:bg-slate-50"
        >
          <BailDocumentPreview
            document={{
              id: doc.id,
              label: doc.label,
              kind: doc.kind,
              fileKey: doc.fileKey,
              mimeType: doc.mimeType,
              createdAt: doc.createdAt,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function PersonBlocks({ person, docs }: { person: Person; docs: Doc[] }) {
  const hasIdentity =
    person.firstName || person.lastName || person.profession || person.nationality || person.birthDate || person.birthPlace;
  const hasSituation = person.familyStatus || person.matrimonialRegime;
  const hasContact = person.email || person.phone || person.fullAddress;

  if (!hasIdentity && !hasSituation && !hasContact && docs.length === 0) {
    return (
      <Surface tone="quiet">
        <EmptyState
          icon={Users}
          title="Aucune information renseignée"
          description="Les informations transmises lors de la constitution d'un dossier apparaîtront ici."
        />
      </Surface>
    );
  }

  return (
    <>
      {hasIdentity && (
        <Block icon={UserRound} title="Identité">
          <FieldGrid>
            <ReadField label="Prénom" value={person.firstName} />
            <ReadField label="Nom" value={person.lastName} />
            <ReadField label="Profession" value={person.profession} />
            <ReadField label="Nationalité" value={person.nationality} />
            <ReadField label="Date de naissance" value={person.birthDate ? formatDate(person.birthDate) : null} />
            <ReadField label="Lieu de naissance" value={person.birthPlace} />
          </FieldGrid>
        </Block>
      )}

      {hasSituation && (
        <Block icon={ShieldCheck} title="Situation familiale">
          <FieldGrid>
            <ReadField
              label="Situation"
              value={
                person.familyStatus
                  ? FAMILY_STATUS_LABELS[person.familyStatus] || person.familyStatus
                  : null
              }
            />
            <ReadField
              label="Régime matrimonial"
              value={
                person.matrimonialRegime
                  ? REGIME_LABELS[person.matrimonialRegime] || person.matrimonialRegime
                  : null
              }
            />
          </FieldGrid>
        </Block>
      )}

      {hasContact && (
        <Block icon={Mail} title="Coordonnées">
          <FieldGrid>
            <ReadField label="Email" value={person.email} />
            <ReadField label="Téléphone" value={person.phone} />
            <ReadField label="Adresse" value={person.fullAddress} wide />
          </FieldGrid>
        </Block>
      )}

      {docs.length > 0 && (
        <Block icon={FileText} title={`Documents · ${docs.length}`}>
          <DocumentList docs={docs} />
        </Block>
      )}
    </>
  );
}

/* ---------- Page ---------------------------------------------------------- */

export function OwnerInformations({
  clientType,
  persons = [],
  entreprise,
  clientDocuments = [],
  profil = "proprietaire",
}: OwnerInformationsProps) {
  const profilView = PROFIL_VIEW[profil];
  const isEntreprise = clientType === ClientType.PERSONNE_MORALE || clientType === "PERSONNE_MORALE";
  const [activePersonId, setActivePersonId] = React.useState<string>(persons[0]?.id || "");
  const activePerson = persons.find((person) => person.id === activePersonId) || persons[0];

  const displayName = isEntreprise
    ? entreprise?.legalName || entreprise?.name || "Entreprise"
    : activePerson
      ? `${activePerson.firstName || ""} ${activePerson.lastName || ""}`.trim() ||
        activePerson.email ||
        "Propriétaire"
      : "Propriétaire";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const subtitle = isEntreprise
    ? entreprise?.registration || entreprise?.email || "Personne morale"
    : activePerson?.email || activePerson?.phone || "Personne physique";

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:pb-14">
        {/* ── Identité du titulaire ───────────────────────────────────────── */}
        <header className="mb-6">
          <MicroLabel>Espace {profilView.label.toLowerCase()}</MicroLabel>
          <div className="mt-2.5 flex items-center gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-[17px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(53,99,233,0.8)]">
              {isEntreprise ? <Building2 className="h-6 w-6" /> : initials || <UserRound className="h-6 w-6" />}
            </span>
            <div className="min-w-0">
              <h1 className="lp-title truncate text-[24px] font-bold text-slate-900 sm:text-[28px]">
                {displayName}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Pill tone="blue" icon={profilView.icon}>
                  {profilView.label}
                </Pill>
                <span className="truncate text-[12.5px] text-slate-500">{subtitle}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {isEntreprise ? (
            entreprise ? (
              <>
                <Block icon={Building2} title="La société">
                  <FieldGrid>
                    <ReadField label="Raison sociale" value={entreprise.legalName} />
                    <ReadField label="Nom commercial" value={entreprise.name} />
                    <ReadField label="SIREN / SIRET" value={entreprise.registration} />
                  </FieldGrid>
                </Block>

                {(entreprise.email || entreprise.phone || entreprise.fullAddress) && (
                  <Block icon={Phone} title="Coordonnées">
                    <FieldGrid>
                      <ReadField label="Email" value={entreprise.email} />
                      <ReadField label="Téléphone" value={entreprise.phone} />
                      <ReadField label="Adresse" value={entreprise.fullAddress} wide />
                    </FieldGrid>
                  </Block>
                )}

                {[...(entreprise.documents || []), ...clientDocuments].length > 0 && (
                  <Block
                    icon={FileText}
                    title={`Documents · ${[...(entreprise.documents || []), ...clientDocuments].length}`}
                  >
                    <DocumentList docs={[...(entreprise.documents || []), ...clientDocuments]} />
                  </Block>
                )}
              </>
            ) : (
              <Surface tone="quiet">
                <EmptyState icon={Building2} title="Aucune information disponible" />
              </Surface>
            )
          ) : persons.length === 0 ? (
            <Surface tone="quiet">
              <EmptyState
                icon={Users}
                title="Aucune information disponible"
                description="Les informations transmises lors de la constitution d'un dossier apparaîtront ici."
              />
            </Surface>
          ) : (
            <>
              {/* Sélecteur de personne — seulement s'il y en a plusieurs */}
              {persons.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {persons.map((person, index) => {
                    const label =
                      `${person.firstName || ""}${person.lastName ? ` ${person.lastName}` : ""}`.trim() ||
                      (person.isPrimary ? "Personne principale" : `Personne ${index + 1}`);
                    const isActive = person.id === activePersonId;
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setActivePersonId(person.id)}
                        className={cn(
                          "shrink-0 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                          isActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {activePerson && (
                <PersonBlocks
                  person={activePerson}
                  docs={[...(activePerson.documents || []), ...clientDocuments]}
                />
              )}
            </>
          )}

          {/* Ces informations sont en lecture seule : on le dit, plutôt que de
              laisser chercher un bouton « modifier » qui n'existe pas. */}
          <div className="flex items-start gap-2.5 px-1 pt-1">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
            <p className="text-[12px] leading-snug text-slate-400">
              Informations transmises lors de la constitution de vos dossiers. Une correction à
              apporter ?{" "}
              <a href="mailto:contact@bailnotarie.fr" className="font-semibold text-[#3563e9] hover:underline">
                Écrivez-nous
              </a>
              , on s&apos;en occupe.
            </p>
          </div>
        </div>
      </div>
    </OwnerCanvas>
  );
}
