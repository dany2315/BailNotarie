"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type KeyboardEvent,
} from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NumberInputGroup } from "@/components/ui/number-input-group";
import { Stepper } from "@/components/ui/stepper";
import { FileUpload } from "@/components/ui/file-upload";
import { DocumentUploaded } from "./document-uploaded";
import { PhoneInput } from "@/components/ui/phone-input";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { DatePicker, formatDateToLocalString } from "@/components/ui/date-picker";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Loader2,
  InfoIcon,
  Building2,
  Building,
  User2,
  Delete,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  BailFamille,
  BailType,
  BienLegalStatus,
  BienType,
  ClientType,
  DocumentKind,
  FamilyStatus,
  MatrimonialRegime,
  ProfilType,
  PropertyStatus,
} from "@prisma/client";
import useIsMobile from "@/hooks/useIsMobile";
import { ownerFormSchema } from "@/lib/zod/client";
import {
  submitIntake,
  savePartialIntake,
  getIntakeLinkByToken,
  deletePersonFromClient,
} from "@/lib/actions/intakes";
import { Separator } from "../ui/separator";

type OwnerFormData = z.infer<typeof ownerFormSchema>;

const STEPS = [
  { id: "clientType", title: "Type de client" },
  { id: "clientInfo", title: "Informations client" },
  { id: "summary", title: "Récapitulatif" },
  { id: "property", title: "Données du bien" },
  { id: "bail", title: "Données du bail" },
  { id: "tenant", title: "Locataire" },
  { id: "documents", title: "Documents" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type IntakeLink = {
  token: string;
  clientId: string;
  client: any;
  property: any;
  bail: any;
};

type PersonForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fullAddress: string;
  profession: string;
  nationality: string;
  familyStatus?: FamilyStatus;
  matrimonialRegime?: MatrimonialRegime;
  birthPlace: string;
  birthDate: Date | undefined;
  documents: RawDocumentMeta[];
};

type EntrepriseForm = {
  legalName: string;
  registration: string;
  name: string;
  email: string;
  phone: string;
  fullAddress: string;
  documents: RawDocumentMeta[];
};

type RawDocumentMeta = {
  kind: DocumentKind;        // "BIRTH_CERT" | "KBIS" | ...
  fileKey: string;     // clé blob
  fileName: string;
  mimeType: string;
  size: number;
  label?: string;
};

type FormWithPersons = OwnerFormData & { 
  persons: PersonForm[];
  entreprise?: EntrepriseForm;

  clientDocuments?: RawDocumentMeta[];   // ex: LIVRET_DE_FAMILLE, PACS…
  propertyDocuments?: RawDocumentMeta[]; // DIAGNOSTICS, TITLE_DEED…
  bailDocuments?: RawDocumentMeta[];     // INSURANCE, R
};

const formSchema = ownerFormSchema;

const EMPTY_STRING_DATE = "";

const toDateValue = (value?: string | Date | null) => {
  if (!value) return undefined;
  if (typeof value === "string") {
    return value.includes("T") ? value.split("T")[0] : value;
  }
  return value.toISOString().split("T")[0];
};


const emptyPerson: PersonForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  fullAddress: "",
  profession: "",
  nationality: "",
  familyStatus: undefined,
  matrimonialRegime: undefined,
  birthPlace: "",
  birthDate: undefined,
  documents: [],
};

const buildDefaultValues = (intakeLink: IntakeLink): FormWithPersons => {
  const client = intakeLink.client;
  const property = intakeLink.property;
  const bail = intakeLink.bail;

  const mapToPersonForm = (p: any): PersonForm => ({
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    email: p.email || "",
    phone: p.phone || "",
    fullAddress: p.fullAddress || "",
    profession: p.profession || "",
    nationality: p.nationality || "",
    familyStatus: p.familyStatus || undefined,
    matrimonialRegime: p.matrimonialRegime || undefined,
    birthPlace: p.birthPlace || "",
    birthDate: p.birthDate
      ? p.birthDate instanceof Date
        ? p.birthDate
        : new Date(p.birthDate)
      : undefined,
    documents: (p.documents || []).map((doc: any) => ({
      kind: doc.kind,
      fileKey: doc.fileKey,
      fileName: doc.label || doc.fileKey,
      mimeType: doc.mimeType || "",
      size: doc.size || 0,
      label: doc.label,
    })),
  });

  const clientType: ClientType | "" =
    (client?.type as ClientType | "") || "";

  const primaryPerson = client?.persons?.[0];
  const entreprise = client?.entreprise;

  // Mail / téléphone "racine" : depuis la base de données
  const rootEmail =
    (entreprise?.email as string | undefined) ??
    (primaryPerson?.email as string | undefined) ??
    (client?.email as string | undefined) ??
    "";

  const rootPhone =
    (entreprise?.phone as string | undefined) ??
    (primaryPerson?.phone as string | undefined) ??
    (client?.phone as string | undefined) ??
    "";

  // Locataire éventuel
  const tenantParty = bail?.parties?.find(
    (party: any) => party.profilType === ProfilType.LOCATAIRE
  );
  const tenantEmail =
    tenantParty?.persons?.find((p: any) => p.isPrimary)?.email ||
    tenantParty?.persons?.[0]?.email ||
    "";

  // Bien
  const propertyLabel = property?.label ?? "";
  const propertyFullAddress = property?.fullAddress ?? "";
  const propertySurfaceM2 = property?.surfaceM2?.toString() ?? "";
  const propertyType = property?.type ?? undefined;
  const propertyLegalStatus = property?.legalStatus ?? undefined;
  const propertyStatus = property?.status ?? PropertyStatus.NON_LOUER;

  // Bail
  const bailFamily = bail?.bailFamily ?? BailFamille.HABITATION;
  const bailType = bail?.bailType ?? BailType.BAIL_NU_3_ANS;
  const bailRentAmount = bail?.rentAmount?.toString() ?? "";
  const bailMonthlyCharges = bail?.monthlyCharges?.toString() ?? "";
  const bailSecurityDeposit = bail?.securityDeposit?.toString() ?? "";
  const bailPaymentDay = bail?.paymentDay?.toString() ?? "";

  const bailEffectiveDate =
    (bail?.effectiveDate
      ? toDateValue(bail.effectiveDate)
      : EMPTY_STRING_DATE) as any;

  const bailEndDate = (bail?.endDate ? toDateValue(bail.endDate) : undefined) as any;

  const clientDocuments = (client?.documents || []).map((doc: any) => ({
    kind: doc.kind,
    fileKey: doc.fileKey,
    fileName: doc.label || doc.fileKey,
    mimeType: doc.mimeType || "",
    size: doc.size || 0,
    label: doc.label,
  }));
  const propertyDocuments = (property?.documents || []).map((doc: any) => ({
    kind: doc.kind,
    fileKey: doc.fileKey,
    fileName: doc.label || doc.fileKey,
    mimeType: doc.mimeType || "",
    size: doc.size || 0,
    label: doc.label,
  }));
  const bailDocuments = (bail?.documents || []).map((doc: any) => ({
    kind: doc.kind,
    fileKey: doc.fileKey,
    fileName: doc.label || doc.fileKey,
    mimeType: doc.mimeType || "",
    size: doc.size || 0,
    label: doc.label,
  }));

  // ---------- 1) CAS ENTREPRISE (PERSONNE_MORALE) ----------
  if (clientType === ClientType.PERSONNE_MORALE && entreprise) {
    const entrepriseForm: EntrepriseForm = {
      legalName: entreprise.legalName ?? "",
      registration: entreprise.registration ?? "",
      name: entreprise.name ?? entreprise.legalName ?? "",
      email: rootEmail,
      phone: rootPhone,
      fullAddress: entreprise.fullAddress ?? "",
      documents: (entreprise.documents || []).map((doc: any) => ({
        kind: doc.kind,
        fileKey: doc.fileKey,
        fileName: doc.label || doc.fileKey,
        mimeType: doc.mimeType || "",
        size: doc.size || 0,
        label: doc.label,
      })),
    };

    return {
      clientId: intakeLink.clientId,
      type: clientType,
      email: rootEmail,
      phone: rootPhone,
      persons: [],
      entreprise: entrepriseForm,
      // Bien
      propertyLabel,
      propertyFullAddress,
      propertySurfaceM2,
      propertyType,
      propertyLegalStatus,
      propertyStatus,
      // Bail
      bailType,
      bailFamily,
      bailRentAmount,
      bailEffectiveDate,
      bailEndDate,
      bailMonthlyCharges,
      bailSecurityDeposit,
      bailPaymentDay,
      // Documents
      clientDocuments,
      propertyDocuments,
      bailDocuments,
      // Locataire
      tenantEmail,
    } as FormWithPersons;
  }

  // ---------- 2) CAS PERSONNE_PHYSIQUE ou type vide ----------
  const allPersons = client?.persons || [];
  const persons = allPersons.length > 0
    ? allPersons.map(mapToPersonForm)
    : [{ ...emptyPerson, email: rootEmail, phone: rootPhone }];

  // Forcer la personne principale à suivre le mail / téléphone racine
  if (persons.length > 0) {
    persons[0] = {
      ...persons[0],
      email: rootEmail,
      phone: rootPhone,
    };
  }

  return {
    clientId: intakeLink.clientId,
    type: (clientType || ClientType.PERSONNE_PHYSIQUE) as ClientType,
    email: rootEmail,
    phone: rootPhone,
    persons: persons as any,
    entreprise: undefined,
      // Bien
      propertyLabel,
      propertyFullAddress,
      propertySurfaceM2,
      propertyType,
      propertyLegalStatus,
      propertyStatus,
      // Bail
      bailType,
      bailFamily,
      bailRentAmount,
      bailEffectiveDate,
      bailEndDate,
      bailMonthlyCharges,
      bailSecurityDeposit,
      bailPaymentDay,
      // Documents
      clientDocuments,
      propertyDocuments,
      bailDocuments,
      // Locataire
      tenantEmail,
    } as FormWithPersons;
};




const getRequiredFields = (
  stepId: StepId,
  clientType: ClientType | ""
): (keyof FormWithPersons)[] => {
  switch (stepId) {
    case "clientType":
      return ["type"];
    case "clientInfo":
      if (clientType === ClientType.PERSONNE_PHYSIQUE) {
        return [
          "persons",
        ];
      }
      return [
        "entreprise",
      ];
    case "property":
      return [
        "propertyFullAddress",
        "propertySurfaceM2",
        "propertyType",
        "propertyLegalStatus",
      ];
    case "bail":
      return [
        "bailType",
        "bailRentAmount",
        "bailEffectiveDate",
        "bailMonthlyCharges",
        "bailSecurityDeposit",
        "bailPaymentDay",
      ];
    case "tenant":
      return ["tenantEmail"];
    case "documents":
      return [];
    default:
      return [];
  }
};

