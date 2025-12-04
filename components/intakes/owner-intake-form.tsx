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
  rawPayload?: Partial<OwnerFormData>;
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
};

type EntrepriseForm = {
  legalName: string;
  registration: string;
  name: string;
  email: string;
  phone: string;
  fullAddress: string;
};

type FormWithPersons = OwnerFormData & { 
  persons: PersonForm[];
  entreprise?: EntrepriseForm;
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
};

const buildDefaultValues = (intakeLink: IntakeLink): FormWithPersons => {
  const client = intakeLink.client;
  const property = intakeLink.property;
  const bail = intakeLink.bail;
  const raw = (intakeLink.rawPayload || {}) as Partial<FormWithPersons>;
  const hasRaw = raw && Object.keys(raw).length > 0;

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
  });

  const clientType: ClientType | "" =
    (raw.type as ClientType | "") ||
    (client?.type as ClientType | "") ||
    "";

  const primaryRawPerson = Array.isArray(raw.persons) ? raw.persons[0] : undefined;
  const rawEntreprise = raw.entreprise as any;

  // 👇 Mail / téléphone "racine" : ce sont EUX la source de vérité côté front
  const rootEmail =
    (raw.email as string | undefined) ??
    (rawEntreprise?.email as string | undefined) ??
    (primaryRawPerson?.email as string | undefined) ??
    (client?.entreprise?.email as string | undefined) ??
    (client?.persons?.[0]?.email as string | undefined) ??
    (client?.email as string | undefined) ??
    "";

  const rootPhone =
    (raw.phone as string | undefined) ??
    (rawEntreprise?.phone as string | undefined) ??
    (primaryRawPerson?.phone as string | undefined) ??
    (client?.entreprise?.phone as string | undefined) ??
    (client?.persons?.[0]?.phone as string | undefined) ??
    (client?.phone as string | undefined) ??
    "";

  // Locataire éventuel
  const tenantParty = bail?.parties?.find(
    (party: any) => party.profilType === ProfilType.LOCATAIRE
  );
  const tenantEmailFromDb =
    tenantParty?.persons?.find((p: any) => p.isPrimary)?.email ||
    tenantParty?.persons?.[0]?.email ||
    "";
  const tenantEmail = raw.tenantEmail ?? tenantEmailFromDb ?? "";

  // Bien
  const propertyLabel = raw.propertyLabel ?? property?.label ?? "";
  const propertyFullAddress =
    raw.propertyFullAddress ?? property?.fullAddress ?? "";
  const propertySurfaceM2 =
    raw.propertySurfaceM2?.toString() ??
    property?.surfaceM2?.toString() ??
    "";
  const propertyType =
    raw.propertyType ?? property?.type ?? undefined;
  const propertyLegalStatus =
    raw.propertyLegalStatus ?? property?.legalStatus ?? undefined;
  const propertyStatus =
    raw.propertyStatus ?? property?.status ?? PropertyStatus.NON_LOUER;

  // Bail
  const bailFamily =
    raw.bailFamily ?? bail?.bailFamily ?? BailFamille.HABITATION;
  const bailType =
    raw.bailType ?? bail?.bailType ?? BailType.BAIL_NU_3_ANS;
  const bailRentAmount =
    raw.bailRentAmount?.toString() ??
    bail?.rentAmount?.toString() ??
    "";
  const bailMonthlyCharges =
    raw.bailMonthlyCharges?.toString() ??
    bail?.monthlyCharges?.toString() ??
    "";
  const bailSecurityDeposit =
    raw.bailSecurityDeposit?.toString() ??
    bail?.securityDeposit?.toString() ??
    "";
  const bailPaymentDay =
    raw.bailPaymentDay?.toString() ??
    bail?.paymentDay?.toString() ??
    "";

  const bailEffectiveDate =
    (toDateValue(raw.bailEffectiveDate as any) ??
      (bail?.effectiveDate
        ? toDateValue(bail.effectiveDate)
        : EMPTY_STRING_DATE) ??
      EMPTY_STRING_DATE) as any;

  const bailEndDate =
    (toDateValue(raw.bailEndDate as any) ??
      (bail?.endDate ? toDateValue(bail.endDate) : undefined)) as any;

  // ---------- 1) CAS RAW + ENTREPRISE (PERSONNE_MORALE) ----------
  if (hasRaw && clientType === ClientType.PERSONNE_MORALE) {
    const entrepriseRaw = (raw.entreprise || {}) as Partial<EntrepriseForm>;

    const entreprise: EntrepriseForm = {
      legalName:
        entrepriseRaw.legalName ??
        client?.entreprise?.legalName ??
        "",
      registration:
        entrepriseRaw.registration ??
        client?.entreprise?.registration ??
        "",
      name:
        entrepriseRaw.name ??
        client?.entreprise?.name ??
        entrepriseRaw.legalName ??
        "",
      // ⬇️ Toujours initialisé par le mail / téléphone racine
      email: rootEmail,
      phone: rootPhone,
      fullAddress:
        entrepriseRaw.fullAddress ??
        client?.entreprise?.fullAddress ??
        "",
    };

    const persons = Array.isArray(raw.persons)
      ? raw.persons.map(mapToPersonForm)
      : [];

    return {
      clientId: intakeLink.clientId,
      type: clientType,
      email: rootEmail,
      phone: rootPhone,
      persons: persons as any,
      entreprise,
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
      // Locataire
      tenantEmail,
    } as FormWithPersons;
  }

  // ---------- 2) CAS RAW (PERSONNE_PHYSIQUE ou type vide) ----------
  if (hasRaw) {
    const primaryPerson = client?.persons?.find((p: any) => p.isPrimary);

    let rawPersonsSource: any[] =
      Array.isArray(raw.persons) && raw.persons.length > 0
        ? raw.persons
        : [
            {
              firstName: primaryPerson?.firstName ?? "",
              lastName: primaryPerson?.lastName ?? "",
              // ⬇️ On part du mail / téléphone racine
              email: rootEmail,
              phone: rootPhone,
              fullAddress: primaryPerson?.fullAddress ?? "",
              profession: primaryPerson?.profession ?? "",
              nationality: primaryPerson?.nationality ?? "",
              familyStatus: primaryPerson?.familyStatus,
              matrimonialRegime: primaryPerson?.matrimonialRegime,
              birthPlace: primaryPerson?.birthPlace ?? "",
              birthDate: primaryPerson?.birthDate ?? undefined,
            },
          ];

    const persons = rawPersonsSource.map(mapToPersonForm);

    // Forcer la personne principale à suivre le mail / téléphone racine
    if (persons.length === 0) {
      persons.push({ ...emptyPerson, email: rootEmail, phone: rootPhone });
    } else {
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
      entreprise: (raw.entreprise as any) ?? undefined,
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
      // Locataire
      tenantEmail,
    } as FormWithPersons;
  }

  // ---------- 3.a DB SANS RAW : PERSONNE_MORALE ----------
  if (clientType === ClientType.PERSONNE_MORALE) {
    const entreprise: EntrepriseForm = {
      legalName: client?.entreprise?.legalName ?? "",
      registration: client?.entreprise?.registration ?? "",
      name:
        client?.entreprise?.name ??
        client?.entreprise?.legalName ??
        "",
      email: rootEmail,
      phone: rootPhone,
      fullAddress: client?.entreprise?.fullAddress ?? "",
    };

    return {
      clientId: intakeLink.clientId,
      type: clientType,
      email: rootEmail,
      phone: rootPhone,
      persons: [],
      entreprise,
      // Bien
      propertyLabel: property?.label ?? "",
      propertyFullAddress: property?.fullAddress ?? "",
      propertySurfaceM2: property?.surfaceM2?.toString() ?? "",
      propertyType: property?.type ?? undefined,
      propertyLegalStatus: property?.legalStatus ?? undefined,
      propertyStatus: property?.status ?? PropertyStatus.NON_LOUER,
      // Bail
      bailType: bail?.bailType ?? BailType.BAIL_NU_3_ANS,
      bailFamily: bail?.bailFamily ?? BailFamille.HABITATION,
      bailRentAmount: bail?.rentAmount?.toString() ?? "",
      bailEffectiveDate: bail?.effectiveDate
        ? (toDateValue(bail.effectiveDate) as any)
        : (EMPTY_STRING_DATE as any),
      bailEndDate: bail?.endDate
        ? (toDateValue(bail.endDate) as any)
        : ("" as any),
      bailMonthlyCharges: bail?.monthlyCharges?.toString() ?? "",
      bailSecurityDeposit: bail?.securityDeposit?.toString() ?? "",
      bailPaymentDay: bail?.paymentDay?.toString() ?? "",
      // Locataire
      tenantEmail,
    } as FormWithPersons;
  }

  // ---------- 3.b DB SANS RAW : PERSONNE_PHYSIQUE ----------
  const dbPersons = client?.persons || [];
  let personsFromDb: PersonForm[] =
    dbPersons.length > 0
      ? dbPersons.map(mapToPersonForm)
      : [emptyPerson];

  if (personsFromDb.length === 0) {
    personsFromDb = [{ ...emptyPerson, email: rootEmail, phone: rootPhone }];
  } else {
    personsFromDb[0] = {
      ...personsFromDb[0],
      email: rootEmail,
      phone: rootPhone,
    };
  }

  return {
    clientId: intakeLink.clientId,
    type: clientType as ClientType,
    email: rootEmail,
    phone: rootPhone,
    persons: personsFromDb as any,
    entreprise: undefined,
    // Bien
    propertyLabel: property?.label ?? "",
    propertyFullAddress: property?.fullAddress ?? "",
    propertySurfaceM2: property?.surfaceM2?.toString() ?? "",
    propertyType: property?.type ?? undefined,
    propertyLegalStatus: property?.legalStatus ?? undefined,
    propertyStatus: property?.status ?? PropertyStatus.NON_LOUER,
    // Bail
    bailType: bail?.bailType ?? BailType.BAIL_NU_3_ANS,
    bailFamily: bail?.bailFamily ?? BailFamille.HABITATION,
    bailRentAmount: bail?.rentAmount?.toString() ?? "",
    bailEffectiveDate: bail?.effectiveDate
      ? (toDateValue(bail.effectiveDate) as any)
      : (EMPTY_STRING_DATE as any),
    bailEndDate: bail?.endDate
      ? (toDateValue(bail.endDate) as any)
      : ("" as any),
    bailMonthlyCharges: bail?.monthlyCharges?.toString() ?? "",
    bailSecurityDeposit: bail?.securityDeposit?.toString() ?? "",
    bailPaymentDay: bail?.paymentDay?.toString() ?? "",
    // Locataire
    tenantEmail,
  } as FormWithPersons;
};




