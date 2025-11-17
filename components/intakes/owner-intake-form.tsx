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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitIntake, savePartialIntake, getIntakeLinkByToken } from "@/lib/actions/intakes";
import { DocumentUploaded } from "./document-uploaded";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ownerFormSchema } from "@/lib/zod/client";
import { ClientType, FamilyStatus, MatrimonialRegime, BailType, BailFamille, PropertyStatus, BienType, BienLegalStatus, ProfilType } from "@prisma/client";
import { FileUpload } from "@/components/ui/file-upload";
import { Stepper } from "@/components/ui/stepper";
import { ArrowLeftIcon, ArrowRightIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { PhoneInput } from "@/components/ui/phone-input";

type OwnerFormData = z.infer<typeof ownerFormSchema>;

const STEPS = [
  { title: "Informations personnelles",  },
  { title: "Informations du bien"  },
  { title: "Informations du bail" },
  { title: "Informations du locataire" },
  { title: "Pièces jointes" },
];

export function OwnerIntakeForm({ intakeLink: initialIntakeLink }: { intakeLink: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
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
    insuranceOwner: (bail?.documents?.find((document: any) => document.kind === "INSURANCE")?.file as File) || null,
    ribOwner: (bail?.documents?.find((document: any) => document.kind === "RIB")?.file as File) || null,
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
    
    // Vérifier l'étape 0: Informations personnelles
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      if (isEmpty(values.type) || isEmpty(values.firstName) || isEmpty(values.lastName) || 
          isEmpty(values.email) || isEmpty(values.phone) || isEmpty(values.fullAddress) || 
          isEmpty(values.nationality) || isEmpty(values.familyStatus) || 
          isEmpty(values.birthPlace) || isEmpty(values.birthDate) || isEmpty(values.profession)) {
        return 0;
      }
      if (values.familyStatus === FamilyStatus.MARIE && isEmpty(values.matrimonialRegime)) {
        return 0;
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      if (isEmpty(values.type) || isEmpty(values.legalName) || isEmpty(values.email) || 
          isEmpty(values.phone) || isEmpty(values.fullAddress) || 
          isEmpty(values.nationality) || isEmpty(values.registration)) {
        return 0;
      }
    } else {
      return 0; // Type non défini
    }

    // Vérifier l'étape 1: Informations du bien
    if (isEmpty(values.propertyFullAddress) || isEmpty(values.propertySurfaceM2) || 
        isEmpty(values.propertyType) || isEmpty(values.propertyLegalStatus)) {
      return 1;
    }

    // Vérifier l'étape 2: Informations du bail
    if (isEmpty(values.bailType) || isEmpty(values.bailRentAmount) || 
        isEmpty(values.bailEffectiveDate) || isEmpty(values.bailMonthlyCharges) || 
        isEmpty(values.bailSecurityDeposit) || isEmpty(values.bailPaymentDay)) {
      return 2;
    }

    // Vérifier l'étape 3: Informations du locataire
    if (isEmpty(values.tenantEmail)) {
      return 3;
    }

    // Vérifier l'étape 4: Pièces jointes
    // Utiliser intakeLink directement pour avoir les données à jour
    // Vérifier les documents selon le type de client
    if (currentClientType === ClientType.PERSONNE_PHYSIQUE) {
      const clientDocs = intakeLink.client?.documents || [];
      const hasBirthCert = clientDocs.some((doc: any) => doc.kind === "BIRTH_CERT");
      const hasIdIdentity = clientDocs.some((doc: any) => doc.kind === "ID_IDENTITY");
      
      if (!hasBirthCert || !hasIdIdentity) {
        return 4;
      }
      
      if (values.familyStatus === FamilyStatus.MARIE) {
        const hasLivret = clientDocs.some((doc: any) => doc.kind === "LIVRET_DE_FAMILLE");
        if (!hasLivret) {
          return 4;
        }
      }
      if (values.familyStatus === FamilyStatus.PACS) {
        const hasPacs = clientDocs.some((doc: any) => doc.kind === "CONTRAT_DE_PACS");
        if (!hasPacs) {
          return 4;
        }
      }
    } else if (currentClientType === ClientType.PERSONNE_MORALE) {
      const clientDocs = intakeLink.client?.documents || [];
      const hasKbis = clientDocs.some((doc: any) => doc.kind === "KBIS");
      const hasStatutes = clientDocs.some((doc: any) => doc.kind === "STATUTES");
      
      if (!hasKbis || !hasStatutes) {
        return 4;
      }
    }

    // Vérifier les documents du bien
    const propertyDocs = intakeLink.property?.documents || [];
    const hasDiagnostics = propertyDocs.some((doc: any) => doc.kind === "DIAGNOSTICS");
    const hasTitleDeed = propertyDocs.some((doc: any) => doc.kind === "TITLE_DEED");
    
    if (!hasDiagnostics || !hasTitleDeed) {
      return 4;
    }

    // Vérifier les documents selon le statut légal du bien
    if (values.propertyLegalStatus === BienLegalStatus.CO_PROPRIETE) {
      const hasReglement = propertyDocs.some((doc: any) => doc.kind === "REGLEMENT_COPROPRIETE");
      if (!hasReglement) {
        return 4;
      }
    } else if (values.propertyLegalStatus === BienLegalStatus.LOTISSEMENT) {
      const hasCahier = propertyDocs.some((doc: any) => doc.kind === "CAHIER_DE_CHARGE_LOTISSEMENT");
      const hasStatut = propertyDocs.some((doc: any) => doc.kind === "STATUT_DE_LASSOCIATION_SYNDICALE");
      if (!hasCahier || !hasStatut) {
        return 4;
      }
    }

    // Vérifier les documents du bail
    const bailDocs = intakeLink.bail?.documents || [];
    const hasInsurance = bailDocs.some((doc: any) => doc.kind === "INSURANCE");
    const hasRib = bailDocs.some((doc: any) => doc.kind === "RIB");
    
    if (!hasInsurance || !hasRib) {
      return 4;
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

    // Pour le step 4 (Pièces jointes), vérifier uniquement les fichiers
    if (step === 4) {
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
        ...(bail?.documents || []),
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

  // Fonction pour uploader les fichiers via l'API route
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

  const uploadFiles = async (): Promise<void> => {
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
      ...(bail?.documents || []),
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

    // Rafraîchir les données après l'upload pour que les documents soient reconnus
    await refreshIntakeLinkData();
    
    // Déclencher l'événement pour recharger les documents
    window.dispatchEvent(new CustomEvent(`document-uploaded-${intakeLink.token}`));
  };

  const saveCurrentStep = async (skipIfUnchanged: boolean = false) => {
    // Si skipIfUnchanged est true, vérifier si les données ont changé
    if (skipIfUnchanged && !hasStepDataChanged(currentStep)) {
      // Les données n'ont pas changé, pas besoin de sauvegarder
      return;
    }

    setIsSaving(true);
    try {
      const data = form.getValues();
      
      // Si on est sur l'étape des documents (step 4), uploader les fichiers
      if (currentStep === 4) {
        await uploadFiles();
        // Déclencher l'événement pour recharger les documents après l'upload
        window.dispatchEvent(new CustomEvent(`document-uploaded-${intakeLink.token}`));
      }
      
      // Sauvegarder les données sans les fichiers
      await savePartialIntake({
        token: intakeLink.token,
        payload: data,
      });
      
      // Rafraîchir les données après la sauvegarde pour s'assurer que tout est à jour
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
      toast.error(errorMessage);
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
    
    const isValid = await form.trigger(fieldsToValidate as any);
    console.log("Validation result:", isValid);
    console.log("Erreurs:", form.formState.errors);
    
    if (isValid) {
      // Sauvegarder avant de passer à l'étape suivante (seulement si les données ont changé)
      await saveCurrentStep(true);
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
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
      case 0: // Informations personnelles
        if (clientType === ClientType.PERSONNE_PHYSIQUE) {
          const baseFields = ["type", "firstName", "lastName", "email", "phone", "fullAddress", "nationality", "familyStatus", "birthPlace", "birthDate", "profession"] as any;
          // Ajouter matrimonialRegime seulement si familyStatus est MARIE
          if (form.getValues("familyStatus") === FamilyStatus.MARIE) {
            baseFields.push("matrimonialRegime");
          }
          return baseFields;
        }
        return ["type", "legalName", "email", "phone", "fullAddress", "nationality", "registration"];
      case 1: // Informations du bien
        return ["propertyFullAddress", "propertySurfaceM2", "propertyType", "propertyLegalStatus"];
      case 2: // Informations du bail
        return ["bailType", "bailRentAmount", "bailEffectiveDate", "bailMonthlyCharges", "bailSecurityDeposit", "bailPaymentDay"];
      case 3: // Informations du locataire
        return ["tenantEmail"];
      case 4: // Pièces jointes
      if (clientType === ClientType.PERSONNE_PHYSIQUE) {
        const baseFields = ["birthCert", "idIdentity", "diagnostics", "titleDeed"];
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
        const baseFields = ["kbis", "statutes", "titleDeed"];
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
    const bailDocs = intakeLink.bail?.documents || [];
    
    // Vérifier dans les documents client
    if (clientDocs.some((doc: any) => doc.kind === documentKind)) {
      return true;
    }
    // Vérifier dans les documents du bien
    if (propertyDocs.some((doc: any) => doc.kind === documentKind)) {
      return true;
    }
    // Vérifier dans les documents du bail
    if (bailDocs.some((doc: any) => doc.kind === documentKind)) {
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

    // Validation des documents du bail (toujours requis)
    if (!hasDocument(insuranceOwnerRef, insuranceOwnerFile, "INSURANCE")) {
      errors.push("L'assurance propriétaire est requise");
    }
    if (!hasDocument(ribOwnerRef, ribOwnerFile, "RIB")) {
      errors.push("Le RIB signé propriétaire est requis");
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
      // Uploader les fichiers avant la soumission finale
      await uploadFiles();
      
      // Rafraîchir les données après l'upload pour s'assurer que tous les documents sont reconnus
      await refreshIntakeLinkData();
      
      // Re-valider les fichiers après le rafraîchissement pour s'assurer que tout est présent
      const fileValidationAfterRefresh = validateRequiredFiles();
      if (!fileValidationAfterRefresh.isValid) {
        toast.error("Veuillez joindre tous les documents requis", {
          description: fileValidationAfterRefresh.errors.join(", "),
        });
        setIsSubmitting(false);
        return;
      }
      
      // Soumettre les données sans les fichiers (ils sont déjà uploadés)
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
        return renderPersonalInfo();
      case 1:
        return renderPropertyInfo();
      case 2:
        return renderBailInfo();
      case 3:
        return renderTenantInfo();
      case 4:
        return renderDocuments();
      default:
        return null;
    }
  };

  const renderPersonalInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Informations propriétaire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type de client *</Label>
          <Controller
            name="type"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={(value) => {
                  const selectedType = value as ClientType;
                  field.onChange(selectedType);
                  setClientType(selectedType);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type de client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ClientType.PERSONNE_PHYSIQUE}>Personne physique</SelectItem>
                  <SelectItem value={ClientType.PERSONNE_MORALE}>Personne morale</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.type && (
            <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
          )}
        </div>

        {clientType === ClientType.PERSONNE_PHYSIQUE ? (
          <>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="profession">Profession *</Label>
              <Input id="profession" {...form.register("profession")} />
              {form.formState.errors.profession && (
                <p className="text-sm text-destructive">{form.formState.errors.profession.message}</p>
              )}
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="familyStatus">Situation familiale *</Label>
                <Controller
                  name="familyStatus"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
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
                        <SelectTrigger>
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
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthPlace">Lieu de naissance *</Label>
                <Input id="birthPlace" {...form.register("birthPlace")} />
                {form.formState.errors.birthPlace && (
                  <p className="text-sm text-destructive">{form.formState.errors.birthPlace.message}</p>
                )}
              </div>
             
              <div className="space-y-2">
                <Label htmlFor="birthDate">Date de naissance *</Label>
                <Input id="birthDate" type="date" {...form.register("birthDate")} />
                
                {form.formState.errors.birthDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.birthDate.message}</p>
                )}  
              </div>
             
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="legalName">Raison sociale *</Label>
              <Input id="legalName" {...form.register("legalName")} />
              {form.formState.errors.legalName && (
                <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration">SIREN/SIRET *</Label>
              <Input id="registration" {...form.register("registration")} />
            </div>
          </>
        )}

        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
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
                />
              )}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input 
              id="email" 
              type="email" 
              {...form.register("email")} 
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-sm text-muted-foreground">L'email ne peut pas être modifié</p>
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullAddress">Adresse complète *</Label>
          <Textarea id="fullAddress" {...form.register("fullAddress")} />
          {form.formState.errors.fullAddress && (
            <p className="text-sm text-destructive">{form.formState.errors.fullAddress.message}</p>
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
      </CardContent>
    </Card>
  );

  const renderPropertyInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Informations du bien</CardTitle>
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
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="propertyType">Type de bien *</Label>
            <Controller
              name="propertyType"
              control={form.control}
              render={({ field }) => (                
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type de bien" />
                    </SelectTrigger>
                    <SelectContent>
                      {BienType && Object.values(BienType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
            />
            {form.formState.errors.propertyType && (
              <p className="text-sm text-destructive">{form.formState.errors.propertyType.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertySurfaceM2">Surface *</Label>
            <NumberInputGroup field={form.register("propertySurfaceM2")} min={0} unit="m²" step={0.01} isDecimal={true} />
            {form.formState.errors.propertySurfaceM2 && (
              <p className="text-sm text-destructive">{form.formState.errors.propertySurfaceM2.message}</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="propertyLegalStatus">Statut légal *</Label>
            <Controller
              name="propertyLegalStatus"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le statut légal" />
                  </SelectTrigger>
                  <SelectContent>
                    {BienLegalStatus && Object.values(BienLegalStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bailType">Type de bail *</Label>
          <Controller
            name="bailType"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(BailType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.bailType && (
            <p className="text-sm text-destructive">{form.formState.errors.bailType.message}</p>
          )}
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bailRentAmount">Montant du loyer *</Label>
            <NumberInputGroup field={form.register("bailRentAmount")} min={0} unit="€" />
            {form.formState.errors.bailRentAmount && (
              <p className="text-sm text-destructive">{form.formState.errors.bailRentAmount.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bailEffectiveDate">Date de prise d'effet *</Label>
            <Input id="bailEffectiveDate" type="date" {...form.register("bailEffectiveDate")} />
            {form.formState.errors.bailEffectiveDate && (
              <p className="text-sm text-destructive">{form.formState.errors.bailEffectiveDate.message}</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bailEndDate">Date de fin</Label>
            <Input id="bailEndDate" type="date" {...form.register("bailEndDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bailPaymentDay">Jour de paiement *</Label>
            <NumberInputGroup field={form.register("bailPaymentDay")} min={1} max={31} />
            {form.formState.errors.bailPaymentDay && (
              <p className="text-sm text-destructive">{form.formState.errors.bailPaymentDay.message}</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bailMonthlyCharges">Charges mensuelles *</Label>
            <NumberInputGroup field={form.register("bailMonthlyCharges")} min={0} unit="€" />
            {form.formState.errors.bailMonthlyCharges && (
              <p className="text-sm text-destructive">{form.formState.errors.bailMonthlyCharges.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bailSecurityDeposit">Dépôt de garantie *</Label>
            <NumberInputGroup field={form.register("bailSecurityDeposit")} min={0} unit="€" />
            {form.formState.errors.bailSecurityDeposit && (
              <p className="text-sm text-destructive">{form.formState.errors.bailSecurityDeposit.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTenantInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Informations du locataire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tenantEmail">Email du locataire *</Label>
          <Input id="tenantEmail" type="email" {...form.register("tenantEmail")} disabled={tenant?.email ? true : false} />
          {form.formState.errors.tenantEmail && (
            <p className="text-sm text-destructive">{form.formState.errors.tenantEmail.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Un email sera envoyé au locataire pour qu'il complète ses informations.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderDocuments = () => (
    <Card>
      <CardHeader>
        <CardTitle>Pièces jointes</CardTitle>
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
          </div>
        </div>

        {/* Pièces jointes - Bien */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documents du bien</h3>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">

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
      <div className="fixed top-27 sm:top-40  left-0 right-0 bg-background border-b border-border/40 z-40 pb-2 sm:pb-4">
        <div className="max-w-2xl mx-auto px-3 sm:px-4">
          <Stepper 
            steps={STEPS} 
            currentStep={currentStep}
            className="flex flex-row justify-between items-center w-full"
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
      
      <div className="mt-40 sm:mt-72">     
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