const findFirstIncompleteStep = (
  values: FormWithPersons,
  intakeLink: IntakeLink,
  clientType: ClientType | ""
) => {
  const isEmpty = (val: any) =>
    val === undefined ||
    val === null ||
    val === "" ||
    (typeof val === "string" && val.trim() === "");

  // Vérifier si le formulaire a réellement été commencé par l'utilisateur
  // (pas seulement prérempli lors de la création)
  const hasStarted = intakeLink.client && (
    (intakeLink.client.persons && intakeLink.client.persons.length > 0 && 
     (intakeLink.client.persons[0].firstName || intakeLink.client.persons[0].lastName)) ||
    (intakeLink.client.entreprise && intakeLink.client.entreprise.legalName) ||
    intakeLink.property ||
    intakeLink.bail
  );
  
  // Toujours permettre à l'utilisateur de voir et modifier le type de client
  // si le formulaire n'a pas encore été vraiment commencé par l'utilisateur
  // (même si le type est prérempli lors de la création)
  if (isEmpty(values.type) || !hasStarted) {
    return 0;
  }

  // Vérification complète du step 1 (Informations client)
  if (clientType === ClientType.PERSONNE_PHYSIQUE) {
    // Vérifier que persons existe et n'est pas vide
    if (isEmpty(values.persons) || !Array.isArray(values.persons) || values.persons.length === 0) {
      return 1;
    }

    // Vérifier toutes les personnes (personne principale + autres)
    for (let i = 0; i < values.persons.length; i++) {
      const person = values.persons[i];
      if (!person) {
        return 1;
      }

      // Vérifier tous les champs requis pour chaque personne
      if (
        isEmpty(person.firstName) ||
        isEmpty(person.lastName) ||
        isEmpty(person.profession) ||
        isEmpty(person.phone) ||
        isEmpty(person.email) ||
        isEmpty(person.fullAddress) ||
        isEmpty(person.nationality) ||
        isEmpty(person.familyStatus) ||
        isEmpty(person.birthPlace) ||
        isEmpty(person.birthDate)
      ) {
        return 1;
      }

      // Vérifier le régime matrimonial si marié
      if (person.familyStatus === FamilyStatus.MARIE && isEmpty(person.matrimonialRegime)) {
        return 1;
      }
    }

    // Vérifier aussi email et phone au niveau racine (pour compatibilité)
    if (isEmpty(values.email)) {
      return 1;
    }
    // Le téléphone peut être au niveau racine ou dans la personne principale
    const hasPhoneAtRoot = !isEmpty(values.phone);
    const primaryPerson = values.persons.find((p: any) => p.isPrimary) || values.persons[0];
    const hasPhoneInPerson = primaryPerson && !isEmpty(primaryPerson.phone);
    if (!hasPhoneAtRoot && !hasPhoneInPerson) {
      return 1;
    }
  } else if (clientType === ClientType.PERSONNE_MORALE) {
    // Vérifier que entreprise existe
    if (!values.entreprise) {
      return 1;
    }

    // Vérifier tous les champs requis pour l'entreprise
    if (
      isEmpty(values.entreprise.legalName) ||
      isEmpty(values.entreprise.registration) ||
      isEmpty(values.entreprise.name) ||
      isEmpty(values.entreprise.email) ||
      isEmpty(values.entreprise.phone) ||
      isEmpty(values.entreprise.fullAddress)
    ) {
      return 1;
    }

    // Vérifier aussi email et phone au niveau racine
    if (isEmpty(values.email)) {
      return 1;
    }
    if (isEmpty(values.phone)) {
      return 1;
    }
  }

  if (
    isEmpty(values.propertyFullAddress) ||
    isEmpty(values.propertySurfaceM2) ||
    isEmpty(values.propertyType) ||
    isEmpty(values.propertyLegalStatus)
  ) {
    return 3;
  }

  if (
    isEmpty(values.bailType) ||
    isEmpty(values.bailRentAmount) ||
    isEmpty(values.bailEffectiveDate) ||
    isEmpty(values.bailMonthlyCharges) ||
    isEmpty(values.bailSecurityDeposit) ||
    isEmpty(values.bailPaymentDay)
  ) {
    return 4;
  }

  const hasTenant =
    intakeLink?.bail?.parties?.some(
      (party: any) => party.profilType === ProfilType.LOCATAIRE
    ) ?? false;
  if (isEmpty(values.tenantEmail) && !hasTenant) {
    return 5;
  }

  const clientDocs = intakeLink.client?.documents || [];
  const propertyDocs = intakeLink.property?.documents || [];
  const bailDocs = intakeLink.bail?.documents || [];

  if (clientType === ClientType.PERSONNE_MORALE) {
    const hasKbis = clientDocs.some((d: any) => d.kind === "KBIS");
    const hasStatutes = clientDocs.some((d: any) => d.kind === "STATUTES");
    if (!hasKbis || !hasStatutes) return 6;
  } else if (clientType === ClientType.PERSONNE_PHYSIQUE) {
    const hasBirthCert = clientDocs.some((d: any) => d.kind === "BIRTH_CERT");
    const hasId = clientDocs.some((d: any) => d.kind === "ID_IDENTITY");
    if (!hasBirthCert || !hasId) return 6;
    const hasLivret = clientDocs.some((d: any) => d.kind === "LIVRET_DE_FAMILLE");
    const hasPacs = clientDocs.some((d: any) => d.kind === "CONTRAT_DE_PACS");
    if (!hasLivret || !hasPacs) return 6;
  }

  const hasDiagnostics = propertyDocs.some((d: any) => d.kind === "DIAGNOSTICS");
  const hasTitleDeed = propertyDocs.some((d: any) => d.kind === "TITLE_DEED");
  if (!hasDiagnostics || !hasTitleDeed) return 6;

  if (
    values.propertyLegalStatus === BienLegalStatus.CO_PROPRIETE &&
    !propertyDocs.some((d: any) => d.kind === "REGLEMENT_COPROPRIETE")
  ) {
    return 6;
  }
  if (values.propertyLegalStatus === BienLegalStatus.LOTISSEMENT) {
    const hasCahier = propertyDocs.some(
      (d: any) => d.kind === "CAHIER_DE_CHARGE_LOTISSEMENT"
    );
    const hasStatut = propertyDocs.some(
      (d: any) => d.kind === "STATUT_DE_LASSOCIATION_SYNDICALE"
    );
    if (!hasCahier || !hasStatut) return 6;
  }

  const hasInsurance = bailDocs.some((d: any) => d.kind === "INSURANCE");
  const hasRib = bailDocs.some((d: any) => d.kind === "RIB");
  if (!hasInsurance || !hasRib) return 6;

  return STEPS.length - 1;
};