const getRequiredFields = (
  stepId: StepId,
  clientType: ClientType | ""
): (keyof OwnerFormData)[] => {
  switch (stepId) {
    case "clientType":
      return ["type"];
    case "clientInfo":
      if (clientType === ClientType.PERSONNE_PHYSIQUE) {
        return [
          "email",
          "phone",
          "persons",
        ];
      }
      return [
        "email",
        "phone",
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
  values: OwnerFormData,
  intakeLink: IntakeLink,
  clientType: ClientType | ""
) => {
  const isEmpty = (val: any) =>
    val === undefined ||
    val === null ||
    val === "" ||
    (typeof val === "string" && val.trim() === "");

  // Vérifier si le formulaire a réellement été commencé
  // Si rawPayload existe et contient des données, alors le formulaire a été commencé
  const hasRawPayload = intakeLink.rawPayload && Object.keys(intakeLink.rawPayload).length > 0;
  
  // Si le type est vide OU si le formulaire n'a pas encore été commencé, commencer à l'étape 0
  if (isEmpty(values.type) || (!hasRawPayload && isEmpty(values.persons))) {
    return 0;
  }

  if (clientType === ClientType.PERSONNE_PHYSIQUE) {
    if (
      isEmpty(values.email) ||
      isEmpty(values.phone) ||
      isEmpty(values.persons)
    ) {
      return 1;
    }
  } else if (clientType === ClientType.PERSONNE_MORALE) {
    if (
      isEmpty(values.email) ||
      isEmpty(values.phone) ||
      isEmpty(values.entreprise)
    ) {
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
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [intakeLink, setIntakeLink] =
  useState<IntakeLink>(initialIntakeLink);
const [currentStep, setCurrentStep] = useState(0);
const [isSaving, setIsSaving] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);

const initialClientType =
  ((initialIntakeLink.rawPayload as any)?.type as ClientType | "") ||
  (initialIntakeLink.client?.type as ClientType | "") ||
  "";

const [clientType, setClientType] = useState<ClientType | "">(
  initialClientType
);

  const [openAccordionValue, setOpenAccordionValue] = useState<string>(`person-0`);

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

    const set = (field: keyof OwnerFormData, value: any) =>
      setValue(field, value as any, { shouldDirty: false, shouldValidate: false });
    
    set("email", primary.email || "");
    set("phone", primary.phone || "");
  }, [personsWatch, typeWatch, setValue]);

  // Synchroniser entreprise avec les champs racine (PERSONNE_MORALE)
  useEffect(() => {
    if (typeWatch !== ClientType.PERSONNE_MORALE) return;
    const primaryEmail = personsWatch?.[0]?.email || "";
    if (!entrepriseWatch) {
      setValue("entreprise", {
        legalName: "",
        registration: "",
        name: "",
        email: primaryEmail || "",
        phone: "",
        fullAddress: "",
      }, { shouldDirty: false });
      setValue("persons", [emptyPerson] as any, { shouldDirty: false });
      return;
    }

    const set = (field: keyof OwnerFormData, value: any) =>
      setValue(field, value as any, { shouldDirty: false, shouldValidate: false });

    set("email", entrepriseWatch.email || "");
    set("phone", entrepriseWatch.phone || "");

  }, [entrepriseWatch, typeWatch, setValue]);

    // On garde une photo des dernières valeurs sauvegardées
    const lastSavedValues = useRef<OwnerFormData>(defaultValues);

    // Initialisation du step UNIQUEMENT au chargement du formulaire
    useEffect(() => {
      lastSavedValues.current = defaultValues as OwnerFormData;
    
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
      }
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des données:", error);
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
    
    // Documents client (livret de famille, PACS)
    const clientDocs = intakeLink.client?.documents || [];
    
    // Documents des personnes (BIRTH_CERT, ID_IDENTITY)
    // Si personIndex est fourni, vérifier seulement pour cette personne
    if (personIndex !== undefined) {
      const person = intakeLink.client?.persons?.[personIndex];
      const personDocs = person?.documents || [];
      if (personDocs.some((d: any) => d.kind === kind)) return true;
    } else {
      const personDocs = intakeLink.client?.persons?.flatMap((p: any) => p.documents || []) || [];
      if (personDocs.some((d: any) => d.kind === kind)) return true;
    }
    
    // Documents de l'entreprise (KBIS, STATUTES)
    const entrepriseDocs = intakeLink.client?.entreprise?.documents || [];
    
    // Documents bien et bail
    const propertyDocs = intakeLink.property?.documents || [];
    const bailDocs = intakeLink.bail?.documents || [];
    
    return (
      clientDocs.some((d: any) => d.kind === kind) ||
      entrepriseDocs.some((d: any) => d.kind === kind) ||
      propertyDocs.some((d: any) => d.kind === kind) ||
      bailDocs.some((d: any) => d.kind === kind)
    );
  };

  const validateDocuments = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const values = getValues();
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

  const uploadFiles = async (dispatchEvent = true) => {
    const fileRefs = [
      { ref: kbisRef, name: "kbis" },
      { ref: statutesRef, name: "statutes" },
      { ref: livretDeFamilleRef, name: "livretDeFamille" },
      { ref: contratDePacsRef, name: "contratDePacs" },
      { ref: diagnosticsRef, name: "diagnostics" },
      { ref: titleDeedRef, name: "titleDeed" },
      { ref: reglementCoproprieteRef, name: "reglementCopropriete" },
      { ref: cahierChargeLotissementRef, name: "cahierChargeLotissement" },
      { ref: statutAssociationSyndicaleRef, name: "statutAssociationSyndicale" },
      { ref: insuranceOwnerRef, name: "insuranceOwner" },
      { ref: ribOwnerRef, name: "ribOwner" },
    ];

    const kindMap: Record<string, string> = {
      kbis: "KBIS",
      statutes: "STATUTES",
      birthCert: "BIRTH_CERT",
      idIdentity: "ID_IDENTITY",
      livretDeFamille: "LIVRET_DE_FAMILLE",
      contratDePacs: "CONTRAT_DE_PACS",
      diagnostics: "DIAGNOSTICS",
      titleDeed: "TITLE_DEED",
      reglementCopropriete: "REGLEMENT_COPROPRIETE",
      cahierChargeLotissement: "CAHIER_DE_CHARGE_LOTISSEMENT",
      statutAssociationSyndicale: "STATUT_DE_LASSOCIATION_SYNDICALE",
      insuranceOwner: "INSURANCE",
      ribOwner: "RIB",
    };

    const stateMap: Record<string, File | null> = {
      kbis: kbisFile,
      statutes: statutesFile,
      livretDeFamille: livretDeFamilleFile,
      contratDePacs: contratDePacsFile,
      diagnostics: diagnosticsFile,
      titleDeed: titleDeedFile,
      reglementCopropriete: reglementCoproprieteFile,
      cahierChargeLotissement: cahierChargeLotissementFile,
      statutAssociationSyndicale: statutAssociationSyndicaleFile,
      insuranceOwner: insuranceOwnerFile,
      ribOwner: ribOwnerFile,
    };

    const filesFormData = new FormData();
    filesFormData.append("token", intakeLink.token);
    filesFormData.append("clientId", intakeLink.clientId);

    const existingDocs = [
      ...(intakeLink.client?.documents || []),
      ...(intakeLink.client?.persons?.flatMap((p: any) => p.documents || []) || []),
      ...(intakeLink.client?.entreprise?.documents || []),
      ...(intakeLink.property?.documents || []),
      ...(intakeLink.bail?.documents || []),
    ];

    // Uploader les fichiers des personnes (birthCert, idIdentity)
    const persons = getValues().persons || [];
    persons.forEach((person: any, index: number) => {
      const personRefs = personDocumentRefs.current[index];
      const personFiles = personDocumentFiles[index] || { birthCert: null, idIdentity: null };
      
      // Vérifier si les documents existent déjà pour cette personne
      const personFromDb = intakeLink.client?.persons?.[index];
      const personDocs = personFromDb?.documents || [];
      
      // BirthCert
      if (!personDocs.some((d: any) => d.kind === "BIRTH_CERT")) {
        const birthCertFile = personFiles.birthCert || personRefs?.birthCert?.current?.files?.[0];
        if (birthCertFile) {
          filesFormData.append(`birthCert_${index}`, birthCertFile);
        }
      }
      
      // IDIdentity
      if (!personDocs.some((d: any) => d.kind === "ID_IDENTITY")) {
        const idIdentityFile = personFiles.idIdentity || personRefs?.idIdentity?.current?.files?.[0];
        if (idIdentityFile) {
          filesFormData.append(`idIdentity_${index}`, idIdentityFile);
        }
      }
    });

    // Uploader les autres fichiers
    fileRefs.forEach(({ ref, name }) => {
      const kind = kindMap[name];
      const alreadyUploaded = existingDocs.some((doc: any) => doc.kind === kind);
      if (alreadyUploaded) return;

      const fileInState = stateMap[name];
      const fileInRef = ref.current?.files?.[0];

      if (fileInState) {
        filesFormData.append(name, fileInState);
      } else if (fileInRef) {
        filesFormData.append(name, fileInRef);
      }
    });

    const hasFiles = Array.from(filesFormData.keys()).some(
      (key) => key !== "token" && key !== "clientId"
    );
    if (!hasFiles) return;

    const response = await fetch("/api/intakes/upload", {
      method: "POST",
      body: filesFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de l'upload des fichiers");
    }

    if (dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent(`document-uploaded-${intakeLink.token}`)
      );
    }

    // Réinitialiser les états
    setKbisFile(null);
    setStatutesFile(null);
    setLivretDeFamilleFile(null);
    setContratDePacsFile(null);
    setDiagnosticsFile(null);
    setTitleDeedFile(null);
    setReglementCoproprieteFile(null);
    setCahierChargeLotissementFile(null);
    setStatutAssociationSyndicaleFile(null);
    setInsuranceOwnerFile(null);
    setRibOwnerFile(null);
    
    // Réinitialiser les fichiers des personnes
    setPersonDocumentFiles({});
    
    // Réinitialiser les refs
    fileRefs.forEach(({ ref }) => {
      if (ref.current) ref.current.value = "";
    });
    Object.values(personDocumentRefs.current).forEach(refs => {
      if (refs.birthCert.current) refs.birthCert.current.value = "";
      if (refs.idIdentity.current) refs.idIdentity.current.value = "";
    });
  };

  const mapPersonsToOwnerPayload = (data: FormWithPersons): OwnerFormData & { entreprise?: EntrepriseForm } => {
    // Si PERSONNE_MORALE, utiliser entreprise
    if (data.type === ClientType.PERSONNE_MORALE && data.entreprise) {
      return {
        ...data,
        email: data.entreprise.email || data.email || "",
        phone: data.entreprise.phone || data.phone || "",
        persons: [] as any,
        entreprise: data.entreprise, // Inclure l'objet entreprise dans le payload
      };
    }
    
    // Sinon, PERSONNE_PHYSIQUE avec persons (toutes les personnes)
    const persons = data.persons && data.persons.length > 0 ? data.persons : [emptyPerson];
    const primary = persons[0];
    
    return {
      ...data,
      email: primary.email || data.email || "",
      phone: primary.phone || data.phone || "",
      persons: persons as any, // Toutes les personnes (première = primaire, autres = supplémentaires)
      entreprise: undefined,
    };
  };

  const saveCurrentStep = async (redirectAfterSave: boolean) => {
    const stepId = STEPS[currentStep].id;
    const payload = mapPersonsToOwnerPayload(getValues() as FormWithPersons);
    setIsSaving(true);
    try {
      if (stepId === "documents") {
        await uploadFiles();
      }

      await savePartialIntake({
        token: intakeLink.token,
        payload,
      });

      lastSavedValues.current = payload;

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
      toast.error(message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };


  const handleNext = async () => {
    const stepId = STEPS[currentStep].id;
  
    // 1. Validation
    if (stepId === "documents") {
      const filesCheck = validateDocuments();
      if (!filesCheck.isValid) {
        toast.error("Veuillez joindre tous les documents requis", {
          description: filesCheck.errors.join(", "),
        });
        return;
      }
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
      }
    }
  
    // 2. Calcul du step suivant (sans encore modifier l'UI)
    const summaryIndex = STEPS.findIndex((s) => s.id === "summary");
    const nextStep =
      stepId === "clientInfo" && summaryIndex !== -1
        ? summaryIndex
        : Math.min(currentStep + 1, STEPS.length - 1);
  
    // 3. Sauvegarde + overlay
    const payload = mapPersonsToOwnerPayload(getValues() as FormWithPersons);
  
    setIsSaving(true);
    const t0 = performance.now();
    try {
      if (stepId === "documents") {
        // Upload des fichiers + refresh pour que validateDocuments/hasDocument
        // voient bien les docs côté DB aux prochaines validations
        const tUploadStart = performance.now();
        await uploadFiles();
        console.log("uploadFiles ms:", performance.now() - tUploadStart);
        const tRefreshStart = performance.now();
        await refreshIntakeLinkData();
        console.log("refreshIntakeLinkData ms:", performance.now() - tRefreshStart);
      }
  
      const tSaveStart = performance.now();
      await savePartialIntake({
        token: intakeLink.token,
        payload,
      });

      lastSavedValues.current = payload as OwnerFormData;

      console.log("savePartialIntake ms:", performance.now() - tSaveStart);
  
      console.log("TOTAL handleNext ms:", performance.now() - t0);
  
      // On garde une photo de ce qui a été sauvegardé
      
  
      toast.success("Données enregistrées avec succès");
  
      // On ne passe à l'étape suivante qu'après un save OK
      setCurrentStep(nextStep);
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      const message =
        error?.message ||
        error?.toString() ||
        "Erreur lors de l'enregistrement";
      toast.error(message);
      // On reste sur l'étape actuelle si erreur
    } finally {
      setIsSaving(false);
    }
  };
  

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleManualSave = async () => {
    await saveCurrentStep(true);
  };

  const onSubmit = async (data: OwnerFormData) => {
    console.log("onSubmit appelé avec les données:", data);
    const payload = mapPersonsToOwnerPayload(data as FormWithPersons);
    console.log("Payload mappé:", payload);
    console.log("Toutes les personnes dans le payload:", payload.persons);
    console.log("Nombre total de personnes:", payload.persons?.length || 0);
    
    const fileValidation = validateDocuments();
    console.log("Validation des documents:", fileValidation);
    
    if (!fileValidation.isValid) {
      toast.error("Veuillez joindre tous les documents requis", {
        description: fileValidation.errors.join(", "),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Upload des fichiers en cours...");
      await uploadFiles(false);
      console.log("Upload des fichiers terminé");

      const formattedData = {
        ...payload,
        persons: (payload.persons || []).map((person) => ({
          ...person,
          birthDate: toDateValue(person.birthDate) ?? undefined,
        })),
      };

      console.log("Soumission de l'intake avec:", formattedData);
      await submitIntake({
        token: intakeLink.token,
        payload: formattedData,
      });
      console.log("Intake soumis avec succès");

      const successPath = pathname?.includes("/commencer")
        ? `/commencer/success?token=${intakeLink.token}`
        : `/intakes/${intakeLink.token}/success`;
      console.log("Redirection vers:", successPath);
      router.push(successPath);
    } catch (error: any) {
      console.error("Erreur lors de la soumission:", error);
      const message =
        error?.message || error?.toString() || "Erreur lors de la soumission";
      toast.error(message);
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
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6">
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
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-foreground">
                  {isSubmitting
                    ? "Envoi en cours..."
                    : "Enregistrement en cours..."}
                </p>
                <p className="text-xs text-muted-foreground text-center max-w-xs px-4">
                  {isSubmitting
                    ? "Veuillez patienter pendant la soumission de votre formulaire"
                    : "Vos données sont en cours d'enregistrement, veuillez patienter"}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
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
              removePerson={removePerson}
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
                  disabled={isSubmitting || isSaving}
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
                disabled={isSubmitting || isSaving}
                className="sm:w-auto h-10"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting || isSaving}
                  size="icon"
                  className="h-10 w-10"
                >
                  <ArrowRightIcon className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || isSaving}
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
  removePerson: (index: number) => void;
  isMobile: boolean;
  intakeLink: IntakeLink;
  openAccordionValue: string;
  setOpenAccordionValue: (value: string) => void;
  refreshIntakeLinkData: () => Promise<void>;
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
          <CardTitle>Informations de l’entreprise</CardTitle>
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
          onClick={() => appendPerson({ ...emptyPerson } as any)}
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
                  // ✅ On ne touche plus à la DB ici
                  // On supprime uniquement la personne du formulaire (donc du futur rawPayload)
                  removePerson(personToDeleteIndex);
              
                  toast.success("Personne supprimée du formulaire");
                  setDeleteDialogOpen(false);
                  setPersonToDeleteIndex(null);
                } catch (error: any) {
                  console.error("Erreur lors de la suppression:", error);
                  toast.error(
                    error?.message || "Erreur lors de la suppression de la personne dans le formulaire"
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
  const primaryPerson = persons[0];
  const secondaryPersons = persons.slice(1);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Récapitulatif</CardTitle>
        <CardDescription>
          Vérifiez les informations avant de continuer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {clientType === ClientType.PERSONNE_MORALE && values.entreprise ? (
          <div className="space-y-3 rounded-md border p-4">
            <Label className="text-xs uppercase text-muted-foreground">
              Entreprise
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
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
          </div>
        ) : primaryPerson ? (
          <div className="space-y-3 rounded-md border p-4">
              <div className="font-semibold">
                    Personne 1 (principale)
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nom complet</span>
                <div className="font-medium">
                  {primaryPerson.firstName} {primaryPerson.lastName}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <div className="font-medium">{primaryPerson.email}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Téléphone</span>
                <div className="font-medium">{primaryPerson.phone}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Profession</span>
                <div className="font-medium">{primaryPerson.profession}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Nationalité</span>
                <div className="font-medium">{primaryPerson.nationality}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Statut familial</span>
                <div className="font-medium">
                  {primaryPerson.familyStatus?.replace(/_/g, " ")}
                </div>
              </div>
              {primaryPerson.matrimonialRegime && (
                <div>
                  <span className="text-muted-foreground">Régime matrimonial</span>
                  <div className="font-medium">{primaryPerson.matrimonialRegime}</div>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Lieu de naissance</span>
                <div className="font-medium">{primaryPerson.birthPlace}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Date de naissance</span>
                <div className="font-medium">
                  {primaryPerson.birthDate
                    ? formatDateToLocalString(new Date(primaryPerson.birthDate))
                    : "-"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Adresse</span>
                <div className="font-medium">{primaryPerson.fullAddress}</div>
              </div>
            </div>
          </div>
        ) : null}

        {secondaryPersons.length > 0 && (
          <div className="space-y-3 rounded-md border p-4">
            <Label className="text-xs uppercase text-muted-foreground">
              Autres personnes
            </Label>
            <div className="grid gap-3">
              {secondaryPersons.map((person, index) => (
                <div
                  key={`${person.email}-${index}`}
                  className="text-sm space-y-1"
                >
                  <Separator className="mb-2" />
                  <div className="font-semibold">
                    Personne {index + 2}: {person.firstName} {person.lastName}
                  </div>
                  <div className="text-muted-foreground">
                    {person.email || "Email manquant"}
                  </div>
                  <div>{person.phone || "Téléphone manquant"}</div>
                  <div className="text-muted-foreground">
                    {person.fullAddress || "Adresse manquante"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

type PropertyStepProps = {
  form: ReturnType<typeof useForm<OwnerFormData>>;
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
  form: ReturnType<typeof useForm<OwnerFormData>>;
};

const BailStep = ({ form }: BailStepProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Informations du bail</CardTitle>
      <CardDescription>Renseignez les paramètres du bail.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bailFamily">Catégorie du bail *</Label>
        <Controller
          name="bailFamily"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value ?? undefined} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(BailFamille).map((family) => (
                  <SelectItem key={family} value={family}>
                    {family === BailFamille.HABITATION ? "Habitation" : family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.bailFamily && (
          <p className="text-sm text-destructive">
            {form.formState.errors.bailFamily.message}
          </p>
        )}
      </div>
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
  form: ReturnType<typeof useForm<OwnerFormData>>;
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
  form: ReturnType<typeof useForm<OwnerFormData>>;
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
