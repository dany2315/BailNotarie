"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInputGroup } from "@/components/ui/number-input-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { submitIntake, savePartialIntake, getIntakeLinkByToken } from "@/lib/actions/intakes";
import { DocumentUploaded } from "./document-uploaded";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ownerFormSchema } from "@/lib/zod/client";
import { ClientType, FamilyStatus, MatrimonialRegime, BailType, BailFamille, PropertyStatus, BienType, BienLegalStatus, ProfilType } from "@prisma/client";
import { FileUpload } from "@/components/ui/file-upload";
import { Stepper } from "@/components/ui/stepper";
import { ArrowLeftIcon, ArrowRightIcon, Loader2, InfoIcon, Building2, User2, Building } from "lucide-react";
import Image from "next/image";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";
import useIsMobile from "@/hooks/useIsMobile";

type OwnerFormData = z.infer<typeof ownerFormSchema>;

const STEPS = [
  { title: "Informations de base" },
  { title: "Informations complémentaires" },
  { title: "Informations du bien" },
  { title: "Informations du bail" },
  { title: "Informations du locataire" },
  { title: "Pièces jointes" },
];

export function OwnerIntakeForm({ intakeLink: initialIntakeLink }: { intakeLink: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();
  
  // États pour stocker les données qui peuvent être rafraîchies après l'upload
  const [intakeLink, setIntakeLink] = useState(initialIntakeLink);
  
  // Recalculer client, property, bail et tenant quand intakeLink change
  const client = useMemo(() => intakeLink.client, [intakeLink]);
  const property = useMemo(() => intakeLink.property, [intakeLink]);
  const bail = useMemo(() => intakeLink.bail, [intakeLink]);
  const tenant = useMemo(() => bail?.parties?.find((party: any) => party.profilType === ProfilType.LOCATAIRE), [bail]);

  const [clientType, setClientType] = useState<ClientType | "">(client?.type || "");
  
  // Refs pour les fichiers
  const kbisRef = useRef<HTMLInputElement>(null);
  const statutesRef = useRef<HTMLInputElement>(null);
  const birthCertRef = useRef<HTMLInputElement>(null);
  const idIdentityRef = useRef<HTMLInputElement>(null);
  const livretDeFamilleRef = useRef<HTMLInputElement>(null);
  const contratDePacsRef = useRef<HTMLInputElement>(null);
  const diagnosticsRef = useRef<HTMLInputElement>(null);
  const titleDeedRef = useRef<HTMLInputElement>(null);
  const reglementCoproprieteRef = useRef<HTMLInputElement>(null);
  const cahierChargeLotissementRef = useRef<HTMLInputElement>(null);
  const statutAssociationSyndicaleRef = useRef<HTMLInputElement>(null);
  const insuranceOwnerRef = useRef<HTMLInputElement>(null);
  const ribOwnerRef = useRef<HTMLInputElement>(null);

  // États pour les fichiers sélectionnés (pour l'affichage)
  const [kbisFile, setKbisFile] = useState<File | null>(null);
  const [statutesFile, setStatutesFile] = useState<File | null>(null);
  const [birthCertFile, setBirthCertFile] = useState<File | null>(null);
  const [idIdentityFile, setIdIdentityFile] = useState<File | null>(null);
  const [livretDeFamilleFile, setLivretDeFamilleFile] = useState<File | null>(null);
  const [contratDePacsFile, setContratDePacsFile] = useState<File | null>(null);
  const [diagnosticsFile, setDiagnosticsFile] = useState<File | null>(null);
  const [titleDeedFile, setTitleDeedFile] = useState<File | null>(null);
  const [reglementCoproprieteFile, setReglementCoproprieteFile] = useState<File | null>(null);
  const [cahierChargeLotissementFile, setCahierChargeLotissementFile] = useState<File | null>(null);
  const [statutAssociationSyndicaleFile, setStatutAssociationSyndicaleFile] = useState<File | null>(null);
  const [insuranceOwnerFile, setInsuranceOwnerFile] = useState<File | null>(null);
  const [ribOwnerFile, setRibOwnerFile] = useState<File | null>(null);

  const initialValues = useRef<OwnerFormData>({
    clientId: intakeLink.clientId,
    type: client?.type || ("" as any),
    firstName: client?.firstName || "",
    lastName: client?.lastName || "",
    email: client?.email || "",
    phone: client?.phone || "",
    fullAddress: client?.fullAddress || "",
    nationality: client?.nationality || "",
    profession: client?.profession || "",
    familyStatus: client?.familyStatus || undefined,
    matrimonialRegime: client?.matrimonialRegime || undefined,
    birthPlace: client?.birthPlace || "",
    birthDate: client?.birthDate ? client.birthDate.split('T')[0] : undefined,
    legalName: client?.legalName || "",
    registration: client?.registration || "",

    propertyLabel:property?.label || "",
    propertyFullAddress:property?.fullAddress || "",
    propertySurfaceM2:property?.surfaceM2?.toString() || "",
    propertyType:property?.type  ?? undefined,
    propertyLegalStatus:property?.legalStatus ?? undefined,
    propertyStatus:property?.status || PropertyStatus.NON_LOUER,
    bailType:bail?.bailType || BailType.BAIL_NU_3_ANS,
    bailFamily:bail?.bailFamily || BailFamille.HABITATION,
    bailRentAmount:bail?.rentAmount?.toString() || "",
    bailEffectiveDate:bail?.effectiveDate ||  "",
    bailEndDate:bail?.endDate || "",
    bailMonthlyCharges:bail?.monthlyCharges?.toString() || "",
    bailSecurityDeposit:bail?.securityDeposit?.toString() || "",
    bailPaymentDay:bail?.paymentDay?.toString() || "",

    tenantEmail:tenant?.email || "",

    kbis: (client?.documents?.find((document: any) => document.kind === "KBIS")?.file as File) || null,
    statutes: (client?.documents?.find((document: any) => document.kind === "STATUTES")?.file as File) || null,
    birthCert: (client?.documents?.find((document: any) => document.kind === "BIRTH_CERT")?.file as File) || null,
    idIdentity: (client?.documents?.find((document: any) => document.kind === "ID_IDENTITY")?.file as File) || null,
    livretDeFamille: (client?.documents?.find((document: any) => document.kind === "LIVRET_DE_FAMILLE")?.file as File) || null,
    contratDePacs: (client?.documents?.find((document: any) => document.kind === "CONTRAT_DE_PACS")?.file as File) || null,
    diagnostics: (property?.documents?.find((document: any) => document.kind === "DIAGNOSTICS")?.file as File) || null,
    titleDeed: (property?.documents?.find((document: any) => document.kind === "TITLE_DEED")?.file as File) || null,
    reglementCopropriete: (property?.documents?.find((document: any) => document.kind === "REGLEMENT_COPROPRIETE")?.file as File) || null,
    cahierChargeLotissement: (property?.documents?.find((document: any) => document.kind === "CAHIER_DE_CHARGE_LOTISSEMENT")?.file as File) || null,
    statutAssociationSyndicale: (property?.documents?.find((document: any) => document.kind === "STATUT_DE_LASSOCIATION_SYNDICALE")?.file as File) || null,
    insuranceOwner: (property?.documents?.find((document: any) => document.kind === "INSURANCE")?.file as File) || null,
    ribOwner: (property?.documents?.find((document: any) => document.kind === "RIB")?.file as File) || null,
  });

  const form = useForm<OwnerFormData>({
    resolver: zodResolver(ownerFormSchema) as any,
    defaultValues: initialValues.current,
  });
  console.log("property", property);
  
  // Fonction pour déterminer la première étape incomplète
  const getFirstIncompleteStep = (): number => {
    const values = initialValues.current;
    const currentClientType = values.type;
    
    // Fonction helper pour vérifier si une valeur est vide
    const isEmpty = (val: any): boolean => {
      return val === undefined || val === null || val === "" || (typeof val === 'string' && val.trim() === "");
    };
    
    // Vérifier l'étape 0: Informations de base
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      if (isEmpty(values.type) || isEmpty(values.firstName) || isEmpty(values.lastName) || 
          isEmpty(values.email) || isEmpty(values.phone) || isEmpty(values.fullAddress)) {
        return 0;
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      if (isEmpty(values.type) || isEmpty(values.legalName) || isEmpty(values.email) || 
          isEmpty(values.phone) || isEmpty(values.fullAddress)) {
        return 0;
      }
    } else {
      return 0; // Type non défini
    }

    // Vérifier l'étape 1: Informations complémentaires
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      if (isEmpty(values.profession) || isEmpty(values.familyStatus) || 
          isEmpty(values.birthPlace) || isEmpty(values.birthDate) || isEmpty(values.nationality)) {
        return 1;
      }
      if (values.familyStatus === FamilyStatus.MARIE && isEmpty(values.matrimonialRegime)) {
        return 1;
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      if (isEmpty(values.registration) || isEmpty(values.nationality)) {
        return 1;
      }
    }

    // Vérifier l'étape 2: Informations du bien
    if (isEmpty(values.propertyFullAddress) || isEmpty(values.propertySurfaceM2) || 
        isEmpty(values.propertyType) || isEmpty(values.propertyLegalStatus)) {
      return 2;
    }

    // Vérifier l'étape 3: Informations du bail
    if (isEmpty(values.bailType) || isEmpty(values.bailRentAmount) || 
        isEmpty(values.bailEffectiveDate) || isEmpty(values.bailMonthlyCharges) || 
        isEmpty(values.bailSecurityDeposit) || isEmpty(values.bailPaymentDay)) {
      return 3;
    }

    // Vérifier l'étape 4: Informations du locataire
    if (isEmpty(values.tenantEmail)) {
      return 4;
    }

    // Vérifier l'étape 5: Pièces jointes
    // Utiliser intakeLink directement pour avoir les données à jour
    // Vérifier les documents selon le type de client
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      const clientDocs = intakeLink.client?.documents || [];
      const hasBirthCert = clientDocs.some((doc: any) => doc.kind === "BIRTH_CERT");
      const hasIdIdentity = clientDocs.some((doc: any) => doc.kind === "ID_IDENTITY");
      
      if (!hasBirthCert || !hasIdIdentity) {
        return 5;
      }
      
      if (values.familyStatus === FamilyStatus.MARIE) {
        const hasLivret = clientDocs.some((doc: any) => doc.kind === "LIVRET_DE_FAMILLE");
        if (!hasLivret) {
          return 5;
        }
      }
      if (values.familyStatus === FamilyStatus.PACS) {
        const hasPacs = clientDocs.some((doc: any) => doc.kind === "CONTRAT_DE_PACS");
        if (!hasPacs) {
          return 5;
        }
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      const clientDocs = intakeLink.client?.documents || [];
      const hasKbis = clientDocs.some((doc: any) => doc.kind === "KBIS");
      const hasStatutes = clientDocs.some((doc: any) => doc.kind === "STATUTES");
      
      if (!hasKbis || !hasStatutes) {
        return 5;
      }
    }

    // Vérifier les documents du bien
    const propertyDocs = intakeLink.property?.documents || [];
    const hasDiagnostics = propertyDocs.some((doc: any) => doc.kind === "DIAGNOSTICS");
    const hasTitleDeed = propertyDocs.some((doc: any) => doc.kind === "TITLE_DEED");
    
    if (!hasDiagnostics || !hasTitleDeed) {
      return 5;
    }

    // Vérifier les documents selon le statut légal du bien
    if (values.propertyLegalStatus === BienLegalStatus.CO_PROPRIETE) {
      const hasReglement = propertyDocs.some((doc: any) => doc.kind === "REGLEMENT_COPROPRIETE");
      if (!hasReglement) {
        return 5;
      }
    } else if (values.propertyLegalStatus === BienLegalStatus.LOTISSEMENT) {
      const hasCahier = propertyDocs.some((doc: any) => doc.kind === "CAHIER_DE_CHARGE_LOTISSEMENT");
      const hasStatut = propertyDocs.some((doc: any) => doc.kind === "STATUT_DE_LASSOCIATION_SYNDICALE");
      if (!hasCahier || !hasStatut) {
        return 5;
      }
    }

    // Vérifier les documents du bail
    const bailDocs = intakeLink.bail?.documents || [];
    const hasInsurance = bailDocs.some((doc: any) => doc.kind === "INSURANCE");
    const hasRib = bailDocs.some((doc: any) => doc.kind === "RIB");
    
    if (!hasInsurance || !hasRib) {
      return 5;
    }

    // Toutes les étapes sont complètes, retourner la dernière étape
    return STEPS.length - 1;
  };

  // Initialiser currentStep avec la première étape incomplète
  useEffect(() => {
    const firstIncompleteStep = getFirstIncompleteStep();
    setCurrentStep(firstIncompleteStep);
  }, []);

  // Réinitialiser matrimonialRegime si familyStatus change et n'est plus MARIE
  const familyStatus = form.watch("familyStatus");
  useEffect(() => {
    if (familyStatus !== FamilyStatus.MARIE) {
      form.setValue("matrimonialRegime", undefined as any);
    }
  }, [familyStatus, form]);

  // Synchroniser les valeurs du formulaire après la sauvegarde
  // pour s'assurer que les valeurs enregistrées sont affichées correctement


  // Fonction pour vérifier si les données d'un step ont changé
  const hasStepDataChanged = (step: number): boolean => {
    const fieldsToCheck = getFieldsForStep(step);
    const currentValues = form.getValues();
    const initial = initialValues.current;

    // Pour le step 5 (Pièces jointes), vérifier uniquement les fichiers
    if (step === 5) {
      // Mapper les noms de fichiers aux types de documents
      const fileToDocumentKind: Record<string, string> = {
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

      const fileRefs = [
        { ref: kbisRef, name: "kbis" },
        { ref: statutesRef, name: "statutes" },
        { ref: birthCertRef, name: "birthCert" },
        { ref: idIdentityRef, name: "idIdentity" },
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

      // Récupérer tous les documents existants
      const existingDocuments = [
        ...(client?.documents || []),
        ...(property?.documents || []),
      ];

      // Vérifier s'il y a de nouveaux fichiers (fichiers qui n'existaient pas initialement)
      const hasNewFiles = fileRefs.some(({ ref, name }) => {
        // Si un fichier est présent dans le ref
        if (ref.current?.files && ref.current.files[0]) {
          // Vérifier si un document de ce type existait déjà
          const documentKind = fileToDocumentKind[name];
          if (documentKind) {
            const documentExists = existingDocuments.some((doc: any) => doc.kind === documentKind);
            // Si le document n'existait pas, c'est un nouveau fichier = changement
            return !documentExists;
          }
        }
        return false;
      });

      return hasNewFiles;
    }

    // Pour les autres steps, vérifier les champs de données
    for (const field of fieldsToCheck) {
      const currentValue = currentValues[field];
      const initialValue = initial[field];

      // Normaliser les valeurs pour la comparaison
      const normalizeValue = (val: any): string => {
        if (val === undefined || val === null || val === "") return "";
        if (val && typeof val === 'object' && 'toISOString' in val && typeof val.toISOString === 'function') {
          return val.toISOString().split('T')[0];
        }
        return String(val).trim();
      };

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
      }
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des données:", error);
    }
  };

  // Fonction pour uploader les fichiers via l'API route
  const uploadFiles = async (shouldDispatchEvent: boolean = true): Promise<void> => {
    const fileRefs = [
      { ref: kbisRef, name: "kbis" },
      { ref: statutesRef, name: "statutes" },
      { ref: birthCertRef, name: "birthCert" },
      { ref: idIdentityRef, name: "idIdentity" },
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

    // Mapper les noms de fichiers aux types de documents
    const fileToDocumentKind: Record<string, string> = {
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

    // Mapping des noms de fichiers aux états correspondants
    const fileStateMap: Record<string, File | null> = {
      kbis: kbisFile,
      statutes: statutesFile,
      birthCert: birthCertFile,
      idIdentity: idIdentityFile,
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

    // Récupérer tous les documents existants
    const existingDocuments = [
      ...(client?.documents || []),
      ...(property?.documents || []),
    ];
    
    // Créer un FormData pour les fichiers uniquement
    const filesFormData = new FormData();
    filesFormData.append("token", intakeLink.token);
    
    // Ajouter les IDs si disponibles (l'API route les récupérera depuis l'intakeLink si non fournis)
    const data = form.getValues();
    if (data.clientId) filesFormData.append("clientId", data.clientId);
    // propertyId et bailId seront récupérés par l'API route depuis l'intakeLink
    
    // Liste des fichiers uploadés pour nettoyer les refs et états après
    const uploadedFiles: Array<{ ref: React.RefObject<HTMLInputElement | null>, stateSetter: (file: File | null) => void, name: string }> = [];
    
    // Ajouter uniquement les fichiers qui n'existent pas déjà dans la base de données
    fileRefs.forEach(({ ref, name }) => {
      const documentKind = fileToDocumentKind[name];
      if (!documentKind) return;

      // Vérifier si un document de ce type existe déjà
      const documentExists = existingDocuments.some((doc: any) => doc.kind === documentKind);
      
      if (documentExists) {
        // Le document existe déjà, ne pas l'uploader
        // Nettoyer le ref et l'état pour éviter les ré-uploads
        if (ref.current) {
          ref.current.value = "";
        }
        const stateSetterMap: Record<string, ((file: File | null) => void) | null> = {
          kbis: setKbisFile,
          statutes: setStatutesFile,
          birthCert: setBirthCertFile,
          idIdentity: setIdIdentityFile,
          livretDeFamille: setLivretDeFamilleFile,
          contratDePacs: setContratDePacsFile,
          diagnostics: setDiagnosticsFile,
          titleDeed: setTitleDeedFile,
          reglementCopropriete: setReglementCoproprieteFile,
          cahierChargeLotissement: null, // Pas d'état pour ce fichier
          statutAssociationSyndicale: null, // Pas d'état pour ce fichier
          insuranceOwner: null, // Pas d'état pour ce fichier
          ribOwner: null, // Pas d'état pour ce fichier
        };
        const stateSetter = stateSetterMap[name];
        if (stateSetter) {
          stateSetter(null);
        }
        return;
      }

      // Le document n'existe pas, vérifier s'il y a un fichier à uploader
      const fileFromState = fileStateMap[name];
      const fileFromRef = ref.current?.files?.[0];
      
      if (fileFromState || fileFromRef) {
        // Prioriser l'état du fichier s'il existe, sinon utiliser le ref
        if (fileFromState) {
          filesFormData.append(name, fileFromState);
        } else if (fileFromRef) {
          filesFormData.append(name, fileFromRef);
        }
        
        // Ajouter à la liste pour nettoyer après l'upload
        const stateSetterMap: Record<string, ((file: File | null) => void) | null> = {
          kbis: setKbisFile,
          statutes: setStatutesFile,
          birthCert: setBirthCertFile,
          idIdentity: setIdIdentityFile,
          livretDeFamille: setLivretDeFamilleFile,
          contratDePacs: setContratDePacsFile,
          diagnostics: setDiagnosticsFile,
          titleDeed: setTitleDeedFile,
          reglementCopropriete: setReglementCoproprieteFile,
          cahierChargeLotissement: setCahierChargeLotissementFile,
          statutAssociationSyndicale: setStatutAssociationSyndicaleFile,
          insuranceOwner: setInsuranceOwnerFile,
          ribOwner: setRibOwnerFile,
        };
        const stateSetter = stateSetterMap[name];
        
        if (stateSetter) {
          uploadedFiles.push({ ref, stateSetter, name });
        }
      }
    });

    // Si aucun fichier à uploader, ne rien faire
    // Vérifier si le FormData contient des fichiers (plus que juste le token)
    const formDataKeys = Array.from(filesFormData.keys());
    const hasFilesToUpload = formDataKeys.some(key => key !== "token" && key !== "clientId");
    
    if (!hasFilesToUpload) {
      return; // Pas de fichiers à uploader
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

    // Nettoyer les refs et les états après un upload réussi
    uploadedFiles.forEach(({ ref, stateSetter }) => {
      if (ref.current) {
        ref.current.value = "";
      }
      if (stateSetter) {
        stateSetter(null);
      }
    });

    // Déclencher l'événement pour recharger les documents dans les composants DocumentUploaded
    // (seulement lors de l'enregistrement, pas lors de la soumission finale)
    if (shouldDispatchEvent) {
      window.dispatchEvent(new CustomEvent(`document-uploaded-${intakeLink.token}`));
    }
  };

  const saveCurrentStep = async (skipIfUnchanged: boolean = false) => {
    // Si skipIfUnchanged est true, vérifier si les données ont changé
    if (skipIfUnchanged && !hasStepDataChanged(currentStep)) {
      // Les données n'ont pas changé, pas besoin de sauvegarder
      return;
    }

    setIsSaving(true);
    try {
      // Si on est à l'étape 0 et que l'email doit être validé, vérifier avant de sauvegarder
      if (currentStep === 0 && !client?.email && client?.phone) {
        const emailValue = form.getValues("email");
        if (emailValue && emailValue.trim() !== "") {
          // Valider l'email avant de sauvegarder
          const emailValid = await form.trigger("email");
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (!emailValid || form.formState.errors.email) {
            const emailError = form.formState.errors.email?.message;
            if (emailError?.includes("déjà utilisé")) {
              toast.error(emailError, {
                description: (
                  <a href="/#contact" className="underline font-medium">
                    Cliquez ici pour contacter le service client
                  </a>
                ),
                duration: 10000,
              });
              setIsSaving(false);
              throw new Error(emailError);
            }
          }
        }
      }
      
      const data = form.getValues();
      
      // Si on est sur l'étape des documents (step 5), uploader les fichiers
      if (currentStep === 5) {
        await uploadFiles();
        // Déclencher l'événement pour recharger les documents après l'upload
        window.dispatchEvent(new CustomEvent(`document-uploaded-${intakeLink.token}`));
      }
      
      // Sauvegarder les données sans les fichiers
      await savePartialIntake({
        token: intakeLink.token,
        payload: data,
      });
      
      // Rafraîchir les données après la sauvegarde seulement si nécessaire
      // (pour mettre à jour les valeurs du formulaire si elles ont changé côté serveur)
      await refreshIntakeLinkData();
      
      // Mettre à jour les valeurs initiales avec les valeurs actuelles du formulaire
      // pour que la comparaison fonctionne correctement lors des prochains changements d'étape
      const currentFormValues = form.getValues();
      Object.keys(currentFormValues).forEach((key) => {
        (initialValues.current as any)[key] = currentFormValues[key as keyof OwnerFormData];
      });
      
      toast.success("Données enregistrées avec succès");
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || "Erreur lors de l'enregistrement";
        
        // Si l'erreur contient le message sur l'email existant, afficher un toast avec le lien
        if (errorMessage.includes("déjà utilisé")) {
          toast.error(errorMessage.replace(" : /#contact", "").replace(" /#contact", ""), {
            description: (
              <a href="/#contact" className="underline font-medium">
                Cliquez ici pour contacter le service client
              </a>
            ),
            duration: 10000, // Afficher plus longtemps pour que l'utilisateur puisse cliquer
          });
          // Relancer l'erreur pour que handleNext puisse la capturer et bloquer la progression
          throw error;
        } else {
          toast.error(errorMessage);
          // Pour les autres erreurs, on peut aussi les relancer si nécessaire
          // Mais pour l'instant, on ne relance que les erreurs critiques
        }
        
        console.error("Erreur lors de l'enregistrement:", error);
      } finally {
        setIsSaving(false);
      }
  };

  const handleNext = async () => {
    // Valider les champs de l'étape actuelle
    const fieldsToValidate = getFieldsForStep(currentStep);
    const currentValues = form.getValues();
    
    console.log("Champs à valider:", fieldsToValidate);
    console.log("Valeurs actuelles:", currentValues);
    
    // Validation manuelle pour vérifier les valeurs vides
    const hasEmptyFields = fieldsToValidate.some((field) => {
      const value = currentValues[field];
      // Pour les champs string, vérifier si c'est vide
      if (typeof value === 'string' && value.trim() === '') {
        return true;
      }
      // Pour les enums, vérifier si c'est undefined
      if (value === undefined || value === null) {
        return true;
      }
      return false;
    });
    
    if (hasEmptyFields) {
      console.log("Champs vides détectés, validation manuelle échouée");

      console.log("Erreurs:", form);
      toast.error("Veuillez remplir tous les champs requis avant de passer à l'étape suivante");
      // Déclencher la validation pour afficher les erreurs sous les champs
      await form.trigger(fieldsToValidate as any);
      return;
    }
    
    // Si on est à l'étape 0 (informations personnelles), forcer la validation de l'email du propriétaire en premier
    if (currentStep === 0 && fieldsToValidate.includes("email") && !client?.email && client?.phone) {
      const emailValue = currentValues.email;
      if (emailValue && emailValue.trim() !== "") {
        // Valider spécifiquement l'email d'abord avec un délai pour laisser la validation asynchrone se terminer
        const emailValid = await form.trigger("email");
        
        // Attendre un peu pour s'assurer que la validation asynchrone est terminée
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Vérifier à nouveau les erreurs après le délai
        const errorsAfterDelay = form.formState.errors;
        
        if (!emailValid || errorsAfterDelay.email) {
          const emailError = errorsAfterDelay.email?.message || form.formState.errors.email?.message;
          if (emailError?.includes("déjà utilisé")) {
            toast.error(emailError, {
              description: (
                <a href="/#contact" className="underline font-medium">
                  Cliquez ici pour contacter le service client
                </a>
              ),
              duration: 10000,
            });
            return; // Bloquer la progression si l'email est déjà utilisé
          }
        }
      }
    }
    
    // Si on est à l'étape 4 (informations du locataire), forcer la validation de tenantEmail en premier
    if (currentStep === 4 && fieldsToValidate.includes("tenantEmail")) {
      const tenantEmailValue = currentValues.tenantEmail;
      if (tenantEmailValue && tenantEmailValue.trim() !== "") {
        // Valider spécifiquement tenantEmail d'abord avec un délai pour laisser la validation asynchrone se terminer
        const tenantEmailValid = await form.trigger("tenantEmail");
        
        // Attendre un peu pour s'assurer que la validation asynchrone est terminée
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Vérifier à nouveau les erreurs après le délai
        const errorsAfterDelay = form.formState.errors;
        
        if (!tenantEmailValid || errorsAfterDelay.tenantEmail) {
          const tenantEmailError = errorsAfterDelay.tenantEmail?.message || form.formState.errors.tenantEmail?.message;
          if (tenantEmailError?.includes("déjà utilisé")) {
            toast.error(tenantEmailError, {
              description: (
                <a href="/#contact" className="underline font-medium">
                  Cliquez ici pour contacter le service client
                </a>
              ),
              duration: 10000,
            });
            return; // Bloquer la progression si l'email est déjà utilisé
          }
        }
      }
    }
    
    const isValid = await form.trigger(fieldsToValidate as any);
    console.log("Validation result:", isValid);
    console.log("Erreurs:", form.formState.errors);
    
    // Attendre un peu pour s'assurer que toutes les validations asynchrones sont terminées
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Vérifier à nouveau les erreurs après la validation complète - IMPORTANT: même si isValid est true
    // Vérifier spécifiquement les erreurs de validation pour l'email du propriétaire
    if (currentStep === 0 && !client?.email && client?.phone) {
      const emailErrors = form.formState.errors.email;
      if (emailErrors) {
        const emailError = emailErrors.message;
        if (emailError?.includes("déjà utilisé")) {
          toast.error(emailError, {
            description: (
              <a href="/#contact" className="underline font-medium">
                Cliquez ici pour contacter le service client
              </a>
            ),
            duration: 10000,
          });
          return; // Ne pas continuer si l'email est déjà utilisé
        }
      }
    }
    // Vérifier spécifiquement les erreurs de validation pour tenantEmail
    if (currentStep === 4) {
      const tenantEmailErrors = form.formState.errors.tenantEmail;
      if (tenantEmailErrors) {
        const tenantEmailError = tenantEmailErrors.message;
        if (tenantEmailError?.includes("déjà utilisé")) {
          toast.error(tenantEmailError, {
            description: (
              <a href="/#contact" className="underline font-medium">
                Cliquez ici pour contacter le service client
              </a>
            ),
            duration: 10000,
          });
          return; // Ne pas continuer si l'email est déjà utilisé
        }
      }
    }
    
    if (!isValid) {
      // Récupérer les erreurs de validation
      const errors = form.formState.errors;
      const errorFields = Object.keys(errors).filter(key => 
        fieldsToValidate.includes(key as keyof OwnerFormData)
      );
      
      if (errorFields.length > 0) {
        const firstErrorKey = errorFields[0];
        const firstError = errors[firstErrorKey as keyof OwnerFormData];
        let errorMessage = "Veuillez remplir tous les champs requis avant de passer à l'étape suivante";
        
        if (firstError) {
          if (typeof firstError === 'object' && firstError !== null && 'message' in firstError) {
            const msg = (firstError as { message?: string }).message;
            if (typeof msg === 'string') {
              errorMessage = msg;
            }
          }
        }
        
        toast.error(errorMessage);
      } else {
        toast.error("Veuillez remplir tous les champs requis avant de passer à l'étape suivante");
      }
      return;
    }
    
    if (isValid) {
      // Sauvegarder avant de passer à l'étape suivante (seulement si les données ont changé)
      try {
        await saveCurrentStep(true);
        // Si la sauvegarde réussit, passer à l'étape suivante
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      } catch (error: any) {
        // Si la sauvegarde échoue (par exemple, email existant), ne pas passer à l'étape suivante
        // L'erreur est déjà gérée dans saveCurrentStep avec un toast
        const errorMessage = error?.message || error?.toString() || "";
        if (errorMessage.includes("déjà utilisé")) {
          // L'erreur a déjà été affichée dans saveCurrentStep, on bloque juste la progression
          console.error("Erreur bloquante détectée:", error);
          return; // Bloquer la progression
        }
        // Pour les autres erreurs, on peut continuer ou non selon le cas
        console.error("Erreur lors de la sauvegarde:", error);
        return; // Bloquer la progression pour toute erreur
      }
    } else {
      // Récupérer les erreurs de validation
      const errors = form.formState.errors;
      const errorFields = Object.keys(errors).filter(key => 
        fieldsToValidate.includes(key as keyof OwnerFormData)
      );
      
      if (errorFields.length > 0) {
        const firstErrorKey = errorFields[0];
        const firstError = errors[firstErrorKey as keyof OwnerFormData];
        let errorMessage = "Veuillez remplir tous les champs requis avant de passer à l'étape suivante";
        
        if (firstError) {
          if (typeof firstError === 'object' && firstError !== null && 'message' in firstError) {
            const msg = (firstError as { message?: string }).message;
            if (typeof msg === 'string') {
              errorMessage = msg;
            }
          }
        }
        
        toast.error(errorMessage);
      } else {
        toast.error("Veuillez remplir tous les champs requis avant de passer à l'étape suivante");
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): (keyof OwnerFormData)[] => {
    switch (step) {
      case 0: // Informations de base
        if (clientType === ClientType.PERSONNE_PHYSIQUE) {
          return ["type", "firstName", "lastName", "email", "phone", "fullAddress"];
        }
        return ["type", "legalName", "email", "phone", "fullAddress"];
      case 1: // Informations complémentaires
        if (clientType === ClientType.PERSONNE_PHYSIQUE) {
          const baseFields = ["profession", "familyStatus", "birthPlace", "birthDate", "nationality"] as any;
          // Ajouter matrimonialRegime seulement si familyStatus est MARIE
          if (form.getValues("familyStatus") === FamilyStatus.MARIE) {
            baseFields.push("matrimonialRegime");
          }
          return baseFields;
        }
        return ["registration", "nationality"];
      case 2: // Informations du bien
        return ["propertyFullAddress", "propertySurfaceM2", "propertyType", "propertyLegalStatus"];
      case 3: // Informations du bail
        return ["bailType", "bailRentAmount", "bailEffectiveDate", "bailMonthlyCharges", "bailSecurityDeposit", "bailPaymentDay"];
      case 4: // Informations du locataire
        return ["tenantEmail"];
      case 5: // Pièces jointes
      if (clientType === ClientType.PERSONNE_PHYSIQUE) {
        const baseFields = ["birthCert", "idIdentity", "diagnostics", "titleDeed", "insuranceOwner", "ribOwner"];
        if (form.getValues("familyStatus") === FamilyStatus.MARIE) {
          baseFields.push("livretDeFamille");
          baseFields.push("contratDePacs");
        }
        if (form.getValues("propertyLegalStatus") === BienLegalStatus.CO_PROPRIETE) {
          baseFields.push("reglementCopropriete");
        } else if (form.getValues("propertyLegalStatus") === BienLegalStatus.LOTISSEMENT) {
          baseFields.push("cahierChargeLotissement");
          baseFields.push("statutAssociationSyndicale");
        }
        return baseFields as any;
      } else if (clientType === ClientType.PERSONNE_MORALE) {
        const baseFields = ["kbis", "statutes", "titleDeed", "insuranceOwner", "ribOwner"];
        if (form.getValues("propertyLegalStatus") === BienLegalStatus.CO_PROPRIETE) {
          baseFields.push("reglementCopropriete");
        } else if (form.getValues("propertyLegalStatus") === BienLegalStatus.LOTISSEMENT) {
          baseFields.push("cahierChargeLotissement");
          baseFields.push("statutAssociationSyndicale");
        }
        return baseFields as any;
      }
      default:
        return [];
    }
  };

  // Fonction helper pour vérifier si un document existe (dans les refs, états ou DB)
  const hasDocument = (ref: React.RefObject<HTMLInputElement | null>, stateFile: File | null, documentKind: string): boolean => {
    // Vérifier dans les refs (nouveau fichier sélectionné)
    if (ref.current?.files?.[0]) {
      return true;
    }
    // Vérifier dans les états (nouveau fichier sélectionné)
    if (stateFile) {
      return true;
    }
    // Vérifier dans la base de données (utiliser intakeLink directement pour avoir les données à jour)
    const clientDocs = intakeLink.client?.documents || [];
    const propertyDocs = intakeLink.property?.documents || [];
    
    // Vérifier dans les documents client
    if (clientDocs.some((doc: any) => doc.kind === documentKind)) {
      return true;
    }
    // Vérifier dans les documents du bien
    if (propertyDocs.some((doc: any) => doc.kind === documentKind)) {
      return true;
    }
    
    return false;
  };

  const validateRequiredFiles = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const currentClientType = form.getValues("type");
    const familyStatus = form.getValues("familyStatus");
    const propertyLegalStatus = form.getValues("propertyLegalStatus");

    // Validation selon le type de client
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      if (!hasDocument(birthCertRef, birthCertFile, "BIRTH_CERT")) {
        errors.push("L'acte de naissance est requis");
      }
      if (!hasDocument(idIdentityRef, idIdentityFile, "ID_IDENTITY")) {
        errors.push("La pièce d'identité est requise");
      }
      if (familyStatus === FamilyStatus.MARIE && !hasDocument(livretDeFamilleRef, livretDeFamilleFile, "LIVRET_DE_FAMILLE")) {
        errors.push("Le livret de famille est requis");
      }
      if (familyStatus === FamilyStatus.PACS && !hasDocument(contratDePacsRef, contratDePacsFile, "CONTRAT_DE_PACS")) {
        errors.push("Le contrat de PACS est requis");
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      if (!hasDocument(kbisRef, kbisFile, "KBIS")) {
        errors.push("Le KBIS est requis");
      }
      if (!hasDocument(statutesRef, statutesFile, "STATUTES")) {
        errors.push("Les statuts sont requis");
      }
    }

    // Validation des documents du bien (toujours requis)
    if (!hasDocument(diagnosticsRef, diagnosticsFile, "DIAGNOSTICS")) {
      errors.push("Les diagnostics sont requis");
    }
    if (!hasDocument(titleDeedRef, titleDeedFile, "TITLE_DEED")) {
      errors.push("Le titre de propriété est requis");
    }
    if (!hasDocument(insuranceOwnerRef, insuranceOwnerFile, "INSURANCE")) {
      errors.push("L'assurance propriétaire est requise");
    }
    if (!hasDocument(ribOwnerRef, ribOwnerFile, "RIB")) {
      errors.push("Le RIB signé propriétaire est requis");
    }

    // Validation selon le statut légal du bien
    if (propertyLegalStatus === BienLegalStatus.CO_PROPRIETE && !hasDocument(reglementCoproprieteRef, reglementCoproprieteFile, "REGLEMENT_COPROPRIETE")) {
      errors.push("Le règlement de copropriété est requis");
    }
    if (propertyLegalStatus === BienLegalStatus.LOTISSEMENT) {
      if (!hasDocument(cahierChargeLotissementRef, null, "CAHIER_DE_CHARGE_LOTISSEMENT")) {
        errors.push("Le cahier des charges du lotissement est requis");
      }
      if (!hasDocument(statutAssociationSyndicaleRef, null, "STATUT_DE_LASSOCIATION_SYNDICALE")) {
        errors.push("Le statut de l'association syndicale est requis");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const onSubmit = async (data: OwnerFormData) => {
    // Valider les fichiers requis avant de soumettre
    const fileValidation = validateRequiredFiles();
    if (!fileValidation.isValid) {
      toast.error("Veuillez joindre tous les documents requis", {
        description: fileValidation.errors.join(", "),
      });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      // Uploader les fichiers en parallèle (optimisé dans l'API route)
      // Ne pas déclencher l'événement car on va rediriger vers la page success
      await uploadFiles(false);
      
      // Soumettre directement les données (les fichiers sont déjà uploadés)
      // Pas besoin de rafraîchir les données ni de re-valider, on vient juste d'uploader
      await submitIntake({
        token: intakeLink.token,
        payload: data,
      });
      toast.success("Formulaire soumis avec succès");
      router.push(`/intakes/${intakeLink.token}/success`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || "Erreur lors de la soumission";
      toast.error(errorMessage);
      console.error("Erreur lors de la soumission du formulaire:", error);
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderAdditionalInfo();
      case 2:
        return renderPropertyInfo();
      case 3:
        return renderBailInfo();
      case 4:
        return renderTenantInfo();
      case 5:
        return renderDocuments();
      default:
        return null;
    }
  };

  // Validation asynchrone pour vérifier si l'email du propriétaire existe déjà
  const validateOwnerEmail = async (email: string | undefined) => {
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

  const renderBasicInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Informations propriétaire</CardTitle>
        <CardDescription>Remplissez les informations de base</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="type">Type de client *</Label>

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
                <Label htmlFor="personnePhysique" className={`flex flex-col space-y-2 items-center justify-between border rounded-lg p-5 cursor-pointer hover:bg-accent w-[48%] sm:w-full ${field.value === ClientType.PERSONNE_PHYSIQUE ? "bg-accent" : ""}`}>
                  <RadioGroupItem value={ClientType.PERSONNE_PHYSIQUE} className="hidden" id="personnePhysique"/>
                  <User2 className="size-5 text-muted-foreground" />
                  <div className="text-sm font-medium text-center">Personne {isMobile ? <br /> : ""} physique</div>
                </Label>
                <Label htmlFor="personneMorale" className={`flex flex-col space-y-2 items-center justify-between border rounded-lg p-5 cursor-pointer hover:bg-accent w-[48%] sm:w-full ${field.value === ClientType.PERSONNE_MORALE ? "bg-accent" : ""}`}>
                  <RadioGroupItem value={ClientType.PERSONNE_MORALE} className="hidden" id="personneMorale"/>
                  <Building2 className="size-5 text-muted-foreground" />
                  <div className="text-sm font-medium text-center">Personne {isMobile ? <br /> : ""} morale</div>
                </Label>
              </RadioGroup>
            )}
          />
          {form.formState.errors.type && (
            <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
          )}
        </div>

        {clientType === ClientType.PERSONNE_PHYSIQUE ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input id="firstName" {...form.register("firstName")} />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input id="lastName" {...form.register("lastName")} />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="legalName">Raison sociale *</Label>
            <Input id="legalName" {...form.register("legalName")} />
            {form.formState.errors.legalName && (
              <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullAddress">Adresse complète *</Label>
          <Textarea id="fullAddress" {...form.register("fullAddress")} />
          {form.formState.errors.fullAddress && (
            <p className="text-sm text-destructive">{form.formState.errors.fullAddress.message}</p>
          )}
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone *</Label>
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value || undefined}
                  onChange={field.onChange}
                  defaultCountry="FR"
                  international
                  countryCallingCodeEditable={false}
                  placeholder="Numéro de téléphone"
                  disabled={!client?.email && !!client?.phone}
                />
              )}
            />
            {!client?.email && client?.phone && (
              <p className="text-sm text-muted-foreground">Le téléphone ne peut pas être modifié</p>
            )}
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input 
              id="email" 
              type="email" 
              {...form.register("email", {
                validate: validateOwnerEmail,
                required: "L'email est requis",
              })} 
              disabled={!!client?.email}
              className={client?.email ? "bg-muted cursor-not-allowed" : ""}
              onBlur={async () => {
                // Déclencher la validation au blur seulement si l'email n'est pas déjà défini
                if (!client?.email) {
                  await form.trigger("email");
                }
              }}
            />
            {client?.email && (
              <p className="text-sm text-muted-foreground">L'email ne peut pas être modifié</p>
            )}
            {form.formState.errors.email && (
              <div className="text-sm text-destructive">
                <p>{form.formState.errors.email.message}</p>
                {form.formState.errors.email.message?.includes("déjà utilisé") && (
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

      </CardContent>
    </Card>
  );

  const renderAdditionalInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Informations propriétaire</CardTitle>
        <CardDescription>Remplissez les informations complémentaires</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {clientType === ClientType.PERSONNE_PHYSIQUE ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="profession">Profession *</Label>
              <Input id="profession" {...form.register("profession")} />
              {form.formState.errors.profession && (
                <p className="text-sm text-destructive">{form.formState.errors.profession.message}</p>
              )}
            </div>
            <div className={`grid gap-4 sm:gap-4  ${form.watch("familyStatus") === FamilyStatus.MARIE ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="space-y-2">
                <Label htmlFor="familyStatus">Situation familiale *</Label>
                <Controller
                  name="familyStatus"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
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
                {form.formState.errors.familyStatus && (
                  <p className="text-sm text-destructive">{form.formState.errors.familyStatus.message}</p>
                )}
              </div>
              {form.watch("familyStatus") === FamilyStatus.MARIE && (
                <div className="space-y-2">
                  <Label htmlFor="matrimonialRegime">Régime matrimonial *</Label>
                  <Controller
                    name="matrimonialRegime"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
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
                  {form.formState.errors.matrimonialRegime && (
                    <p className="text-sm text-destructive">{form.formState.errors.matrimonialRegime.message}</p>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthPlace">Lieu de naissance *</Label>
                <Input id="birthPlace" {...form.register("birthPlace")} />
                {form.formState.errors.birthPlace && (
                  <p className="text-sm text-destructive">{form.formState.errors.birthPlace.message}</p>
                )}
              </div>
             
              <div className="space-y-2">
                <Label htmlFor="birthDate">Date de naissance *</Label>
                <Controller
                  name="birthDate"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker
                      id="birthDate"
                      value={field.value ? (typeof field.value === 'string' ? field.value : field.value.toISOString().split('T')[0]) : undefined}
                      onChange={(date) => {
                        if (date) {
                          // Convertir en format string YYYY-MM-DD pour le formulaire
                          const dateString = date.toISOString().split('T')[0]
                          field.onChange(dateString)
                        } else {
                          field.onChange(undefined)
                        }
                      }}
                      placeholder="Sélectionner la date de naissance"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />
                  )}
                />
                {form.formState.errors.birthDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.birthDate.message}</p>
                )}  
              </div>
             
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationalité *</Label>
              <Controller
                name="nationality"
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
              {form.formState.errors.nationality && (
                <p className="text-sm text-destructive">{form.formState.errors.nationality.message}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="registration">SIREN/SIRET *</Label>
              <Input id="registration" {...form.register("registration")} />
              {form.formState.errors.registration && (
                <p className="text-sm text-destructive">{form.formState.errors.registration.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationalité *</Label>
              <Controller
                name="nationality"
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
              {form.formState.errors.nationality && (
                <p className="text-sm text-destructive">{form.formState.errors.nationality.message}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderPropertyInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Informations du bien</CardTitle>
        <CardDescription>Remplissez les informations en rapport avec le bien.</CardDescription>
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
            <p className="text-sm text-destructive">{form.formState.errors.propertyFullAddress.message}</p>
          )}
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 ">
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2">
              <Label htmlFor="propertyType">Type d'habitat *</Label>
              <InfoTooltip content={<p>Une maison est un immeuble individuel</p>} className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}>
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
                onValueChange={(value) => {
                  const selectedType = value as BienType;
                  field.onChange(selectedType);
                }}
                className="flex flex-row space-x-3 w-full items-center justify-between "
              >
                
                <Label htmlFor="appartement" className={`flex flex-col space-y-2 items-center justify-between border rounded-lg p-5 cursor-pointer hover:bg-accent w-[48%] sm:w-full ${field.value === BienType.APPARTEMENT ? "bg-accent" : ""}`}>
                  <RadioGroupItem value={BienType.APPARTEMENT} className="hidden" id="appartement"/>
                  <Building2 className="size-5 text-muted-foreground" />
                  <div className="text-sm font-medium text-center">Immeuble {isMobile ? <br /> : ""} collectif</div>
                </Label>

                <Label htmlFor="maison" className={`flex flex-col space-y-2 items-center justify-between border rounded-lg p-5 cursor-pointer hover:bg-accent w-[48%] sm:w-full ${field.value === BienType.MAISON ? "bg-accent" : ""}`}>
                  <RadioGroupItem value={BienType.MAISON} className="hidden" id="maison"/>
                  <Building className="size-5 text-muted-foreground" />
                  <div className="text-sm font-medium text-center">Immeuble {isMobile ? <br /> : ""} individuel</div>
                </Label>
              </RadioGroup>
            )}
            />
            {form.formState.errors.propertyType && (
              <p className="text-sm text-destructive">{form.formState.errors.propertyType.message}</p>
            )}
          </div>

        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 ">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="propertySurfaceM2">Surface *</Label>
              <InfoTooltip content={<p>Surface privative selon diagnostic Loi Carrez</p>} className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}>
                <button type="button" className="inline-flex items-center">
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </InfoTooltip>
            </div>
            <NumberInputGroup field={form.register("propertySurfaceM2")} min={0} unit="m²" step={0.01} isDecimal={true} />
            {form.formState.errors.propertySurfaceM2 && (
              <p className="text-sm text-destructive">{form.formState.errors.propertySurfaceM2.message}</p>
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
                    {BienLegalStatus && Object.values(BienLegalStatus).map((status) => {
                      let displayName = "";
                      if (status === BienLegalStatus.PLEIN_PROPRIETE) {
                        displayName = "Monopropriété";
                      } else if(status === BienLegalStatus.CO_PROPRIETE) {
                        displayName = "Copropriété";
                      } else if(status === BienLegalStatus.LOTISSEMENT) {
                        displayName = "Lotissement";
                      }
                      return (
                        <SelectItem key={status} value={status}>
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.propertyLegalStatus && (
              <p className="text-sm text-destructive">{form.formState.errors.propertyLegalStatus.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBailInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Informations du bail</CardTitle>
        <CardDescription>
          Remplissez les informations en rapport avec le bail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-10">
        <div className="grid gap-3 sm:gap-4 grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bailType">Type de bail *</Label>
            <Controller
              name="bailType"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(BailType).map((type) => {
                      let displayName = "";
                      if (type === BailType.BAIL_MEUBLE_9_MOIS) {
                        displayName = "Bail étudiant (9 mois, meublé)";
                      } else if (type === BailType.BAIL_NU_6_ANS) {
                        displayName = "Bail nu 6 ans (SCI)";
                      } if(type === BailType.BAIL_NU_3_ANS){
                        displayName = "Bail nu 3 ans ";
                      } if(type === BailType.BAIL_MEUBLE_1_ANS){
                        displayName = "Bail meublé 1 an";
                      }
                      return (
                        <SelectItem key={type} value={type}>
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.bailType && (
              <p className="text-sm text-destructive">{form.formState.errors.bailType.message}</p>
            )}
          </div>
          <div className="space-y-2">
              <Label htmlFor="bailPaymentDay">Jour de paiement *</Label>
              <NumberInputGroup field={form.register("bailPaymentDay")} min={1} max={31} />
              {form.formState.errors.bailPaymentDay && (
                <p className="text-sm text-destructive">{form.formState.errors.bailPaymentDay.message}</p>
              )}
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 ">

          <div className="space-y-2">
            <Label htmlFor="bailEffectiveDate">Date de prise d'effet *</Label>
            <Controller
              name="bailEffectiveDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  id="bailEffectiveDate"
                  value={field.value || undefined}
                  onChange={(date) => {
                    if (date) {
                      // Convertir en format string YYYY-MM-DD pour le formulaire
                      const dateString = date.toISOString().split('T')[0]
                      field.onChange(dateString)
                    } else {
                      field.onChange("")
                    }
                  }}
                  placeholder="Sélectionner la date de prise d'effet"
                />
              )}
            />
            {form.formState.errors.bailEffectiveDate && (
              <p className="text-sm text-destructive">{form.formState.errors.bailEffectiveDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bailEndDate">Date de fin du bail</Label>
            <Controller
              name="bailEndDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  id="bailEndDate"
                  value={field.value || undefined}
                  onChange={(date) => {
                    if (date) {
                      // Convertir en format string YYYY-MM-DD pour le formulaire
                      const dateString = date.toISOString().split('T')[0]
                      field.onChange(dateString)
                    } else {
                      field.onChange("")
                    }
                  }}
                  placeholder="(optionnel)"
                />
              )}
            />
          </div>

        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="bailRentAmount">Montant du loyer HC*</Label>
              <InfoTooltip 
                content={
                  <div className="max-w-xs">
                    <p className="mb-2">LIMITATIONS DES LOYERS</p>
                    <p className="mb-2">Ce logement peut se situer en zone tendue, où les loyers sont encadrés. Cliquez ici pour vérifier votre situation et rester conforme à la réglementation.</p>
                    <a 
                      href="https://www.service-public.fr/simulateur/calcul/zones-tendues" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      https://www.service-public.fr/simulateur/calcul/zones-tendues
                    </a>
                  </div>
                }
                className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}
              >
                <button type="button" className="inline-flex items-center">
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </InfoTooltip>
            </div>
            <NumberInputGroup field={form.register("bailRentAmount")} min={0} unit="€" />
            {form.formState.errors.bailRentAmount && (
              <p className="text-sm text-destructive">{form.formState.errors.bailRentAmount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bailMonthlyCharges">Charges mensuelles *</Label>
            <NumberInputGroup field={form.register("bailMonthlyCharges")} min={0} unit="€" />
            {form.formState.errors.bailMonthlyCharges && (
              <p className="text-sm text-destructive">{form.formState.errors.bailMonthlyCharges.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="bailSecurityDeposit">Dépôt de garantie *</Label>
              <InfoTooltip 
                content={
                  <>
                    <p>Bail meublé → 2 mois de loyer hors charges maximum</p>
                    <p>Bail nu → 1 mois de loyer hors charges maximum</p>
                  </>
                }
                className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}
              >
                <button type="button" className="inline-flex items-center">
                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </InfoTooltip>
            </div>
            <NumberInputGroup field={form.register("bailSecurityDeposit")} min={0} unit="€" />
            {form.formState.errors.bailSecurityDeposit && (
              <p className="text-sm text-destructive">{form.formState.errors.bailSecurityDeposit.message}</p>
            )}
          </div>
      </CardContent>
    </Card>
  );

  const renderTenantInfo = () => {
    // Validation asynchrone pour vérifier si l'email existe déjà
    const validateTenantEmail = async (email: string | undefined) => {
      if (!email || email.trim() === "") {
        return true; // La validation requise est gérée par le schéma Zod
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

    return (
      <Card>
        <CardHeader>
          <CardTitle>Informations du locataire</CardTitle>
          <CardDescription>Remplissez les informations en rapport avec le locataire.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenantEmail">Email du locataire *</Label>
            <Input 
              id="tenantEmail" 
              type="email" 
              {...form.register("tenantEmail", {
                validate: validateTenantEmail,
                required: "L'email du locataire est requis",
              })} 
              onBlur={async () => {
                // Déclencher la validation au blur
                await form.trigger("tenantEmail");
              }}
              disabled={tenant?.email ? true : false} 
            />
            {form.formState.errors.tenantEmail && (
              <div className="text-sm text-destructive">
                <p>{form.formState.errors.tenantEmail.message}</p>
                {form.formState.errors.tenantEmail.message?.includes("déjà utilisé") && (
                  <p className="mt-1">
                    <a href="/#contact" className="underline hover:text-destructive/80 font-medium">
                      Cliquez ici pour contacter le service client
                    </a>
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Un email sera envoyé au locataire pour qu'il complète ses informations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDocuments = () => (
    <Card>
      <CardHeader>
        <CardTitle>Pièces jointes</CardTitle>
        <CardDescription>Remplissez les pièces jointes en rapport avec le client et le bien.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pièces jointes - Client */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documents client *</h3>
          
          {clientType === ClientType.PERSONNE_MORALE ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <DocumentUploaded token={intakeLink.token} documentKind="KBIS">
                  <FileUpload
                    label="KBIS *"
                    value={kbisFile}
                    onChange={(file) => {
                      setKbisFile(file);
                      if (kbisRef.current) {
                        const dataTransfer = new DataTransfer();
                        if (file) dataTransfer.items.add(file);
                        kbisRef.current.files = dataTransfer.files;
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </DocumentUploaded>
              </div>
              <div className="space-y-2">
                <DocumentUploaded token={intakeLink.token} documentKind="STATUTES">
                  <FileUpload
                    label="Statuts *"
                    value={statutesFile}
                    onChange={(file) => {
                      setStatutesFile(file);
                      if (statutesRef.current) {
                        const dataTransfer = new DataTransfer();
                        if (file) dataTransfer.items.add(file);
                        statutesRef.current.files = dataTransfer.files;
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </DocumentUploaded>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <DocumentUploaded token={intakeLink.token} documentKind="BIRTH_CERT">
                  <FileUpload
                    label="Acte de naissance *"
                    value={birthCertFile}
                    onChange={(file) => {
                      setBirthCertFile(file);
                      if (birthCertRef.current) {
                        const dataTransfer = new DataTransfer();
                        if (file) dataTransfer.items.add(file);
                        birthCertRef.current.files = dataTransfer.files;
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </DocumentUploaded>
              </div>
              <div className="space-y-2">
                <DocumentUploaded token={intakeLink.token} documentKind="ID_IDENTITY">
                  <FileUpload
                    label="Pièce d'identité *"
                    value={idIdentityFile}
                    onChange={(file) => {
                      setIdIdentityFile(file);
                      if (idIdentityRef.current) {
                        const dataTransfer = new DataTransfer();
                        if (file) dataTransfer.items.add(file);
                        idIdentityRef.current.files = dataTransfer.files;
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </DocumentUploaded>
              </div>
              {form.watch("familyStatus") === FamilyStatus.MARIE && (
                <div className="space-y-2">
                  <DocumentUploaded token={intakeLink.token} documentKind="LIVRET_DE_FAMILLE">
                    <FileUpload
                      label="Livret de famille *"
                      value={livretDeFamilleFile}
                      onChange={(file) => {
                        setLivretDeFamilleFile(file);
                        if (livretDeFamilleRef.current) {
                          const dataTransfer = new DataTransfer();
                          if (file) dataTransfer.items.add(file);
                          livretDeFamilleRef.current.files = dataTransfer.files;
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </DocumentUploaded>
                </div>
              )}
              {form.watch("familyStatus") === FamilyStatus.PACS && (
                <div className="space-y-2">
                  <DocumentUploaded token={intakeLink.token} documentKind="CONTRAT_DE_PACS">
                    <FileUpload
                      label="Contrat de PACS *"
                      value={contratDePacsFile}
                      onChange={(file) => {
                        setContratDePacsFile(file);
                        if (contratDePacsRef.current) {
                          const dataTransfer = new DataTransfer();
                          if (file) dataTransfer.items.add(file);
                          contratDePacsRef.current.files = dataTransfer.files;
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </DocumentUploaded>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Pièces jointes - Bien */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documents du bien</h3>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">

                  <div className="space-y-2">
                    <DocumentUploaded token={intakeLink.token} documentKind="INSURANCE">
                      <FileUpload
                        label="Assurance propriétaire *"
                        value={insuranceOwnerFile}
                        onChange={(file) => {
                          setInsuranceOwnerFile(file);
                          if (insuranceOwnerRef.current) {
                            const dataTransfer = new DataTransfer();
                            if (file) dataTransfer.items.add(file);
                            insuranceOwnerRef.current.files = dataTransfer.files;
                          }
                        }}
                        disabled={isSubmitting}
                      />
                    </DocumentUploaded>
                  </div>
                  <div className="space-y-2">
                    <DocumentUploaded token={intakeLink.token} documentKind="RIB">
                      <FileUpload
                        label="RIB signé propriétaire *"
                        value={ribOwnerFile}
                        onChange={(file) => {
                          setRibOwnerFile(file);
                          if (ribOwnerRef.current) {
                            const dataTransfer = new DataTransfer();
                            if (file) dataTransfer.items.add(file);
                            ribOwnerRef.current.files = dataTransfer.files;
                          }
                        }}
                        disabled={isSubmitting}
                      />
                    </DocumentUploaded>
                  </div>

                <div className="space-y-2">
                  <DocumentUploaded token={intakeLink.token} documentKind="DIAGNOSTICS">
                    <FileUpload
                      label="Diagnostics *"
                      value={diagnosticsFile}
                      onChange={(file) => {
                        setDiagnosticsFile(file);
                        if (diagnosticsRef.current) {
                          const dataTransfer = new DataTransfer();
                          if (file) dataTransfer.items.add(file);
                          diagnosticsRef.current.files = dataTransfer.files;
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </DocumentUploaded>
                </div>

                <div className="space-y-2">
                  <DocumentUploaded token={intakeLink.token} documentKind="TITLE_DEED">
                    <FileUpload
                      label="Titre de propriété *"
                      value={titleDeedFile}
                      onChange={(file) => {
                        setTitleDeedFile(file);
                        if (titleDeedRef.current) {
                          const dataTransfer = new DataTransfer();
                          if (file) dataTransfer.items.add(file);
                          titleDeedRef.current.files = dataTransfer.files;
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </DocumentUploaded>
                </div>
            {form.watch("propertyLegalStatus") === BienLegalStatus.CO_PROPRIETE && (
              <>
                <div className="space-y-2">
                  <DocumentUploaded token={intakeLink.token} documentKind="REGLEMENT_COPROPRIETE">
                    <FileUpload
                      label="Règlement de copropriété *"
                      value={reglementCoproprieteFile}
                      onChange={(file) => {
                        setReglementCoproprieteFile(file);
                        if (reglementCoproprieteRef.current) {
                          const dataTransfer = new DataTransfer();
                          if (file) dataTransfer.items.add(file);
                          reglementCoproprieteRef.current.files = dataTransfer.files;
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </DocumentUploaded>
                </div>
              </>
            )}
            {form.watch("propertyLegalStatus") === BienLegalStatus.LOTISSEMENT && (
              <>
                <div className="space-y-2">
                  <DocumentUploaded token={intakeLink.token} documentKind="CAHIER_DE_CHARGE_LOTISSEMENT">
                    <FileUpload
                      label="Cahier des charges lotissement *"
                      value={cahierChargeLotissementFile}
                      onChange={(file) => {
                        setCahierChargeLotissementFile(file);
                        if (cahierChargeLotissementRef.current) {
                          const dataTransfer = new DataTransfer();
                          if (file) dataTransfer.items.add(file);
                          cahierChargeLotissementRef.current.files = dataTransfer.files;
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </DocumentUploaded>
                </div>
                <div className="space-y-2">
                  <DocumentUploaded token={intakeLink.token} documentKind="STATUT_DE_LASSOCIATION_SYNDICALE">
                    <FileUpload
                      label="Statut de l'association syndicale *"
                      value={statutAssociationSyndicaleFile}
                      onChange={(file) => {
                        setStatutAssociationSyndicaleFile(file);
                        if (statutAssociationSyndicaleRef.current) {
                          const dataTransfer = new DataTransfer();
                          if (file) dataTransfer.items.add(file);
                          statutAssociationSyndicaleRef.current.files = dataTransfer.files;
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </DocumentUploaded>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Empêcher la soumission automatique avec Entrée sauf si on est sur le dernier step et qu'on clique explicitement sur Soumettre
    if (e.key === 'Enter' && currentStep < STEPS.length - 1) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      {/* Loader overlay */}
      {(isSaving || isSubmitting) && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6">
            {/* Logo avec animation pulse */}
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
            
            {/* Spinner avec animation */}
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-foreground">
                  {isSubmitting ? "Envoi en cours..." : "Enregistrement en cours..."}
                </p>
                <p className="text-xs text-muted-foreground text-center max-w-xs px-4">
                  {isSubmitting 
                    ? "Veuillez patienter pendant la soumission de votre formulaire" 
                    : "Vos données sont en cours d'enregistrement, veuillez patienter"}
                </p>
              </div>
            </div>
            
            {/* Animation de points de chargement */}
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      <form 
        onSubmit={form.handleSubmit(onSubmit, onError)} 
        onKeyDown={handleFormKeyDown}
        className="space-y-18 "
      >
      {/* Stepper fixe */}
      <div className="fixed top-27 sm:top-40 left-0 right-0 bg-background border-b border-border/40 z-40 pb-4 sm:pb-6">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4">
          <Stepper 
            steps={STEPS} 
            currentStep={currentStep}
            onStepClick={(step) => {
              // Permettre de revenir en arrière seulement
              if (step < currentStep) {
                setCurrentStep(step);
              }
            }}
          />
        </div>
      </div>
      
      {/* Espace pour le stepper fixe */}
      
      <div className="mt-32 sm:mt-48">     
        {renderStepContent()}
      </div> 
      {/* Inputs file cachés pour les refs */}
      <input type="file" ref={kbisRef} name="kbis" className="hidden" />
      <input type="file" ref={statutesRef} name="statutes" className="hidden" />
      <input type="file" ref={birthCertRef} name="birthCert" className="hidden" />
      <input type="file" ref={idIdentityRef} name="idIdentity" className="hidden" />
      <input type="file" ref={livretDeFamilleRef} name="livretDeFamille" className="hidden" />
      <input type="file" ref={contratDePacsRef} name="contratDePacs" className="hidden" />
      <input type="file" ref={diagnosticsRef} name="diagnostics" className="hidden" />
      <input type="file" ref={reglementCoproprieteRef} name="reglementCopropriete" className="hidden" />
      <input type="file" ref={cahierChargeLotissementRef} name="cahierChargeLotissement" className="hidden" />
      <input type="file" ref={statutAssociationSyndicaleRef} name="statutAssociationSyndicale" className="hidden" />
      <input type="file" ref={insuranceOwnerRef} name="insuranceOwner" className="hidden" />
      <input type="file" ref={ribOwnerRef} name="ribOwner" className="hidden" />

      <div className="fixed bottom-0 left-0 right-0  p-3 sm:p-4 z-50">
        <div className="max-w-2xl mx-auto flex flex-row justify-between gap-3 sm:gap-4">
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
              onClick={() => saveCurrentStep(false)}
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
                type="button" 
                onClick={() => form.handleSubmit(onSubmit, onError)()}
                disabled={isSubmitting || isSaving}
                className="sm:w-auto"
              >
                {isSubmitting ? "Envoi en cours..." : "Soumettre"}
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Espace pour éviter que le contenu soit caché sous les boutons fixes */}
      <div className="h-20 sm:h-24" />
      </form>
    </div>
  );
}