export function OwnerIntakeForm({
  intakeLink: initialIntakeLink,
}: {
  intakeLink: IntakeLink;
}) {
  // Invalider le cache des documents au montage du composant
  // Cela garantit que les documents sont rechargés depuis la base de données quand on revient au formulaire
  useEffect(() => {
    // Importer dynamiquement pour éviter les problèmes de dépendances circulaires
    import("@/components/intakes/document-uploaded").then((module) => {
      module.invalidateDocumentCache(initialIntakeLink.token);
      // Déclencher un événement pour forcer le rechargement de tous les composants DocumentUploaded
      window.dispatchEvent(new CustomEvent(`document-uploaded-${initialIntakeLink.token}`));
      console.log(`[OwnerIntakeForm] Cache invalidé et événement déclenché pour token: ${initialIntakeLink.token}`);
    });
  }, [initialIntakeLink.token]);
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [intakeLink, setIntakeLink] =
  useState<IntakeLink>(initialIntakeLink);
const [currentStep, setCurrentStep] = useState(0);
const [isSaving, setIsSaving] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [isFileUploading, setIsFileUploading] = useState(false);
const [submissionProgress, setSubmissionProgress] = useState({
  step: 0,
  totalSteps: 4,
  currentStepName: "",
});

const initialClientType =
  (initialIntakeLink.client?.type as ClientType | "") ||
  "";

const [clientType, setClientType] = useState<ClientType | "">(
  initialClientType
);

  const [openAccordionValue, setOpenAccordionValue] = useState<string>(`person-0`);

  // Fonction pour gérer les changements d'état d'upload
  const handleUploadStateChange = (isUploading: boolean) => {
    setIsFileUploading(isUploading);
  };

  // File refs
  const kbisRef = useRef<HTMLInputElement>(null);
  const statutesRef = useRef<HTMLInputElement>(null);
  const livretDeFamilleRef = useRef<HTMLInputElement>(null);
  const contratDePacsRef = useRef<HTMLInputElement>(null);
  const diagnosticsRef = useRef<HTMLInputElement>(null);
  const titleDeedRef = useRef<HTMLInputElement>(null);
  const reglementCoproprieteRef = useRef<HTMLInputElement>(null);
  const cahierChargeLotissementRef = useRef<HTMLInputElement>(null);
  const statutAssociationSyndicaleRef = useRef<HTMLInputElement>(null);
  const insuranceOwnerRef = useRef<HTMLInputElement>(null);
  const ribOwnerRef = useRef<HTMLInputElement>(null);

  // Refs dynamiques pour les documents de chaque personne
  const personDocumentRefs = useRef<Record<number, { birthCert: React.RefObject<HTMLInputElement>; idIdentity: React.RefObject<HTMLInputElement> }>>({});

  // File states
  const [kbisFile, setKbisFile] = useState<File | null>(null);
  const [statutesFile, setStatutesFile] = useState<File | null>(null);
  const [livretDeFamilleFile, setLivretDeFamilleFile] =
    useState<File | null>(null);
  const [contratDePacsFile, setContratDePacsFile] =
    useState<File | null>(null);
  const [diagnosticsFile, setDiagnosticsFile] = useState<File | null>(null);
  const [titleDeedFile, setTitleDeedFile] = useState<File | null>(null);
  const [reglementCoproprieteFile, setReglementCoproprieteFile] =
    useState<File | null>(null);
  const [cahierChargeLotissementFile, setCahierChargeLotissementFile] =
    useState<File | null>(null);
  const [statutAssociationSyndicaleFile, setStatutAssociationSyndicaleFile] =
    useState<File | null>(null);
  const [insuranceOwnerFile, setInsuranceOwnerFile] =
    useState<File | null>(null);
  const [ribOwnerFile, setRibOwnerFile] = useState<File | null>(null);

  // États dynamiques pour les documents de chaque personne
  const [personDocumentFiles, setPersonDocumentFiles] = useState<Record<number, { birthCert: File | null; idIdentity: File | null }>>({});

  const defaultValues = useMemo(
    () => buildDefaultValues(intakeLink),
    [intakeLink]
  );

  const form = useForm<FormWithPersons>({
    resolver: zodResolver(ownerFormSchema) as any,
    defaultValues,
  });

  console.log("defaultValues", form.formState);

  const { control, trigger, getValues, setValue, handleSubmit, watch } = form;
  const { fields: personFields, append: appendPerson, remove: removePerson } = useFieldArray({
    control,
    name: "persons",
  });

  const personsWatch = watch("persons");

  // Fonction pour supprimer une personne et mettre à jour immédiatement le raw.payload
  const handleRemovePerson = async (index: number) => {
    // Supprimer la personne du formulaire
    removePerson(index);
    
    // Attendre un peu pour que le formulaire soit mis à jour
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Sauvegarder immédiatement les données mises à jour
    try {
      const payload = mapPersonsToOwnerPayload(getValues() as FormWithPersons);
      await savePartialIntake({
        token: intakeLink.token,
        payload,
        stepId: "clientInfo", // La suppression d'une personne concerne toujours l'étape clientInfo
      });
      
      // ✅ Rafraîchir les données pour obtenir les valeurs réellement sauvegardées en DB
      const refreshed = await refreshIntakeLinkData();
      
      // ✅ Mettre à jour lastSavedValues avec les valeurs réelles de la base de données
      if (refreshed) {
        const refreshedValues = buildDefaultValues(refreshed);
        lastSavedValues.current = refreshedValues as FormWithPersons;
      } else {
        // Fallback : utiliser les valeurs du payload si le rafraîchissement échoue
        lastSavedValues.current = payload as FormWithPersons;
      }
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde après suppression:", error);
      const message =
        error?.message ||
        error?.toString() ||
        "Erreur lors de la sauvegarde";
      
      // Si l'erreur concerne un email déjà utilisé, afficher un message avec lien vers le service client
      if (message.includes("déjà utilisé") || message.includes("email")) {
        toast.error(message, {
          description: message.includes("/#contact") ? undefined : (
            <a href="/#contact" className="underline font-medium">
              Cliquez ici pour contacter le service client
            </a>
          ),
          duration: 10000,
        });
      } else {
        toast.error(message);
      }
      // On ne bloque pas l'utilisateur, la suppression dans le formulaire a déjà eu lieu
    }
  };

  // Initialiser les refs pour les personnes existantes
  useEffect(() => {
    const persons = personsWatch || [];
    persons.forEach((_, index) => {
      if (!personDocumentRefs.current[index]) {
        personDocumentRefs.current[index] = {
          birthCert: React.createRef<HTMLInputElement | null>() as any,
          idIdentity: React.createRef<HTMLInputElement | null>() as any,
        };
      }
      if (!personDocumentFiles[index]) {
        setPersonDocumentFiles(prev => ({
          ...prev,
          [index]: { birthCert: null, idIdentity: null }
        }));
      }
    });
    // Nettoyer les refs pour les personnes supprimées
    Object.keys(personDocumentRefs.current).forEach(key => {
      const index = parseInt(key);
      if (index >= persons.length) {
        delete personDocumentRefs.current[index];
        setPersonDocumentFiles(prev => {
          const newState = { ...prev };
          delete newState[index];
          return newState;
        });
      }
    });
  }, [personsWatch, personDocumentFiles]);
  const entrepriseWatch = watch("entreprise");
  const typeWatch = watch("type");

  // Synchroniser persons avec les champs racine (PERSONNE_PHYSIQUE)
  useEffect(() => {
    if (typeWatch !== ClientType.PERSONNE_PHYSIQUE) return;
    
    if (!personsWatch || personsWatch.length === 0) return;
    const primary = personsWatch[0];

    const set = (field: keyof FormWithPersons, value: any) =>
      setValue(field, value as any, { shouldDirty: false, shouldValidate: false });
    
    set("email", primary.email || "");
    set("phone", primary.phone || "");
  }, [personsWatch, typeWatch, setValue]);

  // Synchroniser entreprise avec les champs racine (PERSONNE_MORALE)
  useEffect(() => {
    if (typeWatch !== ClientType.PERSONNE_MORALE) return;
    const primaryEmail = personsWatch?.[0]?.email || "";
    const rootEmail = 
      intakeLink.client?.entreprise?.email ||
      intakeLink.client?.persons?.[0]?.email ||
      primaryEmail || 
      "";
    if (!entrepriseWatch) {
      setValue("entreprise", {
        legalName: "",
        registration: "",
        name: "",
        email: rootEmail,
        phone: "",
        fullAddress: "",
        documents: [],
      }, { shouldDirty: false });
      setValue("persons", [emptyPerson] as any, { shouldDirty: false });
      return;
    }

    const set = (field: keyof FormWithPersons, value: any) =>
      setValue(field, value as any, { shouldDirty: false, shouldValidate: false });

    // Mettre à jour l'email racine quand l'entreprise change son email
    set("email", entrepriseWatch.email || "");
    set("phone", entrepriseWatch.phone || "");

  }, [entrepriseWatch, typeWatch, setValue, intakeLink.client, personsWatch]);

  // Détecter le changement de type et nettoyer l'ancien type
  const prevTypeRef = useRef<ClientType | "">(initialClientType);
  
  useEffect(() => {
    const currentType = typeWatch as ClientType | "";
    const previousType = prevTypeRef.current;
    
    // Si le type a changé
    if (currentType !== previousType && previousType !== "") {
      const rootEmail = 
        getValues("email") || 
        intakeLink.client?.entreprise?.email ||
        intakeLink.client?.persons?.[0]?.email ||
        "";
      const rootPhone = 
        getValues("phone") || 
        intakeLink.client?.entreprise?.phone ||
        intakeLink.client?.persons?.[0]?.phone || 
        "";
      
      if (currentType === ClientType.PERSONNE_MORALE) {
        // On devient entreprise : nettoyer les personnes et initialiser avec le mail racine
        setValue("persons", [] as any, { shouldDirty: false });
        const currentEntreprise = getValues("entreprise") as EntrepriseForm | undefined;
        setValue("entreprise", {
          ...(currentEntreprise || {
            legalName: "",
            registration: "",
            name: "",
            fullAddress: "",
            documents: [],
          }),
          email: rootEmail,
          phone: rootPhone,
        }, { shouldDirty: false });
        setValue("email", rootEmail, { shouldDirty: false });
        setValue("phone", rootPhone, { shouldDirty: false });
      } else if (currentType === ClientType.PERSONNE_PHYSIQUE) {
        // On devient personne : nettoyer l'entreprise et initialiser avec le mail racine
        setValue("entreprise", undefined, { shouldDirty: false });
        const currentPersons = getValues("persons") as PersonForm[] | undefined;
        if (!currentPersons || currentPersons.length === 0) {
          setValue("persons", [{
            ...emptyPerson,
            email: rootEmail,
            phone: rootPhone,
          }] as any, { shouldDirty: false });
        } else {
          // Mettre à jour la personne primaire avec le mail racine
          const updatedPersons = [
            {
              ...currentPersons[0],
              email: rootEmail,
              phone: rootPhone,
            },
            ...currentPersons.slice(1),
          ];
          setValue("persons", updatedPersons as any, { shouldDirty: false });
        }
        setValue("email", rootEmail, { shouldDirty: false });
        setValue("phone", rootPhone, { shouldDirty: false });
      }
    }
    
    prevTypeRef.current = currentType;
  }, [typeWatch, setValue, getValues, intakeLink.client]);

    // On garde une photo des dernières valeurs sauvegardées
    const lastSavedValues = useRef<FormWithPersons>(defaultValues);

    // Initialisation du step UNIQUEMENT au chargement du formulaire
    useEffect(() => {
      lastSavedValues.current = defaultValues as FormWithPersons;
    
      setCurrentStep(
        findFirstIncompleteStep(
          defaultValues,
          intakeLink,
          (defaultValues.type as ClientType | "") ||
            (initialIntakeLink.client?.type as ClientType | "") ||
            ""
        )
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  

    useEffect(() => {
      // On force le type dans le form (utile si on change le type au step 1)
      setValue("type", clientType as any);
    
      if (clientType === ClientType.PERSONNE_MORALE) {
        const currentEntreprise = getValues("entreprise") as EntrepriseForm | undefined;
    
        // Si aucune entreprise encore initialisée → on en crée une "vide".
        // L'email / téléphone racine seront synchronisés par le hook
        // "Synchroniser entreprise avec les champs racine".
        if (!currentEntreprise) {
          setValue(
            "entreprise",
            {
              legalName: "",
              registration: "",
              name: "",
              email: "",
              phone: "",
              fullAddress: "",
              documents: [],
            },
            { shouldDirty: false }
          );
        }
      }
    
      if (clientType === ClientType.PERSONNE_PHYSIQUE) {
        const currentPersons = getValues("persons") as PersonForm[] | undefined;
    
        // On garantit qu'il y a au moins une personne dans le tableau
        if (!currentPersons || currentPersons.length === 0) {
          setValue("persons", [emptyPerson] as any, { shouldDirty: false });
        }
      }
    }, [clientType, setValue, getValues]);
    
  const refreshIntakeLinkData = async () => {
    try {
      const refreshed = await getIntakeLinkByToken(intakeLink.token);
      if (refreshed) {
        setIntakeLink(refreshed as IntakeLink);
        return refreshed as IntakeLink;
      }
      return null;
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des données:", error);
      return null;
    }
  };

  const hasDocument = (
    ref: RefObject<HTMLInputElement | null> | null,
    stateFile: File | null,
    kind: string,
    personIndex?: number
  ) => {
    if (ref?.current?.files?.[0]) return true;
    if (stateFile) return true;
    
    const values = getValues() as FormWithPersons;
    
    // Documents client (livret de famille, PACS)
    const clientDocs = values.clientDocuments || [];
    
    // Documents des personnes (BIRTH_CERT, ID_IDENTITY)
    // Si personIndex est fourni, vérifier seulement pour cette personne
    if (personIndex !== undefined) {
      const person = values.persons?.[personIndex];
      const personDocs = person?.documents || [];
      if (personDocs.some((d: any) => d.kind === kind)) return true;
    } else {
      const personDocs = values.persons?.flatMap((p: any) => p.documents || []) || [];
      if (personDocs.some((d: any) => d.kind === kind)) return true;
    }
    
    // Documents de l'entreprise (KBIS, STATUTES)
    const entrepriseDocs = values.entreprise?.documents || [];
    
    // Documents bien et bail
    const propertyDocs = values.propertyDocuments || [];
    const bailDocs = values.bailDocuments || [];
    
    return (
      clientDocs.some((d: any) => d.kind === kind) ||
      entrepriseDocs.some((d: any) => d.kind === kind) ||
      propertyDocs.some((d: any) => d.kind === kind) ||
      bailDocs.some((d: any) => d.kind === kind)
    );
  };
  

  const validateDocuments = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const values = getValues() as FormWithPersons;
    const propertyLegalStatus = values.propertyLegalStatus;

    if (clientType === ClientType.PERSONNE_MORALE) {
      if (!hasDocument(kbisRef, kbisFile, "KBIS")) {
        errors.push("KBIS requis");
      }
      if (!hasDocument(statutesRef, statutesFile, "STATUTES")) {
        errors.push("Statuts requis");
      }
    } else {
      // Vérifier les documents pour chaque personne
      const persons = values.persons || [];
      persons.forEach((person: any, index: number) => {
        const personName = person.firstName && person.lastName 
          ? `${person.firstName} ${person.lastName}` 
          : `Personne ${index + 1}`;
        
        const personRefs = personDocumentRefs.current[index];
        const personFiles = personDocumentFiles[index] || { birthCert: null, idIdentity: null };
        
        if (!hasDocument(personRefs?.birthCert || null, personFiles.birthCert, "BIRTH_CERT", index)) {
          errors.push(`Acte de naissance requis pour ${personName}`);
        }
        if (!hasDocument(personRefs?.idIdentity || null, personFiles.idIdentity, "ID_IDENTITY", index)) {
          errors.push(`Pièce d'identité requise pour ${personName}`);
        }
      });
      
      // Documents communs au client (livret de famille, PACS)
      // Utiliser le statut familial de la première personne
      const primaryPerson = persons[0];
      if (primaryPerson?.familyStatus === FamilyStatus.MARIE) {
        if (!hasDocument(livretDeFamilleRef, livretDeFamilleFile, "LIVRET_DE_FAMILLE")) {
          errors.push("Livret de famille requis");
        }
      }
      if (primaryPerson?.familyStatus === FamilyStatus.PACS) {
        if (!hasDocument(contratDePacsRef, contratDePacsFile, "CONTRAT_DE_PACS")) {
          errors.push("Contrat de PACS requis");
        }
      }
    }

    if (!hasDocument(diagnosticsRef, diagnosticsFile, "DIAGNOSTICS")) {
      errors.push("Diagnostics du bien requis");
    }
    if (!hasDocument(titleDeedRef, titleDeedFile, "TITLE_DEED")) {
      errors.push("Titre de propriété requis");
    }
    if (
      propertyLegalStatus === BienLegalStatus.CO_PROPRIETE &&
      !hasDocument(
        reglementCoproprieteRef,
        reglementCoproprieteFile,
        "REGLEMENT_COPROPRIETE"
      )
    ) {
      errors.push("Règlement de copropriété requis");
    }
    if (propertyLegalStatus === BienLegalStatus.LOTISSEMENT) {
      if (
        !hasDocument(
          cahierChargeLotissementRef,
          cahierChargeLotissementFile,
          "CAHIER_DE_CHARGE_LOTISSEMENT"
        )
      ) {
        errors.push("Cahier des charges du lotissement requis");
      }
      if (
        !hasDocument(
          statutAssociationSyndicaleRef,
          statutAssociationSyndicaleFile,
          "STATUT_DE_LASSOCIATION_SYNDICALE"
        )
      ) {
        errors.push("Statut de l'association syndicale requis");
      }
    }

    if (!hasDocument(insuranceOwnerRef, insuranceOwnerFile, "INSURANCE")) {
      errors.push("Assurance propriétaire requise");
    }
    if (!hasDocument(ribOwnerRef, ribOwnerFile, "RIB")) {
      errors.push("RIB requis");
    }

    return { isValid: errors.length === 0, errors };
  };

  const mapPersonsToOwnerPayload = (data: FormWithPersons): FormWithPersons & { entreprise?: EntrepriseForm } => {
    // Récupérer l'email racine depuis les données actuelles ou depuis la base
    const rootEmail = 
      data.email || 
      intakeLink.client?.entreprise?.email ||
      intakeLink.client?.persons?.[0]?.email ||
      "";
    
    // Récupérer le téléphone racine depuis les données actuelles ou depuis la base
    const rootPhone = 
      data.phone || 
      intakeLink.client?.entreprise?.phone ||
      intakeLink.client?.persons?.[0]?.phone || 
      "";
    
    // Si PERSONNE_MORALE, utiliser entreprise
    if (data.type === ClientType.PERSONNE_MORALE && data.entreprise) {
      // Utiliser l'email de l'entreprise s'il a été modifié, sinon garder le mail racine
      const emailToUse = data.entreprise.email || rootEmail;
      const phoneToUse = data.entreprise.phone || rootPhone;
      
      return {
        ...data,
        email: emailToUse, // Email racine
        phone: phoneToUse, // Téléphone racine
        persons: [] as any, // Nettoyer les personnes
        entreprise: {
          ...data.entreprise,
          email: emailToUse, // Synchroniser avec l'email racine
          phone: phoneToUse, // Synchroniser avec le téléphone racine
        },
      };
    }
    
    // Sinon, PERSONNE_PHYSIQUE avec persons (toutes les personnes)
    const persons = data.persons && data.persons.length > 0 ? data.persons : [emptyPerson];
    const primary = persons[0];
    
    // Utiliser l'email de la personne primaire s'il a été modifié, sinon garder le mail racine
    const emailToUse = primary.email || rootEmail;
    // Pour le téléphone, utiliser d'abord celui de la personne primaire, puis celui du champ racine, puis celui de la base
    const phoneToUse = primary.phone || data.phone || rootPhone;
    
    // Mettre à jour la personne primaire avec l'email racine
    const updatedPersons = [
      {
        ...primary,
        email: emailToUse,
        phone: phoneToUse,
      },
      ...persons.slice(1),
    ];
    
    return {
      ...data,
      email: emailToUse, // Email racine dans raw.payload
      phone: phoneToUse, // Téléphone racine dans raw.payload
      persons: updatedPersons as any,
      entreprise: undefined, // Nettoyer l'entreprise
    };
  };

  // Fonction pour obtenir les champs d'un step
  const getFieldsForStep = (step: number): (keyof FormWithPersons)[] => {
    const stepId = STEPS[step]?.id;
    switch (stepId) {
      case "clientType":
        return ["type"];
      case "clientInfo":
        if (clientType === ClientType.PERSONNE_PHYSIQUE) {
          return ["persons"];
        }
        return ["entreprise"];
      case "property":
        return [
          "propertyLabel",
          "propertyFullAddress",
          "propertySurfaceM2",
          "propertyType",
          "propertyLegalStatus",
          "propertyStatus",
        ];
      case "bail":
        return [
          "bailType",
          "bailFamily",
          "bailRentAmount",
          "bailMonthlyCharges",
          "bailSecurityDeposit",
          "bailPaymentDay",
          "bailEffectiveDate",
          "bailEndDate",
        ];
      case "tenant":
        return ["tenantEmail"];
      default:
        return [];
    }
  };

  // Fonction pour construire un payload minimal basé uniquement sur les champs de l'étape actuelle
  const buildStepPayload = (step: number, allValues: FormWithPersons): Partial<FormWithPersons> => {
    const fieldsToInclude = getFieldsForStep(step);
    const stepPayload: Partial<FormWithPersons> = {
      clientId: allValues.clientId, // Toujours inclure clientId
    };

    // Pour chaque champ de l'étape, l'inclure dans le payload
    fieldsToInclude.forEach((field) => {
      const value = allValues[field];
      if (value !== undefined && value !== null) {
        // Pour les champs spéciaux comme "persons" ou "entreprise", inclure toute la structure
        if (field === "persons" && Array.isArray(value)) {
          stepPayload.persons = value as any;
          // Inclure aussi email et phone au niveau racine pour la synchronisation
          if (value.length > 0 && value[0]) {
            stepPayload.email = (value[0] as any).email || allValues.email;
            stepPayload.phone = (value[0] as any).phone || allValues.phone;
          }
        } else if (field === "entreprise" && typeof value === "object") {
          stepPayload.entreprise = value as any;
          // Inclure aussi email et phone au niveau racine pour la synchronisation
          if ((value as any).email) {
            stepPayload.email = (value as any).email;
          }
          if ((value as any).phone) {
            stepPayload.phone = (value as any).phone;
          }
        } else {
          (stepPayload as any)[field] = value;
        }
      }
    });

    // Pour l'étape clientType, inclure aussi le type
    if (STEPS[step]?.id === "clientType") {
      stepPayload.type = allValues.type;
    }

    return stepPayload;
  };

  // Fonction pour normaliser une valeur pour la comparaison
  const normalizeValue = (val: any): string => {
    if (val === undefined || val === null || val === "") return "";
    if (val && typeof val === 'object' && 'toISOString' in val && typeof val.toISOString === 'function') {
      return val.toISOString().split('T')[0];
    }
    if (Array.isArray(val)) {
      // Pour les tableaux, normaliser chaque élément individuellement
      return JSON.stringify(val.map(item => {
        if (typeof item === 'object' && item !== null) {
          // Normaliser les objets dans le tableau
          const normalized: any = {};
          for (const key in item) {
            if (item.hasOwnProperty(key)) {
              const value = item[key];
              if (value && typeof value === 'object' && 'toISOString' in value && typeof value.toISOString === 'function') {
                normalized[key] = value.toISOString().split('T')[0];
              } else if (Array.isArray(value)) {
                normalized[key] = value.map((v: any) => 
                  typeof v === 'object' && v !== null && 'toISOString' in v 
                    ? v.toISOString().split('T')[0] 
                    : v
                );
              } else {
                normalized[key] = value;
              }
            }
          }
          return normalized;
        }
        return item;
      }));
    }
    if (typeof val === 'object' && val !== null) {
      // Normaliser les objets en normalisant les dates
      const normalized: any = {};
      for (const key in val) {
        if (val.hasOwnProperty(key)) {
          const value = val[key];
          if (value && typeof value === 'object' && 'toISOString' in value && typeof value.toISOString === 'function') {
            normalized[key] = value.toISOString().split('T')[0];
          } else if (Array.isArray(value)) {
            normalized[key] = value.map((v: any) => 
              typeof v === 'object' && v !== null && 'toISOString' in v 
                ? v.toISOString().split('T')[0] 
                : v
            );
          } else {
            normalized[key] = value;
          }
        }
      }
      return JSON.stringify(normalized);
    }
    return String(val).trim();
  };

  // Fonction pour comparer deux tableaux de personnes en profondeur
  const comparePersonsArrays = (current: any[], initial: any[]): boolean => {
    // Vérifier que les deux sont des tableaux
    if (!Array.isArray(current) || !Array.isArray(initial)) {
      return normalizeValue(current) !== normalizeValue(initial);
    }
    
    // Si les longueurs diffèrent, il y a eu un changement
    if (current.length !== initial.length) {
      return true;
    }
    
    // Comparer chaque personne individuellement
    for (let i = 0; i < current.length; i++) {
      const currentPerson = current[i];
      const initialPerson = initial[i];
      
      // Si l'une des deux personnes est null/undefined
      if (!currentPerson || !initialPerson) {
        if (normalizeValue(currentPerson) !== normalizeValue(initialPerson)) {
          return true;
        }
        continue;
      }
      
      // Liste complète de tous les champs à comparer
      const personFields = [
        'firstName', 
        'lastName', 
        'email', 
        'phone', 
        'fullAddress', 
        'profession', 
        'nationality', 
        'familyStatus', 
        'matrimonialRegime', 
        'birthPlace', 
        'birthDate',
        'isPrimary' // Ajouter isPrimary si présent
      ];
      
      // Comparer tous les champs de la personne
      for (const field of personFields) {
        const currentFieldValue = currentPerson[field];
        const initialFieldValue = initialPerson[field];
        
        // Normaliser et comparer
        const normalizedCurrent = normalizeValue(currentFieldValue);
        const normalizedInitial = normalizeValue(initialFieldValue);
        
        if (normalizedCurrent !== normalizedInitial) {
          return true; // Un champ a changé
        }
      }
      
      // Comparer les documents de manière plus robuste
      const currentDocs = currentPerson.documents || [];
      const initialDocs = initialPerson.documents || [];
      
      // Si les longueurs diffèrent, il y a un changement
      if (currentDocs.length !== initialDocs.length) {
        return true;
      }
      
      // Comparer chaque document individuellement
      if (currentDocs.length > 0 || initialDocs.length > 0) {
        // Créer des maps pour comparer plus facilement
        const currentDocsMap = new Map<string, RawDocumentMeta>(
          currentDocs.map((doc: RawDocumentMeta) => [`${doc.kind}_${doc.fileKey || ''}`, doc])
        );
        const initialDocsMap = new Map<string, RawDocumentMeta>(
          initialDocs.map((doc: RawDocumentMeta) => [`${doc.kind}_${doc.fileKey || ''}`, doc])
        );
        
        // Vérifier si tous les documents actuels existent dans les initiaux
        for (const [key, currentDoc] of currentDocsMap.entries()) {
          const initialDoc = initialDocsMap.get(key);
          if (!initialDoc) {
            return true; // Nouveau document
          }
          // Comparer les propriétés du document
          if (
            normalizeValue(currentDoc.fileKey) !== normalizeValue(initialDoc.fileKey) ||
            normalizeValue(currentDoc.fileName) !== normalizeValue(initialDoc.fileName) ||
            normalizeValue(currentDoc.kind) !== normalizeValue(initialDoc.kind)
          ) {
            return true; // Document modifié
          }
        }
        
        // Vérifier si un document initial a été supprimé
        for (const key of initialDocsMap.keys()) {
          if (!currentDocsMap.has(key)) {
            return true; // Document supprimé
          }
        }
      }
    }
    
    return false; // Aucun changement détecté
  };

  // Fonction pour vérifier si les données d'un step ont changé
  const hasStepDataChanged = (step: number): boolean => {
    const fieldsToCheck = getFieldsForStep(step);
    const currentValues = form.getValues();
    const initial = lastSavedValues.current;

    // Pour le step documents, vérifier uniquement les fichiers
    if (STEPS[step]?.id === "documents") {
      // Vérifier s'il y a de nouveaux fichiers à uploader
      const fileRefs = [
        { ref: kbisRef, stateFile: kbisFile },
        { ref: statutesRef, stateFile: statutesFile },
        { ref: livretDeFamilleRef, stateFile: livretDeFamilleFile },
        { ref: contratDePacsRef, stateFile: contratDePacsFile },
        { ref: diagnosticsRef, stateFile: diagnosticsFile },
        { ref: titleDeedRef, stateFile: titleDeedFile },
        { ref: reglementCoproprieteRef, stateFile: reglementCoproprieteFile },
        { ref: cahierChargeLotissementRef, stateFile: cahierChargeLotissementFile },
        { ref: statutAssociationSyndicaleRef, stateFile: statutAssociationSyndicaleFile },
        { ref: insuranceOwnerRef, stateFile: insuranceOwnerFile },
        { ref: ribOwnerRef, stateFile: ribOwnerFile },
      ];

      // Vérifier s'il y a de nouveaux fichiers (dans les refs ou les états)
      const hasNewFiles = fileRefs.some(({ ref, stateFile }) => {
        return ref.current?.files?.[0] !== undefined || stateFile !== null;
      });

      // Vérifier aussi les fichiers des personnes
      const persons = personsWatch || [];
      for (let i = 0; i < persons.length; i++) {
        const personRefs = personDocumentRefs.current[i];
        const personFiles = personDocumentFiles[i];
        
        if (personRefs?.birthCert.current?.files?.[0] || personFiles?.birthCert) {
          return true;
        }
        if (personRefs?.idIdentity.current?.files?.[0] || personFiles?.idIdentity) {
          return true;
        }
      }

      return hasNewFiles;
    }

    // Pour les autres steps, vérifier les champs de données
    for (const field of fieldsToCheck) {
      const currentValue = currentValues[field];
      const initialValue = initial[field];

      // Cas spécial pour le champ "persons" : comparaison approfondie
      if (field === "persons") {
        // Si les deux sont des tableaux, comparer en profondeur
        if (Array.isArray(currentValue) && Array.isArray(initialValue)) {
          if (comparePersonsArrays(currentValue, initialValue)) {
            return true; // Des changements ont été détectés dans les personnes
          }
        } 
        // Si l'un est un tableau et l'autre non, ou si les longueurs diffèrent, il y a un changement
        else if (Array.isArray(currentValue) || Array.isArray(initialValue)) {
          return true; // Changement de structure
        }
        // Si aucun n'est un tableau, comparer normalement
        else {
          const normalizedCurrent = normalizeValue(currentValue);
          const normalizedInitial = normalizeValue(initialValue);
          if (normalizedCurrent !== normalizedInitial) {
            return true;
          }
        }
        continue; // Passer au champ suivant
      }

      // Pour les autres champs, utiliser la normalisation standard
      const normalizedCurrent = normalizeValue(currentValue);
      const normalizedInitial = normalizeValue(initialValue);

      if (normalizedCurrent !== normalizedInitial) {
        return true; // Des données ont changé
      }
    }

    return false; // Aucun changement détecté
  };

  const saveCurrentStep = async (redirectAfterSave: boolean, skipIfUnchanged: boolean = false) => {
    // Si skipIfUnchanged est true, vérifier si les données ont changé
    if (skipIfUnchanged && !hasStepDataChanged(currentStep)) {
      // Les données n'ont pas changé, pas besoin de sauvegarder
      return;
    }

    const stepId = STEPS[currentStep].id;
    const allValues = getValues() as FormWithPersons;
    
    // Construire un payload minimal pour l'étape actuelle uniquement
    const stepPayload = buildStepPayload(currentStep, allValues);
    
    // Pour les étapes qui nécessitent la transformation complète (clientInfo avec persons/entreprise)
    // on utilise mapPersonsToOwnerPayload pour garantir la cohérence
    let payload: any;
    if (stepId === "clientInfo") {
      // Pour clientInfo, on doit mapper correctement les personnes/entreprise avec les champs racine
      payload = mapPersonsToOwnerPayload(allValues);
      // Mais on ne garde que les champs pertinents de l'étape
      const fieldsToKeep = getFieldsForStep(currentStep);
      const filteredPayload: any = { clientId: payload.clientId };
      fieldsToKeep.forEach((field) => {
        if (field === "persons") {
          filteredPayload.persons = payload.persons;
          filteredPayload.email = payload.email;
          filteredPayload.phone = payload.phone;
        } else if (field === "entreprise") {
          filteredPayload.entreprise = payload.entreprise;
          filteredPayload.email = payload.email;
          filteredPayload.phone = payload.phone;
        } else {
          filteredPayload[field] = payload[field];
        }
      });
      payload = filteredPayload;
    } else {
      // Pour les autres étapes, utiliser le payload minimal
      payload = stepPayload;
    }
    
    setIsSaving(true);
    try {
      // Rafraîchir les données uniquement si on est sur l'étape documents ou si on vient de passer à cette étape
      // Cela évite des appels API inutiles pour les autres étapes
      const stepId = STEPS[currentStep].id;
      if (stepId === "documents") {
        await refreshIntakeLinkData();
      }

      await savePartialIntake({
        token: intakeLink.token,
        payload,
        stepId: stepId, // Envoyer l'ID de l'étape pour que le backend sache quelle étape traiter
      });

      // ✅ Rafraîchir les données pour obtenir les valeurs réellement sauvegardées en DB
      const refreshed = await refreshIntakeLinkData();
      
      // ✅ Mettre à jour lastSavedValues avec les valeurs réelles de la base de données
      if (refreshed) {
        const refreshedValues = buildDefaultValues(refreshed as IntakeLink);
        lastSavedValues.current = refreshedValues as FormWithPersons;
      } else {
        // Fallback : utiliser les valeurs du payload si le rafraîchissement échoue
        lastSavedValues.current = payload as FormWithPersons;
      }

      toast.success("Données enregistrées avec succès");

      if (redirectAfterSave) {
        const isFromCommencer = pathname?.includes("/commencer/proprietaire");
        const reminderPath = isFromCommencer
          ? `/commencer/reminder?token=${intakeLink.token}`
          : `/intakes/${intakeLink.token}/reminder`;
        router.push(reminderPath);
      }
    } catch (error: any) {
      const message =
        error?.message ||
        error?.toString() ||
        "Erreur lors de l'enregistrement";
      
      // Ne pas afficher l'erreur ici si elle concerne un email déjà utilisé
      // Elle sera affichée dans le catch de handleNext ou handleManualSave
      // On relance juste l'erreur pour qu'elle soit gérée par l'appelant
      throw error;
    } finally {
      setIsSaving(false);
    }
  };


  const handleNext = async () => {
    const stepId = STEPS[currentStep].id;
  
    // Si on est sur l'étape "summary", pas besoin de sauvegarder, c'est juste une étape de visionnage
    if (stepId === "summary") {
      const nextStep = Math.min(currentStep + 1, STEPS.length - 1);
      setCurrentStep(nextStep);
      return;
    } else {
      const fields = getRequiredFields(stepId, clientType);
  
      // Cas particulier : clientInfo avec plusieurs personnes
      if (stepId === "clientInfo" && clientType === ClientType.PERSONNE_PHYSIQUE) {
        const persons = form.watch("persons") || [];
        const personsFields = persons.map((_, index) => `persons.${index}` as const);
        const allFields = [...fields, ...personsFields];

        const valid = await trigger(allFields as any);
        if (!valid) {
          const errors = form.formState.errors;

          const personsErrors = errors.persons;
          if (Array.isArray(personsErrors)) {
            const indexWithError = personsErrors.findIndex(
              (personError) => personError && Object.keys(personError).length > 0
            );

            if (indexWithError !== -1) {
              setOpenAccordionValue(`person-${indexWithError}`);
            }
          }

          return;
        }
      } else {
        // Validation classique pour les autres steps
        const valid = await trigger(fields as any);
        if (!valid) return;
        
        // Validation spéciale pour le step tenant : vérifier que tenantEmail n'est pas vide
        // sauf si un locataire existe déjà dans le bail
        if (stepId === "tenant") {
          const hasTenant =
            intakeLink?.bail?.parties?.some(
              (party: any) => party.profilType === ProfilType.LOCATAIRE
            ) ?? false;
          
          const tenantEmail = form.getValues("tenantEmail");
          const isEmpty = (val: any) =>
            val === undefined ||
            val === null ||
            val === "" ||
            (typeof val === "string" && val.trim() === "");
          
          if (isEmpty(tenantEmail) && !hasTenant) {
            toast.error("L'email du locataire est requis");
            return;
          }
        }
      }
    }
  
    // 2. Calcul du step suivant
    const summaryIndex = STEPS.findIndex((s) => s.id === "summary");
    const nextStep =
      stepId === "clientInfo" && summaryIndex !== -1
        ? summaryIndex
        : Math.min(currentStep + 1, STEPS.length - 1);
  
    // 3. Sauvegarde (seulement si les données ont changé)
    try {
      await saveCurrentStep(false, true); // skipIfUnchanged = true
      
      // NE PAS refresh ici si on passe à l'étape documents
      // Le refresh doit se faire uniquement si on EST déjà sur l'étape documents
      if (stepId === "documents") {
        await refreshIntakeLinkData();
      }
  
      // Passer à l'étape suivante APRÈS la sauvegarde
      setCurrentStep(nextStep);
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      const message =
        error?.message ||
        error?.toString() ||
        "Erreur lors de l'enregistrement";
      
      // Si l'erreur concerne un email déjà utilisé, afficher un message avec lien vers le service client
      if (message.includes("déjà utilisé") || message.includes("email")) {
        toast.error(message, {
          description: message.includes("/#contact") ? undefined : (
            <a href="/#contact" className="underline font-medium">
              Cliquez ici pour contacter le service client
            </a>
          ),
          duration: 10000,
        });
      } else {
        toast.error(message);
      }
      // On reste sur l'étape actuelle si erreur
    }
  };
  

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleManualSave = async () => {
    try {
      await saveCurrentStep(true, false); // redirectAfterSave = true, skipIfUnchanged = false (forcer la sauvegarde)
    } catch (error: any) {
      const message =
        error?.message ||
        error?.toString() ||
        "Erreur lors de l'enregistrement";
      
      // Si l'erreur concerne un email déjà utilisé, afficher un message avec lien vers le service client
      if (message.includes("déjà utilisé") || message.includes("email")) {
        toast.error(message, {
          description: message.includes("/#contact") ? undefined : (
            <a href="/#contact" className="underline font-medium">
              Cliquez ici pour contacter le service client
            </a>
          ),
          duration: 10000,
        });
      } else {
        toast.error(message);
      }
    }
  };

  const onSubmit = async (data: FormWithPersons) => {
    setIsSubmitting(true);
    try {
      // Étape 1: Rafraîchir les données pour avoir les documents à jour
      setSubmissionProgress({
        step: 1,
        totalSteps: 3,
        currentStepName: "Vérification des données",
      });
      
      await refreshIntakeLinkData();
      
      // Étape 2: Validation des documents
      const fileValidation = validateDocuments();
      if (!fileValidation.isValid) {
        toast.error("Veuillez joindre tous les documents requis", {
          description: fileValidation.errors.join(", "),
        });
        setSubmissionProgress({ step: 0, totalSteps: 3, currentStepName: "" });
        setIsSubmitting(false);
        return;
      }

      // Préparer le payload
      let payload = mapPersonsToOwnerPayload(data as FormWithPersons);
      const formattedData = {
        ...payload,
        persons: (payload.persons || []).map((person) => ({
          ...person,
          birthDate: toDateValue(person.birthDate) ?? undefined,
        })),
      };

      // Étape 3: Soumission du formulaire
      setSubmissionProgress({
        step: 2,
        totalSteps: 3,
        currentStepName: "Soumission du formulaire",
      });

      // Soumettre les données (les documents sont déjà uploadés via file-upload.tsx)
      await submitIntake({
        token: intakeLink.token,
        payload: formattedData,
      });

      // Étape 4: Redirection
      setSubmissionProgress({
        step: 3,
        totalSteps: 3,
        currentStepName: "Redirection...",
      });

      const successPath = pathname?.includes("/commencer")
        ? `/commencer/success?token=${intakeLink.token}`
        : `/intakes/${intakeLink.token}/success`;
      
      // Petit délai pour afficher la dernière étape
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push(successPath);
    } catch (error: any) {
      console.error("Erreur lors de la soumission:", error);
      const message =
        error?.message || error?.toString() || "Erreur lors de la soumission";
      toast.error(message);
      setSubmissionProgress({ step: 0, totalSteps: 3, currentStepName: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && currentStep < STEPS.length - 1) {
      e.preventDefault();
    }
  };

  const summaryValues = watch();

  const stepperSteps = useMemo(
    () => STEPS.map((step) => ({ title: step.title })),
    []
  );

  return (
    <div className="relative">
      {(isSaving || isSubmitting) && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-100 flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-8 w-full max-w-md px-6">
            <div className="relative animate-pulse">
              <Image
                src="/logoLarge.png"
                alt="BailNotarie"
                width={200}
                height={60}
                className="h-16 sm:h-20 w-auto opacity-90"
                priority
              />
            </div>
            
            {isSubmitting ? (
              <>
                {/* Barre de progression */}
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {submissionProgress.currentStepName || "Traitement en cours..."}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {submissionProgress.step}/{submissionProgress.totalSteps}
                    </span>
                  </div>
                  
                  {/* Barre de progression principale */}
                  <div className="relative h-3 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                      style={{
                        width: `${(submissionProgress.step / submissionProgress.totalSteps) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      style={{
                        backgroundSize: "200% 100%",
                        animation: "shimmer 2s infinite",
                        backgroundPosition: "200% 0",
                      }}
                    />
                  </div>
                  
                  {/* Étapes détaillées */}
                  <div className="space-y-2 mt-4">
                    {[
                      { id: 1, name: "Vérification des données", icon: "✓" },
                      { id: 2, name: "Soumission du formulaire", icon: "📝" },
                      { id: 3, name: "Redirection...", icon: "→" },
                    ].map((step) => {
                      const isCompleted = step.id < submissionProgress.step;
                      const isCurrent = step.id === submissionProgress.step;
                      
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                            isCompleted
                              ? "text-foreground"
                              : isCurrent
                              ? "text-primary font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-300 ${
                              isCompleted
                                ? "bg-primary border-primary text-primary-foreground"
                                : isCurrent
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-muted bg-background text-muted-foreground"
                            }`}
                          >
                            {isCompleted ? (
                              <span className="text-xs">✓</span>
                            ) : isCurrent ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <span className="text-xs">{step.id}</span>
                            )}
                          </div>
                          <span>{step.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm font-medium text-foreground">
                    Enregistrement en cours...
                  </p>
                  <p className="text-xs text-muted-foreground text-center max-w-xs px-4">
                    Vos données sont en cours d'enregistrement, veuillez patienter
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed top-18 left-0 right-0 bg-background border-b border-border/40 z-40 w-full">
        <Stepper
          steps={stepperSteps}
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step < currentStep) {
              setCurrentStep(step);
            }
          }}
        />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit, (errors) => {
          console.error("Erreurs de validation:", errors);
          const errorMessages = Object.entries(errors)
            .map(([key, value]: [string, any]) => {
              if (value?.message) return `${key}: ${value.message}`;
              if (value && typeof value === 'object') {
                return Object.entries(value)
                  .map(([subKey, subValue]: [string, any]) => {
                    if (subValue?.message) return `${key}.${subKey}: ${subValue.message}`;
                    return null;
                  })
                  .filter(Boolean)
                  .join(", ");
              }
              return null;
            })
            .filter(Boolean)
            .join(", ");
          
          if (errorMessages) {
            toast.error("Veuillez corriger les erreurs suivantes", {
              description: errorMessages || "Des erreurs de validation sont présentes",
            });
          } else {
            toast.error("Veuillez remplir tous les champs requis");
          }
        })}
        onKeyDown={handleFormKeyDown}
        className="space-y-4"
      >
        <div className="pt-6">
          {STEPS[currentStep].id === "clientType" && (
            <ClientTypeStep
              form={form}
              clientType={clientType}
              onClientTypeChange={setClientType}
              isMobile={isMobile}
            />
          )}
          {STEPS[currentStep].id === "clientInfo" && (
            <ClientInfoStep
              form={form}
              clientType={clientType}
              personFields={personFields}
              persons={personsWatch || []}
              appendPerson={appendPerson}
              removePerson={handleRemovePerson}
              isMobile={isMobile}
              intakeLink={intakeLink}
              openAccordionValue={openAccordionValue}
              setOpenAccordionValue={setOpenAccordionValue}
              refreshIntakeLinkData={refreshIntakeLinkData}
            />
          )}
          {STEPS[currentStep].id === "summary" && (
            <SummaryStep values={summaryValues as FormWithPersons} clientType={clientType} />
          )}
          {STEPS[currentStep].id === "property" && (
            <PropertyStep form={form as any} isMobile={isMobile} />
          )}
          {STEPS[currentStep].id === "bail" && <BailStep form={form as any} />}
          {STEPS[currentStep].id === "tenant" && <TenantStep form={form as any} />}
          {STEPS[currentStep].id === "documents" && (
            <DocumentsStep
              form={form as any}
              clientType={clientType}
              intakeLink={intakeLink}
              fileRefs={{
                kbisRef: kbisRef as any,
                statutesRef: statutesRef as any,
                livretDeFamilleRef: livretDeFamilleRef as any,
                contratDePacsRef: contratDePacsRef as any,
                diagnosticsRef: diagnosticsRef as any,
                titleDeedRef: titleDeedRef as any,
                reglementCoproprieteRef: reglementCoproprieteRef as any,
                cahierChargeLotissementRef: cahierChargeLotissementRef as any,
                statutAssociationSyndicaleRef: statutAssociationSyndicaleRef as any,
                insuranceOwnerRef: insuranceOwnerRef as any,
                ribOwnerRef: ribOwnerRef as any,
              }}
              fileStates={{
                kbisFile,
                statutesFile,
                livretDeFamilleFile,
                contratDePacsFile,
                diagnosticsFile,
                titleDeedFile,
                reglementCoproprieteFile,
                cahierChargeLotissementFile,
                statutAssociationSyndicaleFile,
                insuranceOwnerFile,
                ribOwnerFile,
              }}
              setFileStates={{
                setKbisFile,
                setStatutesFile,
                setLivretDeFamilleFile,
                setContratDePacsFile,
                setDiagnosticsFile,
                setTitleDeedFile,
                setReglementCoproprieteFile,
                setCahierChargeLotissementFile,
                setStatutAssociationSyndicaleFile,
                setInsuranceOwnerFile,
                setRibOwnerFile,
              }}
              personDocumentRefs={personDocumentRefs.current}
              personDocumentFiles={personDocumentFiles}
              setPersonDocumentFiles={setPersonDocumentFiles}
              persons={personsWatch || []}
              onUploadStateChange={handleUploadStateChange}
            />
          )}
        </div>

        {/* Hidden file inputs */}
        <input type="file" ref={kbisRef} name="kbis" className="hidden" />
        <input type="file" ref={statutesRef} name="statutes" className="hidden" />
        <input
          type="file"
          ref={livretDeFamilleRef}
          name="livretDeFamille"
          className="hidden"
        />
        <input
          type="file"
          ref={contratDePacsRef}
          name="contratDePacs"
          className="hidden"
        />
        <input
          type="file"
          ref={diagnosticsRef}
          name="diagnostics"
          className="hidden"
        />
        <input
          type="file"
          ref={titleDeedRef}
          name="titleDeed"
          className="hidden"
        />
        <input
          type="file"
          ref={reglementCoproprieteRef}
          name="reglementCopropriete"
          className="hidden"
        />
        <input
          type="file"
          ref={cahierChargeLotissementRef}
          name="cahierChargeLotissement"
          className="hidden"
        />
        <input
          type="file"
          ref={statutAssociationSyndicaleRef}
          name="statutAssociationSyndicale"
          className="hidden"
        />
        <input
          type="file"
          ref={insuranceOwnerRef}
          name="insuranceOwner"
          className="hidden"
        />
        <input type="file" ref={ribOwnerRef} name="ribOwner" className="hidden" />
        {/* Hidden file inputs for persons */}
        {(personsWatch || []).map((_, index) => {
          const refs = personDocumentRefs.current[index];
          if (!refs) return null;
          return (
            <React.Fragment key={index}>
              <input
                type="file"
                ref={refs.birthCert}
                name={`birthCert_${index}`}
                className="hidden"
              />
              <input
                type="file"
                ref={refs.idIdentity}
                name={`idIdentity_${index}`}
                className="hidden"
              />
            </React.Fragment>
          );
        })}

        <div className="p-3 sm:p-4">
          <div className="max-w-3xl mx-auto flex flex-row justify-between gap-3 sm:gap-4">
            <div>
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSubmitting || isSaving || isFileUploading}
                  size="icon"
                  className="h-10 w-10"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Button>
              )}
            </div>
            <div className="flex flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleManualSave}
                disabled={isSubmitting || isSaving || isFileUploading}
                className="sm:w-auto h-10"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    console.log("🟦 [Button Next] onClick - currentStep:", currentStep, "stepId:", STEPS[currentStep]?.id);
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext();
                  }}
                  disabled={isSubmitting || isSaving || isFileUploading}
                  size="icon"
                  className="h-10 w-10"
                >
                  <ArrowRightIcon className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || isSaving || isFileUploading}
                  className="sm:w-auto"
                >
                  {isSubmitting ? "Envoi en cours..." : "Soumettre"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

type ClientTypeStepProps = {
  form: ReturnType<typeof useForm<FormWithPersons>>;
  clientType: ClientType | "";
  onClientTypeChange: (type: ClientType) => void;
  isMobile: boolean;
};

const ClientTypeStep = ({
  form,
  clientType,
  onClientTypeChange,
  isMobile,
}: ClientTypeStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Qui êtes-vous ?</CardTitle>
      <CardDescription>Choisissez votre profil.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-8">
      <div className="space-y-2">
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <RadioGroup
              value={field.value || undefined}
              onValueChange={(value) => {
                const selectedType = value as ClientType;
                field.onChange(selectedType);
                onClientTypeChange(selectedType);
              }}
              className="flex flex-row space-x-3 w-full items-center justify-between"
            >
              <Label
                htmlFor="personnePhysique"
                className={`flex flex-col space-y-2 items-center justify-between border rounded-lg p-5 cursor-pointer hover:bg-accent w-[48%] sm:w-full ${
                  clientType === ClientType.PERSONNE_PHYSIQUE ? "bg-accent" : ""
                }`}
              >
                <RadioGroupItem
                  value={ClientType.PERSONNE_PHYSIQUE}
                  className="hidden"
                  id="personnePhysique"
                />
                <User2 className="size-5 text-muted-foreground" />
                <div className="text-sm font-medium text-center">
                 Particulier
                </div>
              </Label>
              <Label
                htmlFor="personneMorale"
                className={`flex flex-col space-y-2 items-center justify-between border rounded-lg p-5 cursor-pointer hover:bg-accent w-[48%] sm:w-full ${
                  clientType === ClientType.PERSONNE_MORALE ? "bg-accent" : ""
                }`}
              >
                <RadioGroupItem
                  value={ClientType.PERSONNE_MORALE}
                  className="hidden"
                  id="personneMorale"
                />
                <Building2 className="size-5 text-muted-foreground" />
                <div className="text-sm font-medium text-center">
                Entreprise
                </div>
              </Label>
            </RadioGroup>
          )}
        />
        {form.formState.errors.type && (
          <p className="text-sm text-destructive">
            {form.formState.errors.type.message}
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

type ClientInfoStepProps = {
  form: ReturnType<typeof useForm<FormWithPersons>>;
  clientType: ClientType | "";
  personFields: Array<{ id?: string | number }>;
  persons: PersonForm[];
  appendPerson: (value: PersonForm) => void;
  removePerson: (index: number) => Promise<void>;
  isMobile: boolean;
  intakeLink: IntakeLink;
  openAccordionValue: string;
  setOpenAccordionValue: (value: string) => void;
  refreshIntakeLinkData: () => Promise<IntakeLink | null>;
};

const ClientInfoStep = ({
  form,
  clientType,
  personFields,
  appendPerson,
  removePerson,
  isMobile,
  intakeLink,
  openAccordionValue,
  setOpenAccordionValue,
  refreshIntakeLinkData,
}: ClientInfoStepProps) => {
  // Observer le statut familial pour chaque personne
  const watchedFamilyStatuses = personFields.map((_, index) => 
    form.watch(`persons.${index}.familyStatus` as any)
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDeleteIndex, setPersonToDeleteIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const primaryPerson = form.watch("persons")?.find((person) => person.isPrimary);
  const rootEmail = form.watch(`entreprise.email` as any) || primaryPerson?.email || "";
  const rootPhone = form.watch(`entreprise.phone` as any) || primaryPerson?.phone || "";
  const isEmailLocked = !!rootEmail;
  const isPhoneLocked = !rootEmail && !!rootPhone;
  
  // Fonction pour vérifier si une personne a des erreurs
  const hasPersonErrors = (index: number): boolean => {
    const errors = form.formState.errors;
    const personErrors = errors.persons?.[index];
    if (!personErrors) return false;
    return Object.keys(personErrors).length > 0;
  };
  
  // Fonction pour obtenir le message d'erreur principal d'une personne
  const getPersonMainError = (index: number): string | null => {
    const errors = form.formState.errors;
    const personErrors = errors.persons?.[index];
    if (!personErrors) return null;
    
    // Chercher le premier champ avec erreur
    const errorFields = ['firstName', 'lastName', 'email', 'phone', 'fullAddress', 'profession', 'nationality', 'familyStatus', 'birthPlace', 'birthDate'];
    for (const field of errorFields) {
      const fieldError = personErrors[field as keyof typeof personErrors];
      if (fieldError && typeof fieldError === 'object' && 'message' in fieldError) {
        return (fieldError as { message?: string }).message || null;
      }
    }
    return null;
  };

  if (clientType === ClientType.PERSONNE_MORALE) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Informations de l'entreprise</CardTitle>
          <CardDescription>
          Renseignez les informations concernant votre société.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entreprise.legalName">Raison sociale *</Label>
            <Input 
              id="entreprise.legalName" 
              {...form.register("entreprise.legalName" as any)} 
            />
            {form.formState.errors.entreprise?.legalName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.entreprise.legalName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="entreprise.registration">SIREN/SIRET *</Label>
            <Input 
              id="entreprise.registration" 
              {...form.register("entreprise.registration" as any)} 
            />
            {form.formState.errors.entreprise?.registration && (
              <p className="text-sm text-destructive">
                {form.formState.errors.entreprise.registration.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="entreprise.name">Nom commercial *</Label>
            <Input 
              id="entreprise.name" 
              {...form.register("entreprise.name" as any)} 
            />
            {form.formState.errors.entreprise?.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.entreprise.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="entreprise.email">Email *</Label>
            <Input 
              id="entreprise.email" 
              type="email" 
              disabled={isEmailLocked}
              {...form.register("entreprise.email" as any)} 
            />
            {form.formState.errors.entreprise?.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.entreprise.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="entreprise.phone">Téléphone *</Label>
            <Controller
              name={"entreprise.phone" as any}
              control={form.control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value || undefined}
                  onChange={field.onChange}
                  disabled={isPhoneLocked}
                />
              )}
            />
            {form.formState.errors.entreprise?.phone && (
              <p className="text-sm text-destructive">
                {form.formState.errors.entreprise.phone.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="entreprise.fullAddress">Adresse complète *</Label>
            <Textarea 
              id="entreprise.fullAddress" 
              {...form.register("entreprise.fullAddress" as any)} 
            />
            {form.formState.errors.entreprise?.fullAddress && (
              <p className="text-sm text-destructive">
                {form.formState.errors.entreprise.fullAddress.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du ou des propriétaires</CardTitle>
        <CardDescription>
        Renseignez les informations concernant le ou les propriétaires du bien.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Accordion 
          type="single" 
          className="w-full" 
          collapsible
          value={openAccordionValue}
          onValueChange={(value) => setOpenAccordionValue(value || `person-0`)}
        >
          {personFields.map((field, index) => (
            <AccordionItem key={field.id} value={`person-${index}`}>
              <AccordionTrigger className="flex flex-row items-start gap-2 py-4">
                <div className="flex flex-row items-center justify-between w-full pr-4">
                  <div className="flex flex-row items-center gap-4">
                    <div className="flex flex-col items-start ">
                      <div className="flex flex-row items-center gap-2">
                        {form.watch(`persons.${index}.firstName`) && form.watch(`persons.${index}.lastName`) ? form.watch(`persons.${index}.firstName`) + " " + form.watch(`persons.${index}.lastName`) : "Personne " + (index + 1)}
                        {index === 0 && " (Principale)"}
                        {hasPersonErrors(index) && (
                          <AlertCircle className="size-4 text-destructive shrink-0" />
                        )}
                        {
                        index > 0 && (
                            <div
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPersonToDeleteIndex(index);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="size-4 text-red-400" />
                            </div>)
                        }
                      </div>
                      {hasPersonErrors(index) && getPersonMainError(index) && (
                        <p className="text-sm text-destructive w-full text-left pr-4">
                          {getPersonMainError(index)&&"Erreurs détectées."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4  pt-4">
                <div className="grid gap-4 grid-cols-2 ">
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.firstName`}>
                      Prénom *
                    </Label>
                    <Input
                      {...form.register(`persons.${index}.firstName` as any)}
                    />
                    {form.formState.errors.persons?.[index]?.firstName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.firstName?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.lastName`}>
                      Nom *
                    </Label>
                    <Input
                      {...form.register(`persons.${index}.lastName` as any)}
                    />
                    {form.formState.errors.persons?.[index]?.lastName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.lastName?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-2 ">
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.email`}>
                      Email *
                    </Label>
                    <Input
                      type="email"
                      {...form.register(`persons.${index}.email` as any)}
                      disabled={isEmailLocked && index === 0}
                    />
                    {form.formState.errors.persons?.[index]?.email && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.email?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.phone`}>
                      Téléphone *
                    </Label>
                    <Controller
                      name={`persons.${index}.phone` as any}
                      control={form.control}
                      render={({ field }) => (
                        <PhoneInput
                          value={field.value || undefined}
                          onChange={field.onChange}
                          disabled={isPhoneLocked && index === 0}
                        />
                      )}
                    />
                    {form.formState.errors.persons?.[index]?.phone && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.phone?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`persons.${index}.fullAddress`}>
                    Adresse complète *
                  </Label>
                  <Textarea
                    {...form.register(`persons.${index}.fullAddress` as any)}
                  />
                  {form.formState.errors.persons?.[index]?.fullAddress && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.persons[index]?.fullAddress?.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 grid-cols-2 ">
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.profession`}>
                      Profession *
                    </Label>
                    <Input
                      {...form.register(`persons.${index}.profession` as any)}
                    />
                    {form.formState.errors.persons?.[index]?.profession && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.profession?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.nationality`}>
                      Nationalité *
                    </Label>
                    <Controller
                      name={`persons.${index}.nationality` as any}
                      control={form.control}
                      render={({ field }) => (
                        <NationalitySelect
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                    {form.formState.errors.persons?.[index]?.nationality && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.nationality?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className={`grid gap-4 ${watchedFamilyStatuses[index] === FamilyStatus.MARIE ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.familyStatus`}>
                      Statut familial *
                    </Label>
                    <Controller
                      name={`persons.${index}.familyStatus` as any}
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          value={field.value ?? undefined}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Réinitialiser le régime matrimonial si le statut change et n'est plus MARIE
                            if (value !== FamilyStatus.MARIE) {
                              form.setValue(`persons.${index}.matrimonialRegime` as any, undefined);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(FamilyStatus).map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.persons?.[index]?.familyStatus && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.familyStatus?.message}
                      </p>
                    )}
                  </div>
                  {watchedFamilyStatuses[index] === FamilyStatus.MARIE && (
                    <div className="space-y-2">
                      <Label htmlFor={`persons.${index}.matrimonialRegime`}>
                        Régime matrimonial *
                      </Label>
                      <Controller
                        name={`persons.${index}.matrimonialRegime` as any}
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? undefined}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(MatrimonialRegime).map((regime) => (
                                <SelectItem key={regime} value={regime}>
                                  {regime.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.persons?.[index]?.matrimonialRegime && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.persons[index]?.matrimonialRegime?.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 grid-cols-2 ">
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.birthPlace`}>
                      Lieu de naissance *
                    </Label>
                    <Input
                      {...form.register(`persons.${index}.birthPlace` as any)}
                    />
                    {form.formState.errors.persons?.[index]?.birthPlace && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.birthPlace?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`persons.${index}.birthDate`}>
                      Date de naissance *
                    </Label>
                    <Controller
                      name={`persons.${index}.birthDate` as any}
                      control={form.control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value ? toDateValue(field.value as any) : undefined}
                          onChange={(val) =>
                            field.onChange(toDateValue(val as any) || undefined)
                          }
                        />
                      )}
                    />
                    {form.formState.errors.persons?.[index]?.birthDate && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.persons[index]?.birthDate?.message}
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {personFields.length < 2 && <Button
          type="button"
          variant="outline"
          onClick={() => {
            appendPerson({ ...emptyPerson } as any);
            // Ouvrir l'accordéon de la nouvelle personne ajoutée
            const newIndex = personFields.length;
            setOpenAccordionValue(`person-${newIndex}`);
          }}
          className="w-full"
        >
          Ajouter une personne
        </Button>}
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              {personToDeleteIndex !== null && (() => {
                const person = form.watch(`persons.${personToDeleteIndex}` as any);
                const personName = person?.firstName && person?.lastName 
                  ? `${person.firstName} ${person.lastName}`
                  : person?.email || "Cette personne";
                const personEmail = person?.email;
                
                // Vérifier si la personne existe dans la DB (dans intakeLink ou par email)
                const existingPerson = intakeLink.client?.persons?.find(
                  (p: any) => {
                    if (!p.email || !personEmail) return false;
                    return p.email.toLowerCase() === personEmail.toLowerCase() && !p.isPrimary;
                  }
                );
                
                // Si la personne a un email, on suppose qu'elle peut être en DB
                // (même si elle n'est pas encore dans intakeLink.client?.persons)
                const mightExistInDb = personEmail && personEmail.trim() !== "";
                
                return (existingPerson || mightExistInDb)
                  ? `Êtes-vous sûr de vouloir supprimer ${personName} ? Cette personne sera supprimée de vos données.`
                  : `Êtes-vous sûr de vouloir supprimer ${personName} ?`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setPersonToDeleteIndex(null);
              }}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (personToDeleteIndex === null) return;
              
                setIsDeleting(true);
                try {
                  // Supprimer la personne du formulaire ET du raw.payload immédiatement
                  await removePerson(personToDeleteIndex);
              
                  toast.success("Personne supprimée");
                  setDeleteDialogOpen(false);
                  setPersonToDeleteIndex(null);
                } catch (error: any) {
                  console.error("Erreur lors de la suppression:", error);
                  toast.error(
                    error?.message || "Erreur lors de la suppression de la personne"
                  );
                } finally {
                  setIsDeleting(false);
                }
              }}
              
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};


type SummaryStepProps = {
  values: FormWithPersons;
  clientType: ClientType | "";
};

const SummaryStep = ({ values, clientType }: SummaryStepProps) => {
  const persons = values.persons || [];
  const [openAccordionValue, setOpenAccordionValue] = useState<string>("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Récapitulatif</CardTitle>
        <CardDescription>
          Vérifiez les informations avant de continuer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion 
          type="single" 
          className="w-full" 
          collapsible
          value={openAccordionValue}
          onValueChange={(value) => setOpenAccordionValue(value || "")}
        >
          {/* Afficher l'entreprise si elle existe */}
          {values.entreprise && (
            <AccordionItem value="entreprise" className="border rounded-md">
              <AccordionTrigger className="px-4 py-3">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex flex-col items-start">
                    <div className="font-semibold text-base">
                      Entreprise
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {values.entreprise.legalName || values.entreprise.name || "Entreprise"}
                      {values.entreprise.email && ` • ${values.entreprise.email}`}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                  <div>
                    <span className="text-muted-foreground">Raison sociale</span>
                    <div className="font-medium">{values.entreprise.legalName || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SIREN/SIRET</span>
                    <div className="font-medium">{values.entreprise.registration || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nom commercial</span>
                    <div className="font-medium">{values.entreprise.name || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <div className="font-medium">{values.entreprise.email || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Téléphone</span>
                    <div className="font-medium">{values.entreprise.phone || "-"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Adresse</span>
                    <div className="font-medium">{values.entreprise.fullAddress || "-"}</div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Afficher toutes les personnes */}
          {persons.map((person, index) => (
            <AccordionItem 
              key={`person-${index}`} 
              value={`person-${index}`}
              className=" border last:border-b overflow-hidden rounded-md"
            >
              <AccordionTrigger className="px-4 py-3 rounded-md">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex flex-col items-start">
                    <div className="font-semibold text-base">
                      {index === 0 ? "Personne principale" : `Personne ${index + 1}`}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {person.firstName && person.lastName 
                        ? `${person.firstName} ${person.lastName}`
                        : "Personne sans nom"}
                      {person.email && ` • ${person.email}`}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                  <div>
                    <span className="text-muted-foreground">Prénom</span>
                    <div className="font-medium">{person.firstName || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nom</span>
                    <div className="font-medium">{person.lastName || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <div className="font-medium">{person.email || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Téléphone</span>
                    <div className="font-medium">{person.phone || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profession</span>
                    <div className="font-medium">{person.profession || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nationalité</span>
                    <div className="font-medium">{person.nationality || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Statut familial</span>
                    <div className="font-medium">
                      {person.familyStatus?.replace(/_/g, " ") || "-"}
                    </div>
                  </div>
                  {person.matrimonialRegime && (
                    <div>
                      <span className="text-muted-foreground">Régime matrimonial</span>
                      <div className="font-medium">{person.matrimonialRegime}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Lieu de naissance</span>
                    <div className="font-medium">{person.birthPlace || "-"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date de naissance</span>
                    <div className="font-medium">
                      {person.birthDate
                        ? formatDateToLocalString(new Date(person.birthDate))
                        : "-"}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Adresse</span>
                    <div className="font-medium">{person.fullAddress || "-"}</div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

type PropertyStepProps = {
  form: ReturnType<typeof useForm<FormWithPersons>>;
  isMobile: boolean;
};

const PropertyStep = ({ form, isMobile }: PropertyStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Informations du bien</CardTitle>
      <CardDescription>
        Remplissez les informations en rapport avec le bien.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="propertyLabel">Libellé</Label>
        <Input id="propertyLabel" {...form.register("propertyLabel")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="propertyFullAddress">Adresse complète du bien *</Label>
        <Textarea id="propertyFullAddress" {...form.register("propertyFullAddress")} />
        {form.formState.errors.propertyFullAddress && (
          <p className="text-sm text-destructive">
            {form.formState.errors.propertyFullAddress.message}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2">
            <Label htmlFor="propertyType">Type d'habitat *</Label>
            <InfoTooltip
              content={<p>Une maison est un immeuble individuel</p>}
              className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}
            >
              <button type="button" className="inline-flex items-center">
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </InfoTooltip>
          </div>
          <Controller
            name="propertyType"
            control={form.control}
            render={({ field }) => (
              <RadioGroup
                value={field.value || undefined}
                onValueChange={(value) => field.onChange(value as BienType)}
                className="flex flex-row space-x-3 w-full items-center justify-between "
              >
                <Label
                  htmlFor="appartement"
                  className={`flex flex-col space-y-2 items-center justify-between border rounded-lg p-5 cursor-pointer hover:bg-accent w-[48%] sm:w-full ${
                    field.value === BienType.APPARTEMENT ? "bg-accent" : ""
                  }`}
                >
                  <RadioGroupItem
                    value={BienType.APPARTEMENT}
                    className="hidden"
                    id="appartement"
                  />
                  <Building2 className="size-5 text-muted-foreground" />
                  <div className="text-sm font-medium text-center">
                    Immeuble {isMobile ? <br /> : ""} collectif
                  </div>
                </Label>

                <Label
                  htmlFor="maison"
                  className={`flex flex-col space-y-2 items-center justify-between border rounded-lg p-5 cursor-pointer hover:bg-accent w-[48%] sm:w-full ${
                    field.value === BienType.MAISON ? "bg-accent" : ""
                  }`}
                >
                  <RadioGroupItem
                    value={BienType.MAISON}
                    className="hidden"
                    id="maison"
                  />
                  <Building className="size-5 text-muted-foreground" />
                  <div className="text-sm font-medium text-center">
                    Immeuble {isMobile ? <br /> : ""} individuel
                  </div>
                </Label>
              </RadioGroup>
            )}
          />
          {form.formState.errors.propertyType && (
            <p className="text-sm text-destructive">
              {form.formState.errors.propertyType.message}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-2 ">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="propertySurfaceM2">Surface *</Label>
            <InfoTooltip
              content={<p>Surface privative selon diagnostic Loi Carrez</p>}
              className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}
            >
              <button type="button" className="inline-flex items-center">
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </InfoTooltip>
          </div>
          <NumberInputGroup
            field={form.register("propertySurfaceM2")}
            min={0}
            unit="m²"
            step={0.01}
            isDecimal
          />
          {form.formState.errors.propertySurfaceM2 && (
            <p className="text-sm text-destructive">
              {form.formState.errors.propertySurfaceM2.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="propertyLegalStatus">Régime juridique *</Label>
          <Controller
            name="propertyLegalStatus"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner le régime juridique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BienLegalStatus.PLEIN_PROPRIETE}>
                    Monopropriété
                  </SelectItem>
                  <SelectItem value={BienLegalStatus.CO_PROPRIETE}>
                    Copropriété
                  </SelectItem>
                  <SelectItem value={BienLegalStatus.LOTISSEMENT}>
                    Lotissement
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.propertyLegalStatus && (
            <p className="text-sm text-destructive">
              {form.formState.errors.propertyLegalStatus.message}
            </p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

type BailStepProps = {
  form: ReturnType<typeof useForm<FormWithPersons>>;
};

const BailStep = ({ form }: BailStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Informations du bail</CardTitle>
      <CardDescription>Renseignez les paramètres du bail.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bailType">Type de bail *</Label>
        <Controller
          name="bailType"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value ?? undefined} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BailType.BAIL_NU_3_ANS}>Bail nu 3 ans</SelectItem>
                <SelectItem value={BailType.BAIL_NU_6_ANS}>
                  Bail nu 6 ans (SCI)
                </SelectItem>
                <SelectItem value={BailType.BAIL_MEUBLE_1_ANS}>
                  Bail meublé 1 an
                </SelectItem>
                <SelectItem value={BailType.BAIL_MEUBLE_9_MOIS}>
                  Bail étudiant (9 mois)
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.bailType && (
          <p className="text-sm text-destructive">
            {form.formState.errors.bailType.message}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <div className="space-y-2">
          <Label>Loyer mensuel *</Label>
          <NumberInputGroup
            field={form.register("bailRentAmount")}
            min={0}
            step={1}
            unit="€"
          />
          {form.formState.errors.bailRentAmount && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bailRentAmount.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Charges mensuelles *</Label>
          <NumberInputGroup
            field={form.register("bailMonthlyCharges")}
            min={0}
            step={1}
            unit="€"
          />
          {form.formState.errors.bailMonthlyCharges && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bailMonthlyCharges.message}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <div className="space-y-2">
          <Label>Dépôt de garantie *</Label>
          <NumberInputGroup
            field={form.register("bailSecurityDeposit")}
            min={0}
            step={1}
            unit="€"
          />
          {form.formState.errors.bailSecurityDeposit && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bailSecurityDeposit.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Jour de paiement *</Label>
          <NumberInputGroup
            field={form.register("bailPaymentDay")}
            min={1}
            max={28}
            step={1}
          />
          {form.formState.errors.bailPaymentDay && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bailPaymentDay.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2">
        <div className="space-y-2">
          <Label>Date de prise d'effet *</Label>
          <Controller
            name="bailEffectiveDate"
            control={form.control}
            render={({ field }) => (
              <DatePicker
                value={field.value ? toDateValue(field.value as any) : undefined}
                onChange={(val) => field.onChange(toDateValue(val as any) || "")}
              />
            )}
          />
          {form.formState.errors.bailEffectiveDate && (
            <p className="text-sm text-destructive">
              {form.formState.errors.bailEffectiveDate.message as string}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Date de fin (optionnel)</Label>
          <Controller
            name="bailEndDate"
            control={form.control}
            render={({ field }) => (
              <DatePicker
                value={field.value ? toDateValue(field.value as any) : undefined}
                onChange={(val) => field.onChange(toDateValue(val as any) || "")}
              />
            )}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

type TenantStepProps = {
  form: ReturnType<typeof useForm<FormWithPersons>>;
};

const TenantStep = ({ form }: TenantStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Locataire</CardTitle>
      <CardDescription>
        Ajoutez l'email du locataire principal pour pouvoir l'inviter.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tenantEmail">Email du locataire *</Label>
        <Input id="tenantEmail" {...form.register("tenantEmail")} />
        {form.formState.errors.tenantEmail && (
          <p className="text-sm text-destructive">
            {form.formState.errors.tenantEmail.message as string}
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

type DocumentsStepProps = {
  form: ReturnType<typeof useForm<FormWithPersons>>;
  clientType: ClientType | "";
  intakeLink: IntakeLink;
  fileRefs: {
    kbisRef: RefObject<HTMLInputElement>;
    statutesRef: RefObject<HTMLInputElement>;
    livretDeFamilleRef: RefObject<HTMLInputElement>;
    contratDePacsRef: RefObject<HTMLInputElement>;
    diagnosticsRef: RefObject<HTMLInputElement>;
    titleDeedRef: RefObject<HTMLInputElement>;
    reglementCoproprieteRef: RefObject<HTMLInputElement>;
    cahierChargeLotissementRef: RefObject<HTMLInputElement>;
    statutAssociationSyndicaleRef: RefObject<HTMLInputElement>;
    insuranceOwnerRef: RefObject<HTMLInputElement>;
    ribOwnerRef: RefObject<HTMLInputElement>;
  };
  fileStates: {
    kbisFile: File | null;
    statutesFile: File | null;
    livretDeFamilleFile: File | null;
    contratDePacsFile: File | null;
    diagnosticsFile: File | null;
    titleDeedFile: File | null;
    reglementCoproprieteFile: File | null;
    cahierChargeLotissementFile: File | null;
    statutAssociationSyndicaleFile: File | null;
    insuranceOwnerFile: File | null;
    ribOwnerFile: File | null;
  };
  setFileStates: {
    setKbisFile: (file: File | null) => void;
    setStatutesFile: (file: File | null) => void;
    setLivretDeFamilleFile: (file: File | null) => void;
    setContratDePacsFile: (file: File | null) => void;
    setDiagnosticsFile: (file: File | null) => void;
    setTitleDeedFile: (file: File | null) => void;
    setReglementCoproprieteFile: (file: File | null) => void;
    setCahierChargeLotissementFile: (file: File | null) => void;
    setStatutAssociationSyndicaleFile: (file: File | null) => void;
    setInsuranceOwnerFile: (file: File | null) => void;
    setRibOwnerFile: (file: File | null) => void;
  };
  personDocumentRefs: Record<number, { birthCert: RefObject<HTMLInputElement | null>; idIdentity: RefObject<HTMLInputElement | null> }>;
  personDocumentFiles: Record<number, { birthCert: File | null; idIdentity: File | null }>;
  setPersonDocumentFiles: React.Dispatch<React.SetStateAction<Record<number, { birthCert: File | null; idIdentity: File | null }>>>;
  persons: any[];
  onUploadStateChange?: (isUploading: boolean) => void;
};

const DocumentsStep = ({
  form,
  clientType,
  intakeLink,
  fileRefs,
  fileStates,
  setFileStates,
  personDocumentRefs,
  personDocumentFiles,
  setPersonDocumentFiles,
  persons,
  onUploadStateChange,
}: DocumentsStepProps) => {
  // Fonction helper pour vérifier si une personne a un document
  const hasPersonDocument = (personIndex: number, kind: string): boolean => {
    const person = intakeLink.client?.persons?.[personIndex];
    if (!person) return false;
    const personDocs = person.documents || [];
    return personDocs.some((d: any) => d.kind === kind);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pièces jointes</CardTitle>
        <CardDescription>Ajoutez les documents obligatoires.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documents client *</h3>
          {clientType === ClientType.PERSONNE_MORALE ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <DocumentUploaded token={intakeLink.token} documentKind="KBIS">
                <FileUpload
                  label="KBIS *"
                  value={fileStates.kbisFile}
                  onChange={(file) => {
                    setFileStates.setKbisFile(file);
                    if (fileRefs.kbisRef.current) {
                      const dt = new DataTransfer();
                      if (file) dt.items.add(file);
                      fileRefs.kbisRef.current.files = dt.files;
                    }
                  }}
                  uploadToken={intakeLink.token}
                  documentKind="KBIS"
                  clientId={intakeLink.clientId}
                  onUploadStateChange={onUploadStateChange}
                />
              </DocumentUploaded>
              <DocumentUploaded token={intakeLink.token} documentKind="STATUTES">
                <FileUpload
                  label="Statuts *"
                  value={fileStates.statutesFile}
                  onChange={(file) => {
                    setFileStates.setStatutesFile(file);
                    if (fileRefs.statutesRef.current) {
                      const dt = new DataTransfer();
                      if (file) dt.items.add(file);
                      fileRefs.statutesRef.current.files = dt.files;
                    }
                  }}
                  uploadToken={intakeLink.token}
                  documentKind="STATUTES"
                  clientId={intakeLink.clientId}
                  onUploadStateChange={onUploadStateChange}
                />
              </DocumentUploaded>
            </div>
          ) : (
            <>
              {/* Documents pour chaque personne */}
              {persons.map((person, index) => {
                const personName = person.firstName && person.lastName
                  ? `${person.firstName} ${person.lastName}`
                  : `Personne ${index + 1}`;
                const personRefs = personDocumentRefs[index];
                const personFiles = personDocumentFiles[index] || { birthCert: null, idIdentity: null };
                
                return (
                  <div key={index} className="space-y-4 border rounded-lg p-4">
                    <h4 className="text-md font-medium">
                      Documents de {personName} {index === 0 && "(Principale)"} *
                    </h4>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                      <DocumentUploaded 
                        token={intakeLink.token} 
                        documentKind="BIRTH_CERT"
                        personIndex={index}
                      >
                        <FileUpload
                          label="Acte de naissance *"
                          value={personFiles.birthCert}
                          onChange={(file) => {
                            setPersonDocumentFiles(prev => ({
                              ...prev,
                              [index]: { ...prev[index], birthCert: file }
                            }));
                            if (personRefs?.birthCert.current) {
                              const dt = new DataTransfer();
                              if (file) dt.items.add(file);
                              personRefs.birthCert.current.files = dt.files;
                            }
                          }}
                          uploadToken={intakeLink.token}
                          documentKind="BIRTH_CERT"
                          clientId={intakeLink.clientId}
                          personIndex={index}
                          onUploadStateChange={onUploadStateChange}
                        />
                      </DocumentUploaded>
                      <DocumentUploaded 
                        token={intakeLink.token} 
                        documentKind="ID_IDENTITY"
                        personIndex={index}
                      >
                        <FileUpload
                          label="Pièce d'identité *"
                          value={personFiles.idIdentity}
                          onChange={(file) => {
                            setPersonDocumentFiles(prev => ({
                              ...prev,
                              [index]: { ...prev[index], idIdentity: file }
                            }));
                            if (personRefs?.idIdentity.current) {
                              const dt = new DataTransfer();
                              if (file) dt.items.add(file);
                              personRefs.idIdentity.current.files = dt.files;
                            }
                          }}
                          uploadToken={intakeLink.token}
                          documentKind="ID_IDENTITY"
                          clientId={intakeLink.clientId}
                          personIndex={index}
                          onUploadStateChange={onUploadStateChange}
                        />
                      </DocumentUploaded>
                    </div>
                  </div>
                );
              })}
              
              {/* Documents communs au client (livret de famille, PACS) */}
              {persons.length > 0 && (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                  {form.watch(`persons.0.familyStatus`) === FamilyStatus.MARIE && (
                    <DocumentUploaded
                      token={intakeLink.token}
                      documentKind="LIVRET_DE_FAMILLE"
                    >
                      <FileUpload
                        label="Livret de famille *"
                        value={fileStates.livretDeFamilleFile}
                        onChange={(file) => {
                          setFileStates.setLivretDeFamilleFile(file);
                          if (fileRefs.livretDeFamilleRef.current) {
                            const dt = new DataTransfer();
                            if (file) dt.items.add(file);
                            fileRefs.livretDeFamilleRef.current.files = dt.files;
                          }
                        }}
                        uploadToken={intakeLink.token}
                        documentKind="LIVRET_DE_FAMILLE"
                        clientId={intakeLink.clientId}
                        onUploadStateChange={onUploadStateChange}
                      />
                    </DocumentUploaded>
                  )}
                  {form.watch(`persons.0.familyStatus`) === FamilyStatus.PACS && (
                    <DocumentUploaded
                      token={intakeLink.token}
                      documentKind="CONTRAT_DE_PACS"
                    >
                      <FileUpload
                        label="Contrat de PACS *"
                        value={fileStates.contratDePacsFile}
                        onChange={(file) => {
                          setFileStates.setContratDePacsFile(file);
                          if (fileRefs.contratDePacsRef.current) {
                            const dt = new DataTransfer();
                            if (file) dt.items.add(file);
                            fileRefs.contratDePacsRef.current.files = dt.files;
                          }
                        }}
                        uploadToken={intakeLink.token}
                        documentKind="CONTRAT_DE_PACS"
                        clientId={intakeLink.clientId}
                        onUploadStateChange={onUploadStateChange}
                      />
                    </DocumentUploaded>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Documents du bien et du bail</h3>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          <DocumentUploaded token={intakeLink.token} documentKind="INSURANCE">
            <FileUpload
              label="Assurance propriétaire *"
              value={fileStates.insuranceOwnerFile}
              onChange={(file) => {
                setFileStates.setInsuranceOwnerFile(file);
                if (fileRefs.insuranceOwnerRef.current) {
                  const dt = new DataTransfer();
                  if (file) dt.items.add(file);
                  fileRefs.insuranceOwnerRef.current.files = dt.files;
                }
              }}
              uploadToken={intakeLink.token}
              documentKind="INSURANCE"
              clientId={intakeLink.clientId}
              onUploadStateChange={onUploadStateChange}
            />
          </DocumentUploaded>
          <DocumentUploaded token={intakeLink.token} documentKind="RIB">
            <FileUpload
              label="RIB signé propriétaire *"
              value={fileStates.ribOwnerFile}
              onChange={(file) => {
                setFileStates.setRibOwnerFile(file);
                if (fileRefs.ribOwnerRef.current) {
                  const dt = new DataTransfer();
                  if (file) dt.items.add(file);
                  fileRefs.ribOwnerRef.current.files = dt.files;
                }
              }}
              uploadToken={intakeLink.token}
              documentKind="RIB"
              clientId={intakeLink.clientId}
              onUploadStateChange={onUploadStateChange}
            />
          </DocumentUploaded>
          <DocumentUploaded token={intakeLink.token} documentKind="DIAGNOSTICS">
            <FileUpload
              label="Diagnostics *"
              value={fileStates.diagnosticsFile}
              onChange={(file) => {
                setFileStates.setDiagnosticsFile(file);
                if (fileRefs.diagnosticsRef.current) {
                  const dt = new DataTransfer();
                  if (file) dt.items.add(file);
                  fileRefs.diagnosticsRef.current.files = dt.files;
                }
              }}
              uploadToken={intakeLink.token}
              documentKind="DIAGNOSTICS"
              clientId={intakeLink.clientId}
              onUploadStateChange={onUploadStateChange}
            />
          </DocumentUploaded>
          <DocumentUploaded token={intakeLink.token} documentKind="TITLE_DEED">
            <FileUpload
              label="Titre de propriété *"
              value={fileStates.titleDeedFile}
              onChange={(file) => {
                setFileStates.setTitleDeedFile(file);
                if (fileRefs.titleDeedRef.current) {
                  const dt = new DataTransfer();
                  if (file) dt.items.add(file);
                  fileRefs.titleDeedRef.current.files = dt.files;
                }
              }}
              uploadToken={intakeLink.token}
              documentKind="TITLE_DEED"
              clientId={intakeLink.clientId}
              onUploadStateChange={onUploadStateChange}
            />
          </DocumentUploaded>
          {form.watch("propertyLegalStatus") === BienLegalStatus.CO_PROPRIETE && (
            <DocumentUploaded
              token={intakeLink.token}
              documentKind="REGLEMENT_COPROPRIETE"
            >
              <FileUpload
                label="Règlement de copropriété *"
                value={fileStates.reglementCoproprieteFile}
                onChange={(file) => {
                  setFileStates.setReglementCoproprieteFile(file);
                  if (fileRefs.reglementCoproprieteRef.current) {
                    const dt = new DataTransfer();
                    if (file) dt.items.add(file);
                    fileRefs.reglementCoproprieteRef.current.files = dt.files;
                  }
                }}
                uploadToken={intakeLink.token}
                documentKind="REGLEMENT_COPROPRIETE"
                clientId={intakeLink.clientId}
                onUploadStateChange={onUploadStateChange}
              />
            </DocumentUploaded>
          )}
          {form.watch("propertyLegalStatus") === BienLegalStatus.LOTISSEMENT && (
            <>
              <DocumentUploaded
                token={intakeLink.token}
                documentKind="CAHIER_DE_CHARGE_LOTISSEMENT"
              >
                <FileUpload
                  label="Cahier des charges lotissement *"
                  value={fileStates.cahierChargeLotissementFile}
                  onChange={(file) => {
                    setFileStates.setCahierChargeLotissementFile(file);
                    if (fileRefs.cahierChargeLotissementRef.current) {
                      const dt = new DataTransfer();
                      if (file) dt.items.add(file);
                      fileRefs.cahierChargeLotissementRef.current.files = dt.files;
                    }
                  }}
                  uploadToken={intakeLink.token}
                  documentKind="CAHIER_DE_CHARGE_LOTISSEMENT"
                  clientId={intakeLink.clientId}
                  onUploadStateChange={onUploadStateChange}
                />
              </DocumentUploaded>
              <DocumentUploaded
                token={intakeLink.token}
                documentKind="STATUT_DE_LASSOCIATION_SYNDICALE"
              >
                <FileUpload
                  label="Statut de l'association syndicale *"
                  value={fileStates.statutAssociationSyndicaleFile}
                  onChange={(file) => {
                    setFileStates.setStatutAssociationSyndicaleFile(file);
                    if (fileRefs.statutAssociationSyndicaleRef.current) {
                      const dt = new DataTransfer();
                      if (file) dt.items.add(file);
                      fileRefs.statutAssociationSyndicaleRef.current.files = dt.files;
                    }
                  }}
                  uploadToken={intakeLink.token}
                  documentKind="STATUT_DE_LASSOCIATION_SYNDICALE"
                  clientId={intakeLink.clientId}
                  onUploadStateChange={onUploadStateChange}
                />
              </DocumentUploaded>
            </>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
  );
};
