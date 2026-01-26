"use client";

import React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitIntake, savePartialIntake, getIntakeLinkByToken } from "@/lib/actions/intakes";
import { DocumentUploaded } from "./document-uploaded";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tenantFormSchema } from "@/lib/zod/client";
import { formatDate, formatCurrency, formatSurface } from "@/lib/utils/formatters";
import { FamilyStatus, MatrimonialRegime, ClientType, DocumentKind, BailType } from "@prisma/client";
import { FileUpload } from "@/components/ui/file-upload";
import { Stepper } from "@/components/ui/stepper";
import { ArrowLeftIcon, ArrowRightIcon, Loader2, Building2, User2, MapPin, Calendar, Euro, Home, Info } from "lucide-react";
import Image from "next/image";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker, formatDateToLocalString } from "@/components/ui/date-picker";
import useIsMobile from "@/hooks/useIsMobile";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Trash2 } from "lucide-react";

type TenantFormData = z.infer<typeof tenantFormSchema>;

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
  nationality: string;
  documents: RawDocumentMeta[];
};

type RawDocumentMeta = {
  kind: DocumentKind;
  fileKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  label?: string;
};

type FormWithPersons = TenantFormData & { 
  persons: PersonForm[];
  entreprise?: EntrepriseForm;
  clientDocuments?: RawDocumentMeta[];
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

const toDateValue = (value?: string | Date | null) => {
  if (!value) return undefined;
  if (typeof value === "string") {
    return value.includes("T") ? value.split("T")[0] : value;
  }
  return value.toISOString().split("T")[0];
};

const buildDefaultValues = (intakeLink: any): FormWithPersons => {
  const client = intakeLink.client;

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
    "";

  const rootPhone =
    (entreprise?.phone as string | undefined) ??
    (primaryPerson?.phone as string | undefined) ??
    "";

  const clientDocuments = (client?.documents || []).map((doc: any) => ({
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
      nationality: entreprise.nationality ?? "",
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
      clientDocuments,
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
    clientDocuments,
  } as FormWithPersons;
};

const STEPS = [
  { id: "overview", title: "Récapitulatif" },
  { id: "clientType", title: "Type de client" },
  { id: "clientInfo", title: "Informations client" },
  { id: "documents", title: "Pièces jointes" },
];

type StepId = (typeof STEPS)[number]["id"];

export function TenantIntakeForm({ intakeLink: initialIntakeLink }: { intakeLink: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({
    step: 0,
    totalSteps: 4,
    currentStepName: "",
  });
  const isMobile = useIsMobile(); 
  
  // États pour stocker les données qui peuvent être rafraîchies après l'upload
  const [intakeLink, setIntakeLink] = useState(initialIntakeLink);

  // Fonction pour gérer les changements d'état d'upload
  const handleUploadStateChange = (isUploading: boolean) => {
    setIsFileUploading(isUploading);
  };
  
  // Recalculer client quand intakeLink change
  const client = useMemo(() => intakeLink.client, [intakeLink]);
  
  const defaultValues = useMemo(
    () => buildDefaultValues(intakeLink),
    [intakeLink]
  );

  const [clientType, setClientType] = useState<ClientType | "">(
    defaultValues.type || ClientType.PERSONNE_PHYSIQUE
  );

  // On garde une photo des dernières valeurs sauvegardées
  const lastSavedValues = useRef<FormWithPersons>(defaultValues);

  const [openAccordionValue, setOpenAccordionValue] = useState<string>(`person-0`);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [personToDeleteIndex, setPersonToDeleteIndex] = useState<number | null>(null);

  // Refs pour les fichiers
  const kbisRef = useRef<HTMLInputElement>(null);
  const statutesRef = useRef<HTMLInputElement>(null);
  const livretDeFamilleRef = useRef<HTMLInputElement>(null);
  const contratDePacsRef = useRef<HTMLInputElement>(null);
  const insuranceTenantRef = useRef<HTMLInputElement>(null);
  const ribTenantRef = useRef<HTMLInputElement>(null);

  // Refs dynamiques pour les documents de chaque personne
  const personDocumentRefs = useRef<Record<number, { idIdentity: React.RefObject<HTMLInputElement | null> }>>({});

  // États pour les fichiers sélectionnés
  const [kbisFile, setKbisFile] = useState<File | null>(null);
  const [statutesFile, setStatutesFile] = useState<File | null>(null);
  const [idIdentityFile, setIdIdentityFile] = useState<File | null>(null);
  const [livretDeFamilleFile, setLivretDeFamilleFile] = useState<File | null>(null);
  const [contratDePacsFile, setContratDePacsFile] = useState<File | null>(null);
  const [insuranceTenantFile, setInsuranceTenantFile] = useState<File | null>(null);
  const [ribTenantFile, setRibTenantFile] = useState<File | null>(null);

  // États dynamiques pour les documents de chaque personne
  const [personDocumentFiles, setPersonDocumentFiles] = useState<Record<number, { idIdentity: File | null }>>({});

  const form = useForm<FormWithPersons>({
    resolver: zodResolver(tenantFormSchema) as any,
    defaultValues,
  });

  const { control, trigger, getValues, setValue, watch } = form;
  const { fields: personFields, append: appendPerson, remove: removePerson } = useFieldArray({
    control,
    name: "persons",
  });

  const personsWatch = watch("persons");
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
    if (!entrepriseWatch) return;

    const set = (field: keyof FormWithPersons, value: any) =>
      setValue(field, value as any, { shouldDirty: false, shouldValidate: false });

    set("email", entrepriseWatch.email || "");
    set("phone", entrepriseWatch.phone || "");
  }, [entrepriseWatch, typeWatch, setValue]);

  // Fonction pour supprimer une personne
  const handleRemovePerson = async (index: number) => {
    removePerson(index);
    // Nettoyer les refs et fichiers pour la personne supprimée
    if (personDocumentRefs.current[index]) {
      delete personDocumentRefs.current[index];
    }
    setPersonDocumentFiles(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  // Initialiser les refs pour les personnes existantes
  useEffect(() => {
    const persons = personsWatch || [];
    persons.forEach((_, index) => {
      if (!personDocumentRefs.current[index]) {
        personDocumentRefs.current[index] = {
          idIdentity: React.createRef<HTMLInputElement | null>() as any,
        };
      }
      if (!personDocumentFiles[index]) {
        setPersonDocumentFiles(prev => ({
          ...prev,
          [index]: { idIdentity: null }
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

  // Fonction pour déterminer la première étape incomplète
  const getFirstIncompleteStep = (): number => {
    const values = getValues();
    const currentClientType = values.type;
    
    // Fonction helper pour vérifier si une valeur est vide
    const isEmpty = (val: any): boolean => {
      return val === undefined || val === null || val === "" || (typeof val === 'string' && val.trim() === "");
    };
    
    // Si le bien ou le bail existe, commencer par l'étape overview (index 0)
    if (intakeLink.property || intakeLink.bail) {
      // Après overview, vérifier les autres étapes
      // Mais toujours commencer par overview si bien/bail existe
    }
    
    // Fonction helper pour vérifier si l'étape clientInfo a des données
    const hasClientInfoData = (): boolean => {
      if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
        const primaryPerson = values.persons?.[0];
        return !!(primaryPerson && 
          !isEmpty(primaryPerson.firstName) && !isEmpty(primaryPerson.lastName) && 
          !isEmpty(primaryPerson.email) && !isEmpty(primaryPerson.phone) && !isEmpty(primaryPerson.fullAddress));
      } else if (currentClientType === ClientType.PERSONNE_MORALE) {
        return !!(values.entreprise && 
          !isEmpty(values.entreprise.legalName) && !isEmpty(values.entreprise.email) && 
          !isEmpty(values.entreprise.phone) && !isEmpty(values.entreprise.fullAddress));
      }
      return false;
    };
    
    // Trouver les indices des étapes
    const overviewIndex = STEPS.findIndex((s) => s.id === "overview");
    const clientTypeIndex = STEPS.findIndex((s) => s.id === "clientType");
    const clientInfoIndex = STEPS.findIndex((s) => s.id === "clientInfo");
    const documentsIndex = STEPS.findIndex((s) => s.id === "documents");
    
    // Si le bien ou le bail existe, commencer par overview
    if ((intakeLink.property || intakeLink.bail) && overviewIndex !== -1) {
      // Après overview, continuer avec les autres vérifications
    }
    
    // Vérifier l'étape clientType
    // Si le type est vide OU si aucune donnée n'a été saisie dans les étapes suivantes, commencer à clientType
    // Cela permet à l'utilisateur de voir et modifier le type même s'il est prérempli
    if (isEmpty(values.type) || !hasClientInfoData()) {
      // Si overview existe et bien/bail existe, commencer par overview, sinon clientType
      if ((intakeLink.property || intakeLink.bail) && overviewIndex !== -1) {
        return overviewIndex;
      }
      return clientTypeIndex !== -1 ? clientTypeIndex : 0;
    }

    // Vérifier l'étape clientInfo (maintenant index 2 si overview existe)
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      const primaryPerson = values.persons?.[0];
      if (!primaryPerson || 
          isEmpty(primaryPerson.firstName) || isEmpty(primaryPerson.lastName) || 
          isEmpty(primaryPerson.email) || isEmpty(primaryPerson.phone) || isEmpty(primaryPerson.fullAddress) ||
          isEmpty(primaryPerson.profession) || !primaryPerson.familyStatus || 
          isEmpty(primaryPerson.birthPlace) || !primaryPerson.birthDate || isEmpty(primaryPerson.nationality)) {
        return clientInfoIndex !== -1 ? clientInfoIndex : 1;
      }
      if (primaryPerson.familyStatus === FamilyStatus.MARIE && !primaryPerson.matrimonialRegime) {
        return clientInfoIndex !== -1 ? clientInfoIndex : 1;
      }
      // Vérifier toutes les personnes
      if (values.persons && values.persons.length > 1) {
        for (let i = 1; i < values.persons.length; i++) {
          const person = values.persons[i];
          if (!person || isEmpty(person.firstName) || isEmpty(person.lastName) || 
              isEmpty(person.email) || isEmpty(person.phone) || isEmpty(person.fullAddress) ||
              isEmpty(person.profession) || !person.familyStatus || 
              isEmpty(person.birthPlace) || !person.birthDate || isEmpty(person.nationality)) {
            return clientInfoIndex !== -1 ? clientInfoIndex : 1;
          }
          if (person.familyStatus === FamilyStatus.MARIE && !person.matrimonialRegime) {
            return clientInfoIndex !== -1 ? clientInfoIndex : 1;
          }
        }
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      if (!values.entreprise ||
          isEmpty(values.entreprise.legalName) || isEmpty(values.entreprise.email) || 
          isEmpty(values.entreprise.phone) || isEmpty(values.entreprise.fullAddress) ||
          isEmpty(values.entreprise.registration) || isEmpty(values.entreprise.nationality)) {
        return clientInfoIndex !== -1 ? clientInfoIndex : 1;
      }
    }

    // Vérifier l'étape documents (maintenant index 3 si overview existe)
    // Utiliser intakeLink directement pour avoir les données à jour
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      // Vérifier les documents pour chaque personne
      if (values.persons) {
        for (let i = 0; i < values.persons.length; i++) {
          const person = values.persons[i];
          const personDocs = intakeLink.client?.persons?.[i]?.documents || [];
          const hasIdIdentity = personDocs.some((doc: any) => doc.kind === "ID_IDENTITY");
          
          if (!hasIdIdentity) {
            return documentsIndex !== -1 ? documentsIndex : 2;
          }
        }
      }
      
      // Vérifier les documents communs (livret de famille, PACS)
      const primaryPerson = values.persons?.[0];
      const clientDocs = intakeLink.client?.documents || [];
      if (primaryPerson?.familyStatus === FamilyStatus.MARIE) {
        const hasLivret = clientDocs.some((doc: any) => doc.kind === "LIVRET_DE_FAMILLE");
        if (!hasLivret) {
          return documentsIndex !== -1 ? documentsIndex : 2;
        }
      }
      if (primaryPerson?.familyStatus === FamilyStatus.PACS) {
        const hasPacs = clientDocs.some((doc: any) => doc.kind === "CONTRAT_DE_PACS");
        if (!hasPacs) {
          return documentsIndex !== -1 ? documentsIndex : 2;
        }
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      const entrepriseDocs = intakeLink.client?.entreprise?.documents || [];
      const hasKbis = entrepriseDocs.some((doc: any) => doc.kind === "KBIS");
      const hasStatutes = entrepriseDocs.some((doc: any) => doc.kind === "STATUTES");
      
      if (!hasKbis || !hasStatutes) {
        return documentsIndex !== -1 ? documentsIndex : 2;
      }
    }

    // Vérifier les documents du locataire (client) - assurance et RIB
    const clientDocs = intakeLink.client?.documents || [];
    const hasInsurance = clientDocs.some((doc: any) => doc.kind === "INSURANCE");
    const hasRib = clientDocs.some((doc: any) => doc.kind === "RIB");
    
    if (!hasInsurance || !hasRib) {
      return documentsIndex !== -1 ? documentsIndex : 2;
    }

    // Toutes les étapes sont complètes, retourner la dernière étape
    return STEPS.length - 1;
  };

  // Initialiser currentStep avec la première étape incomplète
  useEffect(() => {
    lastSavedValues.current = defaultValues as FormWithPersons;
    let firstIncompleteStep = getFirstIncompleteStep();
    
    // Si le bien ou le bail existe, commencer par l'étape overview
    if (intakeLink.property || intakeLink.bail) {
      const overviewIndex = STEPS.findIndex((s) => s.id === "overview");
      if (overviewIndex !== -1) {
        firstIncompleteStep = overviewIndex;
      }
    }
    
    setCurrentStep(firstIncompleteStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Réinitialiser matrimonialRegime si familyStatus change et n'est plus MARIE
  const primaryPersonFamilyStatus = personsWatch?.[0]?.familyStatus;
  useEffect(() => {
    if (primaryPersonFamilyStatus !== FamilyStatus.MARIE && personsWatch?.[0]) {
      setValue(`persons.0.matrimonialRegime`, undefined as any);
    }
  }, [primaryPersonFamilyStatus, personsWatch, setValue]);

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
    const stepId = STEPS[step]?.id;
    
    // L'étape overview est en lecture seule, pas de changement possible
    if (stepId === "overview") {
      return false;
    }
    
    const fieldsToCheck = getFieldsForStep(step);
    const currentValues = form.getValues();
    const initial = lastSavedValues.current;

    // Pour le step documents (maintenant index 3), vérifier uniquement les fichiers
    if (stepId === "documents") {
      // Mapper les noms de fichiers aux types de documents
      const fileToDocumentKind: Record<string, string> = {
        kbis: "KBIS",
        statutes: "STATUTES",
        livretDeFamille: "LIVRET_DE_FAMILLE",
        contratDePacs: "CONTRAT_DE_PACS",
        insuranceTenant: "INSURANCE",
        ribTenant: "RIB",
      };

      const fileRefs = [
        { ref: kbisRef, name: "kbis" },
        { ref: statutesRef, name: "statutes" },
        { ref: livretDeFamilleRef, name: "livretDeFamille" },
        { ref: contratDePacsRef, name: "contratDePacs" },
        { ref: insuranceTenantRef, name: "insuranceTenant" },
        { ref: ribTenantRef, name: "ribTenant" },
      ];

      // Récupérer tous les documents existants
      const clientDocs = intakeLink.client?.documents || [];
      const entrepriseDocs = intakeLink.client?.entreprise?.documents || [];

      // Vérifier s'il y a de nouveaux fichiers (fichiers qui n'existaient pas initialement)
      const hasNewFiles = fileRefs.some(({ ref, name }) => {
        if (ref.current?.files && ref.current.files[0]) {
          const documentKind = fileToDocumentKind[name];
          if (documentKind) {
            const documentExists = (name === "kbis" || name === "statutes")
              ? entrepriseDocs.some((doc: any) => doc.kind === documentKind)
              : clientDocs.some((doc: any) => doc.kind === documentKind);
            return !documentExists;
          }
        }
        return false;
      });

      // Vérifier aussi les documents par personne
      const persons = personsWatch || [];
      for (let i = 0; i < persons.length; i++) {
        const personRefs = personDocumentRefs.current[i];
        const personFiles = personDocumentFiles[i];
        const personDocs = intakeLink.client?.persons?.[i]?.documents || [];
        
        if (personRefs?.idIdentity.current?.files?.[0] || personFiles?.idIdentity) {
          const hasIdIdentity = personDocs.some((doc: any) => doc.kind === "ID_IDENTITY");
          if (!hasIdIdentity) {
            return true; // Nouveau fichier détecté
          }
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

  // Fonction pour rafraîchir les données après l'upload
  const refreshIntakeLinkData = async () => {
    try {
      const refreshed = await getIntakeLinkByToken(intakeLink.token);
      if (refreshed) {
        setIntakeLink(refreshed);
        return refreshed;
      }
      return null;
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des données:", error);
      return null;
    }
  };

  // Fonction pour uploader les fichiers via l'API route
  const uploadFiles = async (shouldDispatchEvent: boolean = true): Promise<FormWithPersons | null> => {
    const fileRefs = [
      { ref: kbisRef, name: "kbis" },
      { ref: statutesRef, name: "statutes" },
      { ref: livretDeFamilleRef, name: "livretDeFamille" },
      { ref: contratDePacsRef, name: "contratDePacs" },
      { ref: insuranceTenantRef, name: "insuranceTenant" },
      { ref: ribTenantRef, name: "ribTenant" },
    ];

    // Mapper les noms de fichiers aux types de documents
    const fileToDocumentKind: Record<string, string> = {
      kbis: "KBIS",
      statutes: "STATUTES",
      livretDeFamille: "LIVRET_DE_FAMILLE",
      contratDePacs: "CONTRAT_DE_PACS",
      insuranceTenant: "INSURANCE",
      ribTenant: "RIB",
    };

    // Mapping des noms de fichiers aux états correspondants
    const fileStateMap: Record<string, File | null> = {
      kbis: kbisFile,
      statutes: statutesFile,
      livretDeFamille: livretDeFamilleFile,
      contratDePacs: contratDePacsFile,
      insuranceTenant: insuranceTenantFile,
      ribTenant: ribTenantFile,
    };

    // Récupérer les valeurs actuelles du formulaire pour vérifier les documents existants
    const currentValues = getValues() as FormWithPersons;
    
    // Récupérer tous les documents du client (locataire)
    // Documents client (livret de famille, PACS, assurance, RIB)
    const clientDocs = intakeLink.client?.documents || [];
    // Documents de l'entreprise (KBIS, STATUTES)
    const entrepriseDocs = intakeLink.client?.entreprise?.documents || [];
    
    // Vérifier les documents existants dans les valeurs du formulaire
    const existingDocsInValues = [
      ...(currentValues.clientDocuments || []),
      ...(currentValues.persons?.flatMap((p: any) => p.documents || []) || []),
      ...(currentValues.entreprise?.documents || []),
    ];
    
    const allExistingDocs = [...existingDocsInValues];
    
    // Créer un FormData pour les fichiers uniquement
    const filesFormData = new FormData();
    filesFormData.append("token", intakeLink.token);
    
    // Ajouter les IDs si disponibles
    const data = form.getValues();
    if (data.clientId) filesFormData.append("clientId", data.clientId);
    
    // Liste des fichiers uploadés pour nettoyer les refs et états après
    const uploadedFiles: Array<{ ref: React.RefObject<HTMLInputElement | null>, stateSetter: (file: File | null) => void, name: string }> = [];
    
    // Ajouter uniquement les fichiers qui n'existent pas déjà dans la base de données
    fileRefs.forEach(({ ref, name }) => {
      const documentKind = fileToDocumentKind[name];
      if (!documentKind) return;

      // Vérifier si un document avec ce kind existe déjà ET a un fileKey (donc déjà uploadé)
      const alreadyUploaded = allExistingDocs.some((doc: any) => doc.kind === documentKind && doc.fileKey);
      if (alreadyUploaded) {
        // Le document existe déjà, ne pas l'uploader
        if (ref.current) {
          ref.current.value = "";
        }
        const stateSetter = {
          kbis: setKbisFile,
          statutes: setStatutesFile,
          livretDeFamille: setLivretDeFamilleFile,
          contratDePacs: setContratDePacsFile,
          insuranceTenant: setInsuranceTenantFile,
          ribTenant: setRibTenantFile,
        }[name];
        if (stateSetter) {
          stateSetter(null);
        }
        return;
      }

      // Le document n'existe pas, vérifier s'il y a un fichier à uploader
      const fileFromState = fileStateMap[name];
      const fileFromRef = ref.current?.files?.[0];
      
      if (fileFromState || fileFromRef) {
        if (fileFromState) {
          filesFormData.append(name, fileFromState);
        } else if (fileFromRef) {
          filesFormData.append(name, fileFromRef);
        }
        
        const stateSetter = {
          kbis: setKbisFile,
          statutes: setStatutesFile,
          livretDeFamille: setLivretDeFamilleFile,
          contratDePacs: setContratDePacsFile,
          insuranceTenant: setInsuranceTenantFile,
          ribTenant: setRibTenantFile,
        }[name];
        
        if (stateSetter) {
          uploadedFiles.push({ ref, stateSetter, name });
        }
      }
    });

    // Gérer les documents par personne (ID_IDENTITY)
    const persons = personsWatch || [];
    persons.forEach((_, personIndex) => {
      const personRefs = personDocumentRefs.current[personIndex];
      const personFiles = personDocumentFiles[personIndex] || { idIdentity: null };
      
      // Vérifier si les documents existent déjà dans les valeurs
      const personDocsInValues = currentValues.persons?.[personIndex]?.documents || [];
      const personDocs = [...personDocsInValues];

      // Traiter idIdentity
      if (!personDocs.some((d: any) => d.kind === "ID_IDENTITY")) {
        const idIdentityFile = personFiles.idIdentity || personRefs?.idIdentity?.current?.files?.[0];
        if (idIdentityFile) {
          filesFormData.append(`idIdentity_${personIndex}`, idIdentityFile);
        }
      }
    });

    // Si aucun fichier à uploader, ne rien faire
    const formDataKeys = Array.from(filesFormData.keys());
    const fileKeys = formDataKeys.filter((key) => key !== "token" && key !== "clientId");
    
    if (fileKeys.length === 0) {
      return null;
    }

    // Uploader les fichiers via l'API route
    const response = await fetch("/api/intakes/upload", {
      method: "POST",
      body: filesFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de l'upload des fichiers");
    }

    const result = await response.json();
    const uploadedDocuments = result.documents || [];
    
    console.log("[uploadFiles] Documents uploadés:", uploadedDocuments.length, uploadedDocuments);

    // Ajouter les métadonnées des documents uploadés au payload
    if (uploadedDocuments.length > 0) {
      const currentPayload = { ...currentValues };
      
      // Initialiser les tableaux de documents s'ils n'existent pas
      if (!currentPayload.clientDocuments) currentPayload.clientDocuments = [];
      
      // Traiter chaque document uploadé
      uploadedDocuments.forEach((doc: any) => {
        const documentMeta: RawDocumentMeta = {
          kind: doc.kind as DocumentKind,
          fileKey: doc.fileKey,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          size: doc.size,
          label: doc.label || doc.fileName,
        };

        // Ajouter le document au bon endroit selon sa cible
        if (doc.target === 'person' && doc.personIndex !== undefined) {
          // Document de personne
          if (!currentPayload.persons) currentPayload.persons = [];
          if (!currentPayload.persons[doc.personIndex]) { 
            currentPayload.persons[doc.personIndex] = { ...emptyPerson } as any;
          }
          if (!currentPayload.persons[doc.personIndex].documents) {
            currentPayload.persons[doc.personIndex].documents = [];
          }
          // Vérifier si le document n'existe pas déjà
          if (!currentPayload.persons[doc.personIndex].documents.some((d: any) => d.kind === doc.kind)) {
            currentPayload.persons[doc.personIndex].documents.push(documentMeta);
          }
        } else if (doc.target === 'entreprise') {
          // Document d'entreprise
          if (!currentPayload.entreprise) {
            currentPayload.entreprise = {
              legalName: "",
              registration: "",
              name: "",
              email: "",
              phone: "",
              fullAddress: "",
              nationality: "",
              documents: [],
            };
          }
          if (!currentPayload.entreprise.documents) {
            currentPayload.entreprise.documents = [];
          }
          // Vérifier si le document n'existe pas déjà
          if (!currentPayload.entreprise.documents.some((d: any) => d.kind === doc.kind)) {
            currentPayload.entreprise.documents.push(documentMeta);
          }
        } else if (doc.target === 'client') {
          // Document client (livret de famille, PACS, assurance, RIB)
          if (!currentPayload.clientDocuments) {
            currentPayload.clientDocuments = [];
          }
          if (!currentPayload.clientDocuments.some((d: any) => d.kind === doc.kind)) {
            currentPayload.clientDocuments.push(documentMeta);
          }
        }
      });

      // Nettoyer les refs et les états après un upload réussi
      uploadedFiles.forEach(({ ref, stateSetter }) => {
        if (ref.current) {
          ref.current.value = "";
        }
        stateSetter(null);
      });

      // Nettoyer les documents par personne
      persons.forEach((_, personIndex) => {
        const personRefs = personDocumentRefs.current[personIndex];
        if (personRefs?.idIdentity.current) {
          personRefs.idIdentity.current.value = "";
        }
        setPersonDocumentFiles(prev => ({
          ...prev,
          [personIndex]: { idIdentity: null }
        }));
      });

      // Retourner le payload mis à jour avec les métadonnées des documents
      if (shouldDispatchEvent) {
        window.dispatchEvent(new CustomEvent(`document-uploaded-${intakeLink.token}`));
      }

      console.log("[uploadFiles] Payload retourné avec documents:", {
        persons: currentPayload.persons?.map((p: any) => ({ documents: p.documents?.length || 0 })),
        entreprise: currentPayload.entreprise?.documents?.length || 0,
        clientDocuments: currentPayload.clientDocuments?.length || 0,
      });
      return currentPayload;
    }

    // Si aucun document n'a été uploadé, retourner null
    if (shouldDispatchEvent) {
      window.dispatchEvent(new CustomEvent(`document-uploaded-${intakeLink.token}`));
    }

    return null;
  };

  const saveCurrentStep = async (redirectAfterSave: boolean, skipIfUnchanged: boolean = false) => {
    // Si skipIfUnchanged est true, vérifier si les données ont changé
    if (skipIfUnchanged && !hasStepDataChanged(currentStep)) {
      // Les données n'ont pas changé, pas besoin de sauvegarder
      return;
    }

    const stepId = STEPS[currentStep]?.id;
    const allValues = getValues() as FormWithPersons;
    
    // Construire un payload minimal pour l'étape actuelle uniquement
    const stepPayload = buildStepPayload(currentStep, allValues);
    
    // Pour les étapes qui nécessitent la transformation complète (clientInfo avec persons/entreprise)
    // on garde la structure complète pour garantir la cohérence
    let payload: any;
    if (stepId === "clientInfo") {
      // Pour clientInfo, on doit inclure les champs racine (email, phone) pour la synchronisation
      payload = {
        ...stepPayload,
        // IMPORTANT: Toujours inclure le type pour que le backend sache comment traiter les données
        type: allValues.type || stepPayload.type,
        // S'assurer que email et phone sont inclus si présents dans les valeurs complètes
        email: allValues.email || stepPayload.email,
        phone: allValues.phone || stepPayload.phone,
      };
    } else {
      // Pour les autres étapes, utiliser le payload minimal
      payload = stepPayload;
    }
    
    setIsSaving(true);
    try {
      // Rafraîchir les données uniquement si on est sur l'étape documents ou si on vient de passer à cette étape
      // Cela évite des appels API inutiles pour les autres étapes
      const stepId = STEPS[currentStep]?.id;
      if (stepId === "documents") {
        await refreshIntakeLinkData();
      }
      
      // Sauvegarder les données avec le stepId
      await savePartialIntake({
        token: intakeLink.token,
        payload,
        stepId: stepId, // Envoyer l'ID de l'étape pour que le backend sache quelle étape traiter
      });

      // Rafraîchir les données pour obtenir les valeurs réellement sauvegardées
      const refreshed = await refreshIntakeLinkData();
      
      // Mettre à jour lastSavedValues avec les valeurs réelles de la base de données
      if (refreshed) {
        const refreshedValues = buildDefaultValues(refreshed);
        lastSavedValues.current = refreshedValues as FormWithPersons;
      } else {
        // Fallback : utiliser les valeurs du payload si le rafraîchissement échoue
        lastSavedValues.current = payload as FormWithPersons;
      }

      toast.success("Données enregistrées avec succès");

      if (redirectAfterSave) {
        router.push(`/intakes/${intakeLink.token}/reminder`);
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
  
    // Si on est sur l'étape "overview", passer directement à la suivante sans sauvegarde
    if (stepId === "overview") {
      const nextStep = Math.min(currentStep + 1, STEPS.length - 1);
      setCurrentStep(nextStep);
      return;
    }
  
    // Si on est sur l'étape "summary", pas besoin de sauvegarder, c'est juste une étape de visionnage
    if (stepId === "summary") {
      const nextStep = Math.min(currentStep + 1, STEPS.length - 1);
      setCurrentStep(nextStep);
      return;
    }
  
    // 1. Validation
    if (stepId === "documents") {
      const filesCheck = validateRequiredFiles();
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
  
    // 3. Sauvegarde (seulement si les données ont changé)
    try {
      await saveCurrentStep(false, true); // skipIfUnchanged = true
      
      if (stepId === "documents") {
        // Refresh pour que validateRequiredFiles/hasDocument voient bien les docs
        await refreshIntakeLinkData();
      }
  
      // On ne passe à l'étape suivante qu'après un save OK (ou si rien n'a changé)
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
      case "documents":
        return [];
      default:
        return [];
    }
  };

  const getFieldsForStep = (step: number): (keyof FormWithPersons)[] => {
    const stepId = STEPS[step]?.id;
    // L'étape overview est en lecture seule, pas de champs
    if (stepId === "overview") {
      return [];
    }
    return getRequiredFields(stepId as StepId, clientType);
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


  const validateRequiredFiles = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const currentClientType = clientType;
    const values = getValues();
    const persons = values.persons || [];

    // Validation selon le type de client
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      // Vérifier les documents pour chaque personne
      persons.forEach((person, index) => {
        const personRef = personDocumentRefs.current[index];
        const personFiles = personDocumentFiles[index];
        const personDocs = intakeLink.client?.persons?.[index]?.documents || [];
        
        const hasIdIdentity = personDocs.some((doc: any) => doc.kind === "ID_IDENTITY") ||
          personRef?.idIdentity.current?.files?.[0] || personFiles?.idIdentity;
        
        if (!hasIdIdentity) {
          errors.push(`La pièce d'identité de la personne ${person.firstName} ${person.lastName} est requise`);
        }
      });

      // Vérifier les documents communs (livret de famille, PACS)
      const primaryPerson = persons[0];
      const familyStatus = primaryPerson?.familyStatus;
      const clientDocs = intakeLink.client?.documents || [];
      
      if (familyStatus === FamilyStatus.MARIE) {
        const hasLivret = clientDocs.some((doc: any) => doc.kind === "LIVRET_DE_FAMILLE") ||
          livretDeFamilleRef.current?.files?.[0] || livretDeFamilleFile;
        if (!hasLivret) {
          errors.push("Le livret de famille est requis");
        }
      }
      if (familyStatus === FamilyStatus.PACS) {
        const hasPacs = clientDocs.some((doc: any) => doc.kind === "CONTRAT_DE_PACS") ||
          contratDePacsRef.current?.files?.[0] || contratDePacsFile;
        if (!hasPacs) {
          errors.push("Le contrat de PACS est requis");
        }
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      const entrepriseDocs = intakeLink.client?.entreprise?.documents || [];
      const hasKbis = entrepriseDocs.some((doc: any) => doc.kind === "KBIS") ||
        kbisRef.current?.files?.[0] || kbisFile;
      const hasStatutes = entrepriseDocs.some((doc: any) => doc.kind === "STATUTES") ||
        statutesRef.current?.files?.[0] || statutesFile;
      
      if (!hasKbis) {
        errors.push("Le KBIS est requis");
      }
      if (!hasStatutes) {
        errors.push("Les statuts sont requis");
      }
    }

    // Validation des documents du client (assurance et RIB - toujours requis)
    const clientDocs = intakeLink.client?.documents || [];
    const hasInsurance = clientDocs.some((doc: any) => doc.kind === "INSURANCE") ||
      insuranceTenantRef.current?.files?.[0] || insuranceTenantFile;
    const hasRib = clientDocs.some((doc: any) => doc.kind === "RIB") ||
      ribTenantRef.current?.files?.[0] || ribTenantFile;
    
    if (!hasInsurance) {
      errors.push("L'assurance locataire est requise");
    }
    if (!hasRib) {
      errors.push("Le RIB signé locataire est requis");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
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
      const fileValidation = validateRequiredFiles();
      if (!fileValidation.isValid) {
        toast.error("Veuillez joindre tous les documents requis", {
          description: fileValidation.errors.join(", "),
        });
        setSubmissionProgress({ step: 0, totalSteps: 3, currentStepName: "" });
        setIsSubmitting(false);
        return;
      }
      
      // Étape 3: Soumission du formulaire
      setSubmissionProgress({
        step: 2,
        totalSteps: 3,
        currentStepName: "Soumission du formulaire",
      });
      
      // Soumettre les données (les documents sont déjà uploadés via file-upload.tsx)
      await submitIntake({
        token: intakeLink.token,
        payload: data,
      });
      
      // Étape 4: Redirection
      setSubmissionProgress({
        step: 3,
        totalSteps: 3,
        currentStepName: "Redirection...",
      });
      
      // Petit délai pour afficher la dernière étape
      await new Promise(resolve => setTimeout(resolve, 500));
      
      router.push(`/intakes/${intakeLink.token}/success`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || "Erreur lors de la soumission";
      toast.error(errorMessage);
      console.error("Erreur lors de la soumission du formulaire:", error);
      setSubmissionProgress({ step: 0, totalSteps: 3, currentStepName: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    const errorMessages: string[] = [];
    
    Object.keys(errors).forEach((key) => {
      const error = errors[key];
      if (error?.message) {
        errorMessages.push(`${key}: ${error.message}`);
      }
    });

    if (errorMessages.length > 0) {
      if (errorMessages.length === 1) {
        toast.error(errorMessages[0]);
      } else {
        toast.error(`${errorMessages.length} erreurs de validation`, {
          description: errorMessages.slice(0, 3).join(", ") + (errorMessages.length > 3 ? "..." : ""),
        });
      }
    } else {
      toast.error("Veuillez corriger les erreurs du formulaire");
    }
  };

  // Validation asynchrone pour vérifier si l'email du locataire existe déjà
  const validateTenantEmail = async (email: string | undefined): Promise<string | true> => {
    // Si l'email est déjà défini côté client, pas besoin de valider
    if (client?.email) {
      return true;
    }
    
    // Si pas d'email ou email vide, la validation requise est gérée par le schéma Zod
    if (!email || email.trim() === "") {
      return true;
    }

    try {
      const response = await fetch("/api/clients/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.exists) {
        return "Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client.";
      }

      return true;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'email:", error);
      return true; // En cas d'erreur, on laisse passer pour ne pas bloquer l'utilisateur
    }
  };

  // Fonction pour valider tous les emails (entreprise et personnes) lors du nextStep ou save
  const validateAllEmails = async (): Promise<{ isValid: boolean; error?: string }> => {
    const values = form.getValues();
    
    // Si l'email est déjà défini côté client, pas besoin de valider
    if (client?.email) {
      return { isValid: true };
    }

    // Valider l'email de l'entreprise si PERSONNE_MORALE
    if (clientType === ClientType.PERSONNE_MORALE && values.entreprise?.email) {
      const result = await validateTenantEmail(values.entreprise.email);
      if (result !== true) {
        return { isValid: false, error: result };
      }
    }

    // Valider les emails des personnes si PERSONNE_PHYSIQUE
    if (clientType === ClientType.PERSONNE_PHYSIQUE && values.persons) {
      for (let i = 0; i < values.persons.length; i++) {
        const person = values.persons[i];
        if (person?.email) {
          const result = await validateTenantEmail(person.email);
          if (result !== true) {
            return { isValid: false, error: result };
          }
        }
      }
    }

    return { isValid: true };
  };


  const renderOverviewStep = () => {
    const property = intakeLink.property;
    const bail = intakeLink.bail;

    // Si pas de bien ou de bail, afficher un message informatif
    if (!property && !bail) {
      return (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              Récapitulatif
            </CardTitle>
            <CardDescription>
              Les informations du bien et du bail seront disponibles une fois que le propriétaire les aura renseignées.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    // Construire la liste des valeurs ouvertes par défaut
    const defaultOpenValues: string[] = [];
    if (property) defaultOpenValues.push("property");

    return (
      <Accordion type="multiple" defaultValue={defaultOpenValues} className="space-y-6">
        {/* Informations du bien */}
        {property && (
          <AccordionItem value="property" className="border-2 shadow-lg rounded-lg overflow-hidden">
            <AccordionTrigger className="bg-gradient-to-r from-primary/5 to-primary/10 py-4 px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-base font-bold">Voici le bien que vous souhaitez louer</div>
                  <div className="text-base mt-1 text-muted-foreground">
                    Les caractéristiques du logement
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-4 space-y-4">
              {property.fullAddress && (
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Adresse
                      </label>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        {property.fullAddress}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid gap-4 grid-cols-2">
                {property.surfaceM2 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Surface
                    </label>
                    <p className="text-base font-semibold text-primary">
                      {formatSurface(Number(property.surfaceM2))}
                    </p>
                  </div>
                )}
                {property.type && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Type de bien
                    </label>
                    <p className="text-base font-semibold">
                      {property.type.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid gap-4 grid-cols-2">
                {property.legalStatus && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Statut légal
                    </label>
                    <p className="text-base font-semibold">
                      {property.legalStatus.replace(/_/g, " ")}
                    </p>
                  </div>
                )}

                {property.owner &&  (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Propriétaire
                    </label>
                    <p className="text-base font-semibold">
                      {property.owner.type === ClientType.PERSONNE_PHYSIQUE ? property.owner.persons.find((p: any) => p.isPrimary)?.firstName + " " + property.owner.persons.find((p: any) => p.isPrimary)?.lastName : property.owner.entreprise?.legalName ||property.owner.entreprise?.name}
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Informations du bail */}
        {bail && (
          <AccordionItem value="bail" className="border-2 shadow-lg  rounded-lg overflow-hidden">
            <AccordionTrigger className="bg-gradient-to-r from-primary/5 to-primary/10 py-4 px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-base font-bold">Les informations du bail</div>
                  <div className="text-base mt-1 text-muted-foreground">
                    Détails financiers et conditions du contrat
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-4 space-y-6">
              {/* Informations financières mises en avant */}
              <div className="grid gap-4 grid-cols-2">
                {bail.rentAmount && (
                  <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Euro className="h-4 w-4 text-primary" />
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Loyer mensuel
                      </label>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(Number(bail.rentAmount))}
                    </p>
                  </div>
                )}
                {bail.monthlyCharges && Number(bail.monthlyCharges) > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Charges mensuelles
                      </label>
                    </div>
                    <p className="text-xl font-semibold">
                      {formatCurrency(Number(bail.monthlyCharges))}
                    </p>
                  </div>
                )}
                {bail.securityDeposit && Number(bail.securityDeposit) > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border-2 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Euro className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                      <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        Dépôt de garantie
                      </label>
                    </div>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                      {formatCurrency(Number(bail.securityDeposit))}
                    </p>
                  </div>
                )}
              </div>

              {/* Informations du contrat */}
              <div className="grid gap-4 grid-cols-2 pt-4 border-t">
                {bail.bailType && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Type de bail
                    </label>
                    <p className="text-base font-semibold">
                      {bail.bailType === BailType.BAIL_NU_3_ANS ? "Bail nu" : bail.bailType === BailType.BAIL_NU_6_ANS ? "Bail nu" : bail.bailType === BailType.BAIL_MEUBLE_1_ANS ? "Bail meublé" : bail.bailType === BailType.BAIL_MEUBLE_9_MOIS ? "Bail étudiant" : ""}
                    </p>
                  </div>
                )}
                {/*{bail.bailFamily && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Famille de bail
                    </label>
                    <p className="text-base font-semibold">
                      {bail.bailFamily.replace(/_/g, " ")}
                    </p>
                  </div>
                )}*/}
                {bail.paymentDay && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Jour de paiement
                    </label>
                    <p className="text-base font-semibold">
                      Le {bail.paymentDay} de chaque mois
                    </p>
                  </div>
                )}
              </div>

              {/* Dates du contrat */}
              {(bail.effectiveDate || bail.endDate) && (
                <div className="bg-muted/30 space-y-3 border-t pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <label className="text-sm font-semibold text-foreground">
                      Durée du contrat
                    </label>
                  </div>
                  {bail.bailType && (
                    <div>
                      {
                        bail.bailType === BailType.BAIL_NU_3_ANS ? "3 ans" : bail.bailType === BailType.BAIL_NU_6_ANS ? "6 ans" : bail.bailType === BailType.BAIL_MEUBLE_1_ANS ? "1 an" : bail.bailType === BailType.BAIL_MEUBLE_9_MOIS ? "9 mois" : ""
                      }
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bail.effectiveDate && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Date de début
                        </label>
                        <p className="mt-1 text-base font-semibold">
                          {formatDate(bail.effectiveDate)}
                        </p>
                      </div>
                    )}
                    {bail.endDate && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Date de fin
                        </label>
                        <p className="mt-1 text-base font-semibold">
                          {formatDate(bail.endDate)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    );
  };

  const renderClientTypeStep = () => {
    return (
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
                    setClientType(selectedType);
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
              <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderClientInfoStep = () => {
    const primaryPerson = personsWatch?.find((person) => person.isPrimary);
    const rootEmail = entrepriseWatch?.email || primaryPerson?.email || "";
    const rootPhone = entrepriseWatch?.phone || primaryPerson?.phone || "";
    const isEmailLocked = !!rootEmail;
    const isPhoneLocked = !rootEmail && !!rootPhone;
    const watchedFamilyStatuses = personFields.map((_, index) => 
      form.watch(`persons.${index}.familyStatus` as any)
    );
    
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
                {...form.register("entreprise.legalName")} 
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
                {...form.register("entreprise.registration")} 
              />
              {form.formState.errors.entreprise?.registration && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.entreprise.registration.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="entreprise.fullAddress">Adresse complète *</Label>
              <Textarea 
                id="entreprise.fullAddress" 
                {...form.register("entreprise.fullAddress")} 
              />
              {form.formState.errors.entreprise?.fullAddress && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.entreprise.fullAddress.message}
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entreprise.phone">Téléphone *</Label>
                <Controller
                  name="entreprise.phone"
                  control={form.control}
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value || undefined}
                      onChange={field.onChange}
                      defaultCountry="FR"
                      international
                      countryCallingCodeEditable={false}
                      placeholder="Numéro de téléphone"
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
                <Label htmlFor="entreprise.email">Email *</Label>
                <Input 
                  id="entreprise.email" 
                  type="email" 
                  {...form.register("entreprise.email", {
                    required: "L'email est requis",
                  })} 
                  disabled={isEmailLocked}
                />
                {form.formState.errors.entreprise?.email && (
                  <div className="text-sm text-destructive">
                    <p>{form.formState.errors.entreprise.email.message}</p>
                    {form.formState.errors.entreprise.email.message?.includes("déjà utilisé") && (
                      <p className="mt-1">
                        <a href="/#contact" className="underline hover:text-destructive/80 font-medium">
                          Cliquez ici pour contacter le service client
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entreprise.nationality">Nationalité *</Label>
              <Controller
                name="entreprise.nationality"
                control={form.control}
                render={({ field }) => (
                  <NationalitySelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                    placeholder="Sélectionner la nationalité"
                  />
                )}
              />
              {form.formState.errors.entreprise?.nationality && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.entreprise.nationality.message}
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
          <CardTitle>Informations du ou des locataires</CardTitle>
          <CardDescription>
            Renseignez les informations concernant le ou les locataires.
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
            {personFields.map((field, index) => {
              const person = personsWatch?.[index];
              return (
                <AccordionItem key={field.id} value={`person-${index}`}>
                  <AccordionTrigger className="flex flex-row items-start gap-2 py-4">
                    <div className="flex flex-row items-center justify-between w-full pr-4">
                      <div className="flex flex-row items-center gap-4">
                        <div className="flex flex-col items-start">
                          <div className="flex flex-row items-center gap-2">
                            {form.watch(`persons.${index}.firstName`) && form.watch(`persons.${index}.lastName`) 
                              ? form.watch(`persons.${index}.firstName`) + " " + form.watch(`persons.${index}.lastName`) 
                              : "Personne " + (index + 1)}
                            {index === 0 && " (Principale)"}
                            {hasPersonErrors(index) && (
                              <AlertCircle className="size-4 text-destructive shrink-0" />
                            )}
                            {index > 0 && (
                              <div
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPersonToDeleteIndex(index);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="size-4 text-red-400" />
                              </div>
                            )}
                          </div>
                          {hasPersonErrors(index) && getPersonMainError(index) && (
                            <p className="text-sm text-destructive w-full text-left pr-4">
                              Erreurs détectées.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {/* Informations de base */}
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`persons.${index}.firstName`}>Prénom *</Label>
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
                        <Label htmlFor={`persons.${index}.lastName`}>Nom *</Label>
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
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`persons.${index}.email`}>Email *</Label>
                        <Input
                          type="email"
                          {...form.register(`persons.${index}.email` as any, {
                            required: "L'email est requis",
                          })}
                          disabled={isEmailLocked && index === 0}
                          className={isEmailLocked && index === 0 ? "bg-muted cursor-not-allowed" : ""}
                        />
                        {isEmailLocked && index === 0 && (
                          <p className="text-sm text-muted-foreground">L'email ne peut pas être modifié</p>
                        )}
                        {form.formState.errors.persons?.[index]?.email && (
                          <div className="text-sm text-destructive">
                            <p>{form.formState.errors.persons[index]?.email?.message}</p>
                            {form.formState.errors.persons[index]?.email?.message?.includes("déjà utilisé") && (
                              <p className="mt-1">
                                <a href="/#contact" className="underline hover:text-destructive/80 font-medium">
                                  Cliquez ici pour contacter le service client
                                </a>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`persons.${index}.phone`}>Téléphone *</Label>
                        <Controller
                          name={`persons.${index}.phone` as any}
                          control={form.control}
                          render={({ field }) => (
                            <PhoneInput
                              value={field.value || undefined}
                              onChange={field.onChange}
                              defaultCountry="FR"
                              international
                              countryCallingCodeEditable={false}
                              placeholder="Numéro de téléphone"
                              disabled={isPhoneLocked && index === 0}
                            />
                          )}
                        />
                        {isPhoneLocked && index === 0 && (
                          <p className="text-sm text-muted-foreground">Le téléphone ne peut pas être modifié</p>
                        )}
                        {form.formState.errors.persons?.[index]?.phone && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.persons[index]?.phone?.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`persons.${index}.fullAddress`}>Adresse complète *</Label>
                      <Textarea
                        {...form.register(`persons.${index}.fullAddress` as any)}
                      />
                      {form.formState.errors.persons?.[index]?.fullAddress && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.persons[index]?.fullAddress?.message}
                        </p>
                      )}
                    </div>
                    {/* Informations complémentaires */}
                    <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`persons.${index}.profession`}>Profession *</Label>
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
                        <Label htmlFor={`persons.${index}.nationality`}>Nationalité *</Label>
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
                        <Label htmlFor={`persons.${index}.familyStatus`}>Statut familial *</Label>
                        <Controller
                          name={`persons.${index}.familyStatus` as any}
                          control={form.control}
                          render={({ field }) => (
                            <Select
                              value={field.value ?? undefined}
                              onValueChange={(value) => {
                                field.onChange(value);
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
                          <Label htmlFor={`persons.${index}.matrimonialRegime`}>Régime matrimonial *</Label>
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
                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`persons.${index}.birthPlace`}>Lieu de naissance *</Label>
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
                        <Label htmlFor={`persons.${index}.birthDate`}>Date de naissance *</Label>
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
              );
            })}
          </Accordion>
          {personFields.length < 2 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                appendPerson({ ...emptyPerson } as any);
                const newIndex = personFields.length;
                setOpenAccordionValue(`person-${newIndex}`);
              }}
              className="w-full"
            >
              Ajouter une personne
            </Button>
          )}

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
                    return `Êtes-vous sûr de vouloir supprimer ${personName} ?`;
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
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    if (personToDeleteIndex === null) return;
                    await handleRemovePerson(personToDeleteIndex);
                    toast.success("Personne supprimée");
                    setDeleteDialogOpen(false);
                    setPersonToDeleteIndex(null);
                  }}
                >
                  Confirmer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Empêcher la soumission automatique avec Entrée sauf si on est sur le dernier step et qu'on clique explicitement sur Soumettre
    if (e.key === 'Enter' && currentStep < STEPS.length - 1) {
      e.preventDefault();
    }
  };

  const renderDocuments = () => {
    const persons = personsWatch || [];
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pièces jointes</CardTitle>
          <CardDescription>Ajoutez les documents obligatoires.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documents Locataire *</h3>
            {clientType === ClientType.PERSONNE_MORALE ? (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                <DocumentUploaded token={intakeLink.token} documentKind="KBIS">
                  <FileUpload
                    label="KBIS *"
                    value={kbisFile}
                    onChange={(file) => {
                      setKbisFile(file);
                      if (kbisRef.current) {
                        const dt = new DataTransfer();
                        if (file) dt.items.add(file);
                        kbisRef.current.files = dt.files;
                      }
                    }}
                    disabled={isSubmitting}
                    uploadToken={intakeLink.token}
                    documentKind="KBIS"
                    documentClientId={client?.id}
                    onUploadStateChange={handleUploadStateChange}
                  />
                </DocumentUploaded>
                <DocumentUploaded token={intakeLink.token} documentKind="STATUTES">
                  <FileUpload
                    label="Statuts *"
                    value={statutesFile}
                    onChange={(file) => {
                      setStatutesFile(file);
                      if (statutesRef.current) {
                        const dt = new DataTransfer();
                        if (file) dt.items.add(file);
                        statutesRef.current.files = dt.files;
                      }
                    }}
                    disabled={isSubmitting}
                    uploadToken={intakeLink.token}
                    documentKind="STATUTES"
                    documentClientId={client?.id}
                    onUploadStateChange={handleUploadStateChange}
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
                  const personRefs = personDocumentRefs.current[index];
                  const personFiles = personDocumentFiles[index] || { idIdentity: null };
                  
                  return (
                    <div key={index} className="space-y-4 border rounded-lg p-4">
                      <h4 className="text-md font-medium">
                        Documents de {personName} {index === 0 && "(Principale)"} *
                      </h4>
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
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
                            disabled={isSubmitting}
                            uploadToken={intakeLink.token}
                            documentKind="ID_IDENTITY"
                            documentClientId={client?.id}
                            personIndex={index}
                            onUploadStateChange={handleUploadStateChange}
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
                          value={livretDeFamilleFile}
                          onChange={(file) => {
                            setLivretDeFamilleFile(file);
                            if (livretDeFamilleRef.current) {
                              const dt = new DataTransfer();
                              if (file) dt.items.add(file);
                              livretDeFamilleRef.current.files = dt.files;
                            }
                          }}
                          disabled={isSubmitting}
                          uploadToken={intakeLink.token}
                          documentKind="LIVRET_DE_FAMILLE"
                          documentClientId={client?.id}
                          onUploadStateChange={handleUploadStateChange}
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
                          value={contratDePacsFile}
                          onChange={(file) => {
                            setContratDePacsFile(file);
                            if (contratDePacsRef.current) {
                              const dt = new DataTransfer();
                              if (file) dt.items.add(file);
                              contratDePacsRef.current.files = dt.files;
                            }
                          }}
                          disabled={isSubmitting}
                          uploadToken={intakeLink.token}
                          documentKind="CONTRAT_DE_PACS"
                          documentClientId={client?.id}
                          onUploadStateChange={handleUploadStateChange}
                        />
                      </DocumentUploaded>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Documents du locataire (assurance et RIB) */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <DocumentUploaded token={intakeLink.token} documentKind="INSURANCE" clientId={client?.id}>
                <FileUpload
                  label="Assurance locataire *"
                  value={insuranceTenantFile}
                  onChange={(file) => {
                    setInsuranceTenantFile(file);
                    if (insuranceTenantRef.current) {
                      const dt = new DataTransfer();
                      if (file) dt.items.add(file);
                      insuranceTenantRef.current.files = dt.files;
                    }
                  }}
                  disabled={isSubmitting}
                  uploadToken={intakeLink.token}
                  documentKind="INSURANCE"
                  documentClientId={client?.id}
                  onUploadStateChange={handleUploadStateChange}
                />
              </DocumentUploaded>
              <DocumentUploaded token={intakeLink.token} documentKind="RIB" clientId={client?.id}>
                <FileUpload
                  label="RIB signé locataire *"
                  value={ribTenantFile}
                  onChange={(file) => {
                    setRibTenantFile(file);
                    if (ribTenantRef.current) {
                      const dt = new DataTransfer();
                      if (file) dt.items.add(file);
                      ribTenantRef.current.files = dt.files;
                    }
                  }}
                  disabled={isSubmitting}
                  uploadToken={intakeLink.token}
                  documentKind="RIB"
                  documentClientId={client?.id}
                  onUploadStateChange={handleUploadStateChange}
                />
              </DocumentUploaded>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStepContent = () => {
    const stepId = STEPS[currentStep]?.id;
    switch (stepId) {
      case "overview":
        return renderOverviewStep();
      case "clientType":
        return renderClientTypeStep();
      case "clientInfo":
        return renderClientInfoStep();
      case "documents":
        return renderDocuments();
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Loader overlay */}
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
                  <Progress 
                    value={(submissionProgress.step / submissionProgress.totalSteps) * 100} 
                    className="h-3"
                  />
                  
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
      
      <form 
        onSubmit={form.handleSubmit(onSubmit, onError)} 
        onKeyDown={handleFormKeyDown}
        className="space-y-4"
      >
      {/* Stepper fixe */}
      <div className="fixed top-18 left-0 right-0 bg-background border-b border-border/40 z-40 ">
        <div className="w-full">
          <Stepper 
            steps={STEPS} 
            currentStep={currentStep}
            onStepClick={(step) => {
              const stepId = STEPS[step]?.id;
              // Permettre de revenir en arrière OU de cliquer sur overview ou clientType pour permettre de les modifier
              if (step < currentStep || stepId === "overview" || stepId === "clientType") {
                setCurrentStep(step);
              }
            }}
          />
        </div>
      </div>
      
      {/* Espace pour le stepper fixe */}
      
      <div >     
        {renderStepContent()}
      </div> 
      {/* Inputs file cachés pour les refs */}
      <input type="file" ref={kbisRef} name="kbis" className="hidden" />
      <input type="file" ref={statutesRef} name="statutes" className="hidden" />
      <input type="file" ref={livretDeFamilleRef} name="livretDeFamille" className="hidden" />
      <input type="file" ref={contratDePacsRef} name="contratDePacs" className="hidden" />
      <input type="file" ref={insuranceTenantRef} name="insuranceTenant" className="hidden" />
      <input type="file" ref={ribTenantRef} name="ribTenant" className="hidden" />
      {/* Inputs file cachés pour les documents par personne */}
      {personsWatch?.map((_, index) => {
        const personRefs = personDocumentRefs.current[index];
        return (
          <React.Fragment key={index}>
            <input type="file" ref={personRefs?.idIdentity} name={`person_${index}_idIdentity`} className="hidden" />
          </React.Fragment>
        );
      })}

      <div className="p-3 sm:p-4 z-50">
        <div className="max-w-2xl mx-auto flex flex-row justify-between gap-3 sm:gap-4">
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
                onClick={handleNext}
                disabled={isSubmitting || isSaving || isFileUploading}
                size="icon"
                className="h-10 w-10"
              >
                <ArrowRightIcon className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={() => form.handleSubmit(onSubmit, onError)()}
                disabled={isSubmitting || isSaving || isFileUploading}
                className="sm:w-auto"
              >
                {isSubmitting ? "Envoi en cours..." : "Soumettre"}
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Espace pour éviter que le contenu soit caché sous les boutons fixes */}
      <div className="h-10" />
      </form>
    </div>
  );
}