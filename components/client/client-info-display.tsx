"use client";

import { useState } from "react";
import {
  Mail, Phone, MapPin, Calendar, Globe, Briefcase,
  Building2, Hash, Heart, FileText, ChevronRight, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { ClientType } from "@prisma/client";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";

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

interface Person {
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
  documents: Array<{
    id: string; kind: string; fileKey: string;
    mimeType: string | null; label: string | null; createdAt: Date | string;
  }>;
}

interface Entreprise {
  id: string;
  legalName: string | null;
  name: string | null;
  registration: string | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  documents: Array<{
    id: string; kind: string; fileKey: string;
    mimeType: string | null; label: string | null; createdAt: Date | string;
  }>;
}

interface ClientInfoDisplayProps {
  clientType: ClientType;
  persons?: Person[];
  entreprise?: Entreprise | null;
  clientDocuments?: Array<{
    id: string; kind: string; fileKey: string;
    mimeType: string | null; label: string | null; createdAt: Date | string;
  }>;
}

// ── Tuile de champ ────────────────────────────────────────────────────────────

function Field({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  if (!value) return null;
  return (
    <div className={cn(wide && "col-span-2")}>
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground/60">{title}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {children}
      </div>
    </div>
  );
}

// compat shims pour les anciens appels via spread {...item}
function InfoItem({ label, value }: { icon?: React.ElementType; iconBg?: string; label: string; value: string; last?: boolean }) {
  return <Field label={label} value={value} />;
}
function InfoGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-5">{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-muted-foreground/60">{children}</p>;
}

// ── Panneau personne ──────────────────────────────────────────────────────────

function PersonPanel({
  person,
  clientDocuments = [],
}: {
  person: Person;
  clientDocuments?: ClientInfoDisplayProps["clientDocuments"];
}) {
  const allDocs = [...(person.documents || []), ...(clientDocuments || [])];
  const hasInfo = person.firstName || person.lastName || person.email || person.phone
    || person.profession || person.nationality || person.birthDate || person.birthPlace
    || person.familyStatus || person.matrimonialRegime || person.fullAddress;

  if (!hasInfo && !allDocs.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Aucune information renseignée</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasInfo && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          <Field label="Prénom" value={person.firstName} />
          <Field label="Nom" value={person.lastName} />
          <Field label="Profession" value={person.profession} />
          <Field label="Nationalité" value={person.nationality} />
          <Field label="Date de naissance" value={person.birthDate ? formatDate(person.birthDate) : null} />
          <Field label="Lieu de naissance" value={person.birthPlace} />
          <Field label="Situation familiale" value={person.familyStatus ? (FAMILY_STATUS_LABELS[person.familyStatus] || person.familyStatus) : null} />
          <Field label="Régime matrimonial" value={person.matrimonialRegime ? (REGIME_LABELS[person.matrimonialRegime] || person.matrimonialRegime) : null} />
          <Field label="Email" value={person.email} />
          <Field label="Téléphone" value={person.phone} />
          <Field label="Adresse" value={person.fullAddress} wide />
        </div>
      )}

      {allDocs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground/60">Documents · {allDocs.length}</p>
          <div className="space-y-2">
            {allDocs.map((doc) => (
              <BailDocumentPreview
                key={doc.id}
                document={{ id: doc.id, label: doc.label, kind: doc.kind, fileKey: doc.fileKey, mimeType: doc.mimeType, createdAt: doc.createdAt }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export principal ──────────────────────────────────────────────────────────

export function ClientInfoDisplay({
  clientType,
  persons = [],
  entreprise,
  clientDocuments = [],
}: ClientInfoDisplayProps) {
  const [activePersonId, setActivePersonId] = useState<string>(persons[0]?.id || "");

  // Personne physique
  if (clientType === ClientType.PERSONNE_PHYSIQUE) {
    if (persons.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aucune information disponible</p>
        </div>
      );
    }

    if (persons.length === 1) {
      return <PersonPanel person={persons[0]} clientDocuments={clientDocuments} />;
    }

    const activePerson = persons.find((p) => p.id === activePersonId) || persons[0];
    return (
      <div className="space-y-5">
        {/* Sélecteur pills */}
        <div className="flex gap-2 flex-wrap">
          {persons.map((person, i) => {
            const label = `${person.firstName || ""}${person.lastName ? " " + person.lastName : ""}`.trim()
              || (person.isPrimary ? "Personne principale" : `Personne ${i + 1}`);
            const isActive = person.id === activePersonId;
            return (
              <button
                key={person.id}
                onClick={() => setActivePersonId(person.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <PersonPanel person={activePerson} clientDocuments={clientDocuments} />
      </div>
    );
  }

  // Personne morale
  if (!entreprise) return null;

  const allDocs = [...(entreprise.documents || []), ...clientDocuments];

  const identity = [
    entreprise.legalName && { icon: Building2, label: "Raison sociale", value: entreprise.legalName },
    entreprise.name && { icon: Building2, label: "Nom commercial", value: entreprise.name },
    entreprise.registration && { icon: Hash, label: "SIREN / SIRET", value: entreprise.registration },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  const contact = [
    entreprise.email && { icon: Mail, label: "Email", value: entreprise.email },
    entreprise.phone && { icon: Phone, label: "Téléphone", value: entreprise.phone },
    entreprise.fullAddress && { icon: MapPin, label: "Adresse", value: entreprise.fullAddress },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        <Field label="Raison sociale" value={entreprise.legalName} />
        <Field label="Nom commercial" value={entreprise.name} />
        <Field label="SIREN / SIRET" value={entreprise.registration} />
        <Field label="Email" value={entreprise.email} />
        <Field label="Téléphone" value={entreprise.phone} />
        <Field label="Adresse" value={entreprise.fullAddress} wide />
      </div>

      {allDocs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground/60">Documents · {allDocs.length}</p>
          <div className="space-y-2">
            {allDocs.map((doc) => (
              <BailDocumentPreview
                key={doc.id}
                document={{ id: doc.id, label: doc.label, kind: doc.kind, fileKey: doc.fileKey, mimeType: doc.mimeType, createdAt: doc.createdAt }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
