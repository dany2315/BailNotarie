"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, FileText, Trash2, Upload, Eye, Download, Plus, User } from "lucide-react";
import { updateClientSchema } from "@/lib/zod/client";
import { ClientType, ProfilType, FamilyStatus, MatrimonialRegime, DocumentKind } from "@prisma/client";
import { updateClient } from "@/lib/actions/clients";
import { PhoneInput } from "@/components/ui/phone-input";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { deleteDocument, getDocuments } from "@/lib/actions/documents";
import { FileUpload } from "@/components/ui/file-upload";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { getRequiredClientFields } from "@/lib/utils/required-fields";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { useDownloadFile } from "@/hooks/use-download-file";

interface EditClientFormProps {
  client: any;
}

export function EditClientForm({ client }: EditClientFormProps) {
  const router = useRouter();
  const { downloadFile, isDownloading } = useDownloadFile();
  const [isLoading, setIsLoading] = useState(false);
  const [clientType, setClientType] = useState<ClientType>(client.type || ClientType.PERSONNE_PHYSIQUE);
  
  // Obtenir les données depuis Person ou Entreprise
  const entreprise = client.entreprise;
  
  // Préparer les personnes pour le formulaire
  const initialPersons = client.persons && client.persons.length > 0
    ? client.persons.map((p: any) => ({
        id: p.id,
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        profession: p.profession || "",
        phone: p.phone || "",
        email: p.email || "",
        fullAddress: p.fullAddress || "",
        nationality: p.nationality || "",
        familyStatus: p.familyStatus || undefined,
        matrimonialRegime: p.matrimonialRegime || undefined,
        birthPlace: p.birthPlace || "",
        birthDate: p.birthDate ? new Date(p.birthDate).toISOString().split("T")[0] : "",
        isPrimary: p.isPrimary || false,
      }))
    : [{
        id: undefined,
        firstName: "",
        lastName: "",
        profession: "",
        phone: "",
        email: "",
        fullAddress: "",
        nationality: "",
        familyStatus: undefined,
        matrimonialRegime: undefined,
        birthPlace: "",
        birthDate: "",
        isPrimary: true,
      }];
  
  // Séparer les documents par type - utiliser des états pour pouvoir les mettre à jour
  const [personDocumentsMap, setPersonDocumentsMap] = useState<Map<string, any[]>>(new Map());
  const [entrepriseDocuments, setEntrepriseDocuments] = useState<any[]>([]);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  
  // Initialiser les documents depuis le client
  useEffect(() => {
    const newPersonDocumentsMap = new Map<string, any[]>();
    client.persons?.forEach((p: any) => {
      if (p.id) {
        newPersonDocumentsMap.set(p.id, p.documents || []);
      }
    });
    setPersonDocumentsMap(newPersonDocumentsMap);
    setEntrepriseDocuments(client.entreprise?.documents || []);
    setClientDocuments(client.documents || []);
  }, [client]);
  
  // Collecter tous les documents pour la vérification globale
  const allDocuments = [
    ...Array.from(personDocumentsMap.values()).flat(),
    ...entrepriseDocuments,
    ...clientDocuments,
  ];
  
  const [documents, setDocuments] = useState<any[]>(allDocuments);
  
  // Mettre à jour allDocuments quand les documents changent
  useEffect(() => {
    const updatedAllDocuments = [
      ...Array.from(personDocumentsMap.values()).flat(),
      ...entrepriseDocuments,
      ...clientDocuments,
    ];
    setDocuments(updatedAllDocuments);
  }, [personDocumentsMap, entrepriseDocuments, clientDocuments]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [uploadingDocumentKind, setUploadingDocumentKind] = useState<DocumentKind | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, File | null>>({});
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(updateClientSchema) as any,
    defaultValues: {
      id: client.id,
      type: client.type,
      // profilType n'est pas modifiable, mais on le garde pour la validation
      profilType: client.profilType,
      // Tableau de personnes pour PERSONNE_PHYSIQUE
      persons: initialPersons,
      entreprise: entreprise,
    },
  });

  // Gérer le tableau de personnes
  const { fields: personFields, append: appendPerson, remove: removePerson } = useFieldArray({
    control: form.control,
    name: "persons",
  });

  // État pour gérer l'onglet actif des personnes
  const [activePersonTab, setActivePersonTab] = useState<string>(
    initialPersons.length > 0 ? "person-0" : "add-person"
  );
  
  // Ref pour suivre l'onglet actif (pour éviter les problèmes de dépendances dans useEffect)
  const activePersonTabRef = useRef(initialPersons.length > 0 ? "person-0" : "add-person");
  
  // Ref pour suivre si on vient d'ajouter une personne
  const isAddingPersonRef = useRef(false);
  // Ref pour empêcher les clics multiples sur l'onglet "Ajouter"
  const isAddingPersonInProgressRef = useRef(false);

  // Synchroniser la ref avec l'état
  useEffect(() => {
    activePersonTabRef.current = activePersonTab;
  }, [activePersonTab]);

  // Mettre à jour l'onglet actif quand une personne est supprimée
  useEffect(() => {
    // Si on vient d'ajouter une personne, ne pas interférer
    if (isAddingPersonRef.current) {
      isAddingPersonRef.current = false;
      return;
    }
    
    const currentTab = activePersonTabRef.current;
    
    // Vérifier si l'onglet actif existe encore
    if (personFields.length === 0) {
      setActivePersonTab("add-person");
    } else {
      // Si l'onglet actif n'existe plus (personne supprimée), passer au premier onglet disponible
      if (currentTab !== "add-person" && !personFields.some((_, i) => `person-${i}` === currentTab)) {
        setActivePersonTab("person-0");
      }
    }
  }, [personFields.length]);

  // Observer les valeurs du formulaire pour calculer les documents requis
  const watchedType = form.watch("type") || clientType;
  const watchedProfilType = form.watch("profilType") || client.profilType;
  // Pour les personnes physiques, utiliser la personne primaire pour les documents requis
  const primaryPersonIndex = personFields.findIndex((_, i) => form.watch(`persons.${i}.isPrimary`));
  const watchedFamilyStatus = primaryPersonIndex >= 0 
    ? form.watch(`persons.${primaryPersonIndex}.familyStatus`)
    : undefined;
  const watchedMatrimonialRegime = primaryPersonIndex >= 0
    ? form.watch(`persons.${primaryPersonIndex}.matrimonialRegime`)
    : undefined;
  
  // Calculer les documents requis en fonction des données du formulaire
  const { requiredDocuments: globalRequiredDocuments } = getRequiredClientFields(
    watchedType,
    watchedProfilType,
    watchedFamilyStatus,
    watchedMatrimonialRegime
  );
  
  // Documents requis pour chaque personne (ID_IDENTITY)
  const personRequiredDocuments = [DocumentKind.ID_IDENTITY];
  
  // Documents requis pour l'entreprise (KBIS, STATUTES)
  const entrepriseRequiredDocuments = [DocumentKind.KBIS, DocumentKind.STATUTES];
  
  // Documents requis pour le client (selon statut familial)
  const clientRequiredDocuments: DocumentKind[] = [];
  if (watchedFamilyStatus === FamilyStatus.MARIE) {
    clientRequiredDocuments.push(DocumentKind.LIVRET_DE_FAMILLE);
  } else if (watchedFamilyStatus === FamilyStatus.PACS) {
    clientRequiredDocuments.push(DocumentKind.CONTRAT_DE_PACS);
  }
  
  // Documents requis selon le profil (assurance, RIB pour locataire)
  const profilRequiredDocuments: DocumentKind[] = [];
  if (watchedProfilType === ProfilType.LOCATAIRE) {
    profilRequiredDocuments.push(DocumentKind.INSURANCE, DocumentKind.RIB);
  }

  // Fonction pour déterminer quels documents doivent être affichés (uniquement pour l'affichage, ne bloque pas la soumission)
  const hasRequiredDocument = (kind: DocumentKind) => {
    return documents.some((doc) => doc.kind === kind);
  };

  const refreshDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      // Récupérer les données du client à jour depuis l'API
      const response = await fetch(`/api/clients/${client.id}`);
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des données");
      }
      const updatedClient = await response.json();
      
      // Mettre à jour les documents depuis le client mis à jour
      const newPersonDocumentsMap = new Map<string, any[]>();
      updatedClient.persons?.forEach((p: any) => {
        if (p.id) {
          newPersonDocumentsMap.set(p.id, p.documents || []);
        }
      });
      
      setPersonDocumentsMap(newPersonDocumentsMap);
      setEntrepriseDocuments(updatedClient.entreprise?.documents || []);
      setClientDocuments(updatedClient.documents || []);
      
      // Ne pas rafraîchir la page pour éviter d'interrompre les autres uploads en cours
      // La mise à jour de l'état local suffit pour afficher les nouveaux documents
    } catch (error) {
      console.error("Erreur lors du chargement des documents:", error);
      // Ne pas rafraîchir la page même en cas d'erreur pour ne pas interrompre les uploads
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Réinitialiser le régime matrimonial si le statut familial change et n'est plus MARIE
  useEffect(() => {
    if (primaryPersonIndex >= 0 && watchedFamilyStatus !== FamilyStatus.MARIE && watchedMatrimonialRegime) {
      form.setValue(`persons.${primaryPersonIndex}.matrimonialRegime`, undefined);
    }
  }, [watchedFamilyStatus, watchedMatrimonialRegime, primaryPersonIndex, form]);

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      toast.success("Document supprimé avec succès");
      await refreshDocuments();
      // Ne pas rafraîchir la page pour éviter d'interrompre les uploads en cours
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  // handleUploadDocument supprimé - maintenant l'upload se fait directement via FileUpload avec upload direct

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      console.log("Données soumises:", data);
      await updateClient(data);
      toast.success("Client modifié avec succès");
      router.push(`/interface/clients/${client.id}`);
      router.refresh();
    } catch (error: any) {
      console.error("Erreur lors de la modification:", error);
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setIsLoading(false);
    }
  };

  const onError = (errors: any) => {
    // Afficher les erreurs de validation avec des toasts
    const errorMessages: string[] = [];
    
    Object.keys(errors).forEach((key) => {
      const error = errors[key];
      if (error?.message) {
        errorMessages.push(`${key}: ${error.message}`);
      }
    });

    if (errorMessages.length > 0) {
      // Afficher la première erreur ou toutes les erreurs
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

  return (
    <form onSubmit={form.handleSubmit(handleSubmit, onError)} className="space-y-6">
      <Tabs value={clientType} onValueChange={(value) => {
        setClientType(value as ClientType);
        form.setValue("type", value as ClientType);
      }}>
        <TabsList className="grid w-full grid-cols-2 border rounded-lg mb-6" >
          <TabsTrigger value={ClientType.PERSONNE_PHYSIQUE} disabled={isLoading}>Particulier</TabsTrigger>
          <TabsTrigger value={ClientType.PERSONNE_MORALE} disabled={isLoading}>Entreprise</TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle>Informations client</CardTitle>
            <CardDescription>
              Modifier les informations du client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Afficher le profilType en lecture seule */}
            <div className="space-y-2">
              <Label>Profil</Label>
              <div className="px-3 py-2 border rounded-md bg-muted/50">
                <p className="text-sm font-medium">{client.profilType.replace(/_/g, " ")}</p>
              </div>
            </div>

            {clientType === ClientType.PERSONNE_PHYSIQUE ? (
              <div className="space-y-6">
                <Label className="text-base font-semibold">Personnes</Label>
              
                <Tabs 
                  value={activePersonTab} 
                  onValueChange={(value) => {
                    if (value === "add-person") {
                      // Empêcher les clics multiples
                      if (isAddingPersonInProgressRef.current) {
                        return;
                      }
                      
                      // Créer automatiquement une nouvelle personne
                      isAddingPersonInProgressRef.current = true;
                      const newIndex = personFields.length;
                      isAddingPersonRef.current = true;
                      
                      appendPerson({
                        id: undefined,
                        firstName: "",
                        lastName: "",
                        profession: "",
                        phone: "",
                        email: "",
                        fullAddress: "",
                        nationality: "",
                        familyStatus: undefined,
                        matrimonialRegime: undefined,
                        birthPlace: "",
                        birthDate: "",
                        isPrimary: false,
                      });
                      
                      // Changer l'onglet vers la nouvelle personne après un court délai
                      setTimeout(() => {
                        setActivePersonTab(`person-${newIndex}`);
                        // Réinitialiser le flag après un délai pour permettre un nouvel ajout
                        setTimeout(() => {
                          isAddingPersonInProgressRef.current = false;
                        }, 500);
                      }, 10);
                    } else {
                      setActivePersonTab(value);
                    }
                  }} 
                  className=""
                >
                  <TabsList className="grid h-auto p-1" style={{ gridTemplateColumns: `repeat(${personFields.length + 1}, minmax(0, 1fr))` }}>
                    {personFields.map((field, index) => {
                      const isPrimary = form.watch(`persons.${index}.isPrimary`);
                      const personName = `${form.watch(`persons.${index}.firstName`) || ""} ${form.watch(`persons.${index}.lastName`) || ""}`.trim() || `Personne ${index + 1}`;
                      return (
                        <TabsTrigger 
                          key={field.id} 
                          value={`person-${index}`}
                          className="relative " 
                        >
                          <span className="truncate">{personName}</span>
                        </TabsTrigger>
                      );
                    })}
                    <TabsTrigger value="add-person" className="flex items-center gap-2 px-10 py-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Ajouter</span>
                    </TabsTrigger>
                  </TabsList>

                  {personFields.map((field, index) => {
                  const watchedFamilyStatus = form.watch(`persons.${index}.familyStatus`);
                  const isPrimary = form.watch(`persons.${index}.isPrimary`);
                  const personId = form.watch(`persons.${index}.id`) || client.persons?.[index]?.id;
                  const personDocuments = personId ? (personDocumentsMap.get(personId) || []) : [];
                  const personName = `${form.watch(`persons.${index}.firstName`) || ""} ${form.watch(`persons.${index}.lastName`) || ""}`.trim() || `Personne ${index + 1}`;
                  
                  return (
                    <TabsContent key={field.id} value={`person-${index}`} className="">
                      <Card className="rounded-lg">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <User className="h-5 w-5" />
                              {personName}
                              {isPrimary && (
                                <Badge variant="default">Personne principale</Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Controller
                                name={`persons.${index}.isPrimary`}
                                control={form.control}
                                render={({ field }) => (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`isPrimary-${index}`}
                                      checked={field.value || false}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          personFields.forEach((_, i) => {
                                            if (i !== index) {
                                              form.setValue(`persons.${i}.isPrimary`, false);
                                            }
                                          });
                                        }
                                        field.onChange(e.target.checked);
                                      }}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`isPrimary-${index}`} className="text-sm font-normal cursor-pointer">
                                      Personne principale
                                    </Label>
                                  </div>
                                )}
                              />
                              {personFields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const personToRemove = form.getValues(`persons.${index}`);
                                    const hasId = !!personToRemove?.id;
                                    
                                    // Si c'est la personne principale et qu'il y a d'autres personnes, 
                                    // marquer la première autre personne comme principale
                                    if (isPrimary && personFields.length > 1) {
                                      const nextIndex = index === 0 ? 1 : 0;
                                      form.setValue(`persons.${nextIndex}.isPrimary`, true);
                                    }
                                    
                                    // Supprimer la personne du formulaire
                                    removePerson(index);
                                    
                                    // Gérer l'onglet actif après suppression
                                    if (activePersonTab === `person-${index}`) {
                                      // Si on supprime l'onglet actif, passer au précédent ou au suivant
                                      if (index > 0) {
                                        setActivePersonTab(`person-${index - 1}`);
                                      } else if (personFields.length > 1) {
                                        setActivePersonTab(`person-${index + 1}`);
                                      } else {
                                        setActivePersonTab("add-person");
                                      }
                                    } else if (activePersonTab.startsWith("person-")) {
                                      // Réajuster les indices des onglets après la suppression
                                      const currentIndex = parseInt(activePersonTab.split("-")[1]);
                                      if (currentIndex > index) {
                                        setActivePersonTab(`person-${currentIndex - 1}`);
                                      }
                                    }
                                    
                                    // Afficher un message informatif
                                    if (hasId) {
                                      toast.info("La personne sera supprimée de la base de données lors de l'enregistrement");
                                    }
                                  }}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`persons.${index}.firstName`}>Prénom</Label>
                            <Input
                              {...form.register(`persons.${index}.firstName`)}
                              placeholder="Prénom"
                              disabled={isLoading}
                            />
                            {(() => {
                              const personErrors = form.formState.errors.persons as any;
                              return personErrors?.[index]?.firstName && (
                                <p className="text-sm text-destructive">
                                  {personErrors[index]?.firstName?.message as string}
                                </p>
                              );
                            })()}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`persons.${index}.lastName`}>Nom</Label>
                            <Input
                              {...form.register(`persons.${index}.lastName`)}
                              placeholder="Nom"
                              disabled={isLoading}
                            />
                            {(() => {
                              const personErrors = form.formState.errors.persons as any;
                              return personErrors?.[index]?.lastName && (
                                <p className="text-sm text-destructive">
                                  {personErrors[index]?.lastName?.message as string}
                                </p>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`persons.${index}.profession`}>Profession</Label>
                          <Input
                            {...form.register(`persons.${index}.profession`)}
                            placeholder="Profession"
                            disabled={isLoading}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`persons.${index}.familyStatus`}>Statut familial</Label>
                            <Controller
                              name={`persons.${index}.familyStatus`}
                              control={form.control}
                              render={({ field }) => (
                                <Select value={field.value || ""} onValueChange={field.onChange} disabled={isLoading}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner le statut familial" />
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
                          </div>

                          {watchedFamilyStatus === FamilyStatus.MARIE && (
                            <div className="space-y-2">
                              <Label htmlFor={`persons.${index}.matrimonialRegime`}>Régime matrimonial</Label>
                              <Controller
                                name={`persons.${index}.matrimonialRegime`}
                                control={form.control}
                                render={({ field }) => (
                                  <Select value={field.value || ""} onValueChange={field.onChange} disabled={isLoading}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner le régime matrimonial" />
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
                            </div>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`persons.${index}.birthPlace`}>Lieu de naissance</Label>
                            <Input
                              {...form.register(`persons.${index}.birthPlace`)}
                              placeholder="Lieu de naissance"
                              disabled={isLoading}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`persons.${index}.birthDate`}>Date de naissance</Label>
                            <Input
                              type="date"
                              {...form.register(`persons.${index}.birthDate`)}
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`persons.${index}.email`}>Email</Label>
                            <Input
                              type="email"
                              {...form.register(`persons.${index}.email`)}
                              placeholder="Email"
                              disabled={isLoading}
                            />
                            {(() => {
                              const personErrors = form.formState.errors.persons as any;
                              const emailError = personErrors?.[index]?.email;
                              return emailError && (
                                <p className="text-sm text-destructive">
                                  {emailError.message as string}
                                </p>
                              );
                            })()}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`persons.${index}.phone`}>Téléphone</Label>
                            <Controller
                              name={`persons.${index}.phone`}
                              control={form.control}
                              render={({ field }) => (
                                <PhoneInput
                                  value={field.value || undefined}
                                  onChange={field.onChange}
                                  defaultCountry="FR"
                                  international
                                  countryCallingCodeEditable={false}
                                  placeholder="Numéro de téléphone"
                                  disabled={isLoading}
                                />
                              )}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`persons.${index}.fullAddress`}>Adresse complète</Label>
                          <Textarea
                            {...form.register(`persons.${index}.fullAddress`)}
                            placeholder="Adresse complète"
                            disabled={isLoading}
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`persons.${index}.nationality`}>Nationalité</Label>
                          <Controller
                            name={`persons.${index}.nationality`}
                            control={form.control}
                            render={({ field }) => (
                              <NationalitySelect
                                value={field.value || undefined}
                                onValueChange={field.onChange}
                                disabled={isLoading}
                                placeholder="Sélectionner la nationalité"
                              />
                            )}
                          />
                        </div>
                        
                        {/* Documents de la personne */}
                        <div className="mt-6 pt-6 border-t">
                          <Label className="text-base font-semibold mb-4 block">Documents de la personne</Label>
                          {personRequiredDocuments.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {personRequiredDocuments.map((kind) => {
                                const hasDocument = personDocuments.some((doc: any) => doc.kind === kind);
                                const existingDoc = personDocuments.find((doc: any) => doc.kind === kind);
                                const isUploading = uploadingDocumentKind === kind && isUploadingDocument;
                                const fileForKind = uploadingFiles[`${kind}-${personId}`];
                                
                                return (
                                  <div
                                    key={kind}
                                    className={`p-3 border rounded-md transition-colors ${
                                      hasDocument
                                        ? "bg-muted/30 hover:bg-muted/50"
                                        : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className={`size-4 shrink-0 ${hasDocument ? "text-muted-foreground" : "text-destructive"}`} />
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium truncate ${hasDocument ? "" : "text-destructive"}`}>
                                            {documentKindLabels[kind] || kind}
                                            {!hasDocument && <span className="text-destructive ml-1">*</span>}
                                          </p>
                                          {existingDoc?.label && (
                                            <p className="text-xs text-muted-foreground truncate">
                                              {existingDoc.label}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {existingDoc ? (
                                          <>
                                            <DocumentViewer
                                              document={existingDoc}
                                              documentKindLabels={documentKindLabels}
                                            >
                                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Eye className="size-4" />
                                              </Button>
                                            </DocumentViewer>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => downloadFile(existingDoc.fileKey, existingDoc.label || `document-${existingDoc.id}`)}
                                              disabled={isDownloading}
                                            >
                                              {isDownloading ? (
                                                <Loader2 className="size-4 animate-spin" />
                                              ) : (
                                                <Download className="size-4" />
                                              )}
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-destructive hover:text-destructive"
                                              onClick={() => handleDeleteDocument(existingDoc.id)}
                                              disabled={isLoading}
                                            >
                                              <Trash2 className="size-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <span className="text-xs text-destructive">Manquant</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {!hasDocument && (
                                      <div className="mt-2 pt-2 border-t border-destructive/20">
                                        <FileUpload
                                          label=""
                                          value={fileForKind || null}
                                          onChange={(file: File | null) => {
                                            setUploadingFiles((prev) => ({ ...prev, [`${kind}-${personId}`]: file }));
                                            if (file) {
                                              // L'upload se fait automatiquement via FileUpload
                                              setTimeout(() => refreshDocuments(), 1000);
                                            }
                                          }}
                                          accept="application/pdf,image/*"
                                          disabled={isUploading}
                                          documentKind={kind}
                                          documentPersonId={personId}
                                          onUploadComplete={() => {
                                            setUploadingFiles((prev) => ({ ...prev, [`${kind}-${personId}`]: null }));
                                            refreshDocuments();
                                            // Ne pas rafraîchir la page pour éviter d'interrompre les autres uploads en cours
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Autres documents de la personne */}
                          {personDocuments.filter((doc: any) => !personRequiredDocuments.includes(doc.kind as any)).length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm">Autres documents</Label>
                              {personDocuments
                                .filter((doc: any) => !personRequiredDocuments.includes(doc.kind as any))
                                .map((doc: any) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <FileText className="size-4 text-muted-foreground shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {documentKindLabels[doc.kind] || doc.kind}
                                        </p>
                                        {doc.label && (
                                          <p className="text-xs text-muted-foreground truncate">
                                            {doc.label}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <DocumentViewer
                                        document={doc}
                                        documentKindLabels={documentKindLabels}
                                      >
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <Eye className="size-4" />
                                        </Button>
                                      </DocumentViewer>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => downloadFile(doc.fileKey, doc.label || `document-${doc.id}`)}
                                        disabled={isDownloading}
                                      >
                                        {isDownloading ? (
                                          <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                          <Download className="size-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        disabled={isLoading}
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}

                <TabsContent value="add-person" className="mt-4">
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <User className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">Cliquez sur l'onglet "Ajouter" pour créer une nouvelle personne</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                </Tabs>
                
                {/* Documents du client (en bas des personnes) */}
                {(clientRequiredDocuments.length > 0 || profilRequiredDocuments.length > 0 || clientDocuments.length > 0) && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documents du client
                      </CardTitle>
                      <CardDescription>
                        Documents liés au client (livret de famille, contrat PACS, assurance, RIB)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Documents requis pour le client */}
                      {clientRequiredDocuments.length > 0 && (
                        <div className="space-y-2">
                          <Label>Documents requis</Label>
                          <div className="space-y-1.5">
                            {clientRequiredDocuments.map((kind) => {
                              const hasDocument = clientDocuments.some((doc: any) => doc.kind === kind);
                              const existingDoc = clientDocuments.find((doc: any) => doc.kind === kind);
                              const isUploading = uploadingDocumentKind === kind && isUploadingDocument;
                              const fileForKind = uploadingFiles[`${kind}-client`];
                              
                              return (
                                <div
                                  key={kind}
                                  className={`p-3 border rounded-md transition-colors ${
                                    hasDocument
                                      ? "bg-muted/30 hover:bg-muted/50"
                                      : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <FileText className={`size-4 shrink-0 ${hasDocument ? "text-muted-foreground" : "text-destructive"}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${hasDocument ? "" : "text-destructive"}`}>
                                          {documentKindLabels[kind] || kind}
                                          {!hasDocument && <span className="text-destructive ml-1">*</span>}
                                        </p>
                                        {existingDoc?.label && (
                                          <p className="text-xs text-muted-foreground truncate">
                                            {existingDoc.label}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {existingDoc ? (
                                        <>
                                          <DocumentViewer
                                            document={existingDoc}
                                            documentKindLabels={documentKindLabels}
                                          >
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <Eye className="size-4" />
                                            </Button>
                                          </DocumentViewer>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => downloadFile(existingDoc.fileKey, existingDoc.label || `document-${existingDoc.id}`)}
                                            disabled={isDownloading}
                                          >
                                            {isDownloading ? (
                                              <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                              <Download className="size-4" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteDocument(existingDoc.id)}
                                            disabled={isLoading}
                                          >
                                            <Trash2 className="size-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <span className="text-xs text-destructive">Manquant</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {!hasDocument && (
                                    <div className="mt-2 pt-2 border-t border-destructive/20">
                                      <FileUpload
                                        label=""
                                        value={fileForKind || null}
                                        onChange={(file: File | null) => {
                                          setUploadingFiles((prev) => ({ ...prev, [`${kind}-client`]: file }));
                                          if (file) {
                                            // L'upload se fait automatiquement via FileUpload
                                            setTimeout(() => refreshDocuments(), 1000);
                                          }
                                        }}
                                        accept="application/pdf,image/*"
                                        disabled={isUploading}
                                        documentKind={kind}
                                        documentClientId={client.id}
                                        onUploadComplete={() => {
                                          setUploadingFiles((prev) => ({ ...prev, [`${kind}-client`]: null }));
                                          refreshDocuments();
                                          // Ne pas rafraîchir la page pour éviter d'interrompre les autres uploads en cours
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Documents requis selon le profil */}
                      {profilRequiredDocuments.length > 0 && (
                        <div className="space-y-2">
                          <Label>Documents requis selon le profil</Label>
                          <div className="space-y-1.5">
                            {profilRequiredDocuments.map((kind) => {
                              // Chercher dans tous les documents (personnes, entreprise, client)
                              const hasDocument = allDocuments.some((doc: any) => doc.kind === kind);
                              const existingDoc = allDocuments.find((doc: any) => doc.kind === kind);
                              const isUploading = uploadingDocumentKind === kind && isUploadingDocument;
                              const fileForKind = uploadingFiles[`${kind}-profil`];
                              
                              return (
                                <div
                                  key={kind}
                                  className={`p-3 border rounded-md transition-colors ${
                                    hasDocument
                                      ? "bg-muted/30 hover:bg-muted/50"
                                      : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <FileText className={`size-4 shrink-0 ${hasDocument ? "text-muted-foreground" : "text-destructive"}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${hasDocument ? "" : "text-destructive"}`}>
                                          {documentKindLabels[kind] || kind}
                                          {!hasDocument && <span className="text-destructive ml-1">*</span>}
                                        </p>
                                        {existingDoc?.label && (
                                          <p className="text-xs text-muted-foreground truncate">
                                            {existingDoc.label}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {existingDoc ? (
                                        <>
                                          <DocumentViewer
                                            document={existingDoc}
                                            documentKindLabels={documentKindLabels}
                                          >
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <Eye className="size-4" />
                                            </Button>
                                          </DocumentViewer>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => downloadFile(existingDoc.fileKey, existingDoc.label || `document-${existingDoc.id}`)}
                                            disabled={isDownloading}
                                          >
                                            {isDownloading ? (
                                              <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                              <Download className="size-4" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteDocument(existingDoc.id)}
                                            disabled={isLoading}
                                          >
                                            <Trash2 className="size-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <span className="text-xs text-destructive">Manquant</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {!hasDocument && (
                                    <div className="mt-2 pt-2 border-t border-destructive/20">
                                      <FileUpload
                                        label=""
                                        value={fileForKind || null}
                                        onChange={(file: File | null) => {
                                          setUploadingFiles((prev) => ({ ...prev, [`${kind}-profil`]: file }));
                                          if (file) {
                                            // L'upload se fait automatiquement via FileUpload
                                            setTimeout(() => refreshDocuments(), 1000);
                                          }
                                        }}
                                        accept="application/pdf,image/*"
                                        disabled={isUploading}
                                        documentKind={kind}
                                        documentClientId={client.id}
                                        onUploadComplete={() => {
                                          setUploadingFiles((prev) => ({ ...prev, [`${kind}-profil`]: null }));
                                          refreshDocuments();
                                          // Ne pas rafraîchir la page pour éviter d'interrompre les autres uploads en cours
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Autres documents du client */}
                      {clientDocuments.filter((doc: any) => 
                        !clientRequiredDocuments.includes(doc.kind as DocumentKind) && 
                        !profilRequiredDocuments.includes(doc.kind as DocumentKind)
                      ).length > 0 && (
                        <div className="space-y-2">
                          <Label>Autres documents</Label>
                          <div className="space-y-1.5">
                            {clientDocuments
                              .filter((doc: any) => 
                                !clientRequiredDocuments.includes(doc.kind as DocumentKind) && 
                                !profilRequiredDocuments.includes(doc.kind as DocumentKind)
                              )
                              .map((doc: any) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="size-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {documentKindLabels[doc.kind] || doc.kind}
                                      </p>
                                      {doc.label && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {doc.label}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DocumentViewer
                                      document={doc}
                                      documentKindLabels={documentKindLabels}
                                    >
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Eye className="size-4" />
                                      </Button>
                                    </DocumentViewer>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => downloadFile(doc.fileKey, doc.label || `document-${doc.id}`)}
                                      disabled={isDownloading}
                                    >
                                      {isDownloading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <Download className="size-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      disabled={isLoading}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="legalName">Raison sociale *</Label>
                  <Input
                    id="legalName"
                    {...form.register("legalName")}
                    placeholder="Raison sociale"
                    disabled={isLoading}
                  />
                  {form.formState.errors.legalName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.legalName.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nom commercial</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Nom commercial"
                    disabled={isLoading}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message as string}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registration">Numéro d'enregistrement (SIREN/SIRET) *</Label>
                  <Input
                    id="registration"
                    {...form.register("registration")}
                    placeholder="Numéro d'enregistrement"
                    disabled={isLoading}
                  />
                  {form.formState.errors.registration && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.registration.message as string}
                    </p>
                  )}
                </div>
              </>
            )}

            {clientType === ClientType.PERSONNE_MORALE && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="Email"
                      disabled={isLoading}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.email.message as string}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
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
                          disabled={isLoading}
                        />
                      )}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.phone.message as string}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullAddress">Adresse complète</Label>
                  <Textarea
                    id="fullAddress"
                    {...form.register("fullAddress")}
                    placeholder="Adresse complète"
                    disabled={isLoading}
                    rows={3}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Section Documents pour entreprise */}
      {clientType === ClientType.PERSONNE_MORALE && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents de l'entreprise
            </CardTitle>
            <CardDescription>
              Documents requis pour l'entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Documents requis pour l'entreprise */}
            {entrepriseRequiredDocuments.length > 0 && (
              <div className="space-y-2">
                <Label>Documents requis</Label>
                <div className="space-y-1.5">
                  {entrepriseRequiredDocuments.map((kind) => {
                    const hasDocument = entrepriseDocuments.some((doc: any) => doc.kind === kind);
                    const existingDoc = entrepriseDocuments.find((doc: any) => doc.kind === kind);
                    const isUploading = uploadingDocumentKind === kind && isUploadingDocument;
                    const fileForKind = uploadingFiles[`${kind}-entreprise`];
                  
                  return (
                    <div
                      key={kind}
                      className={`p-3 border rounded-md transition-colors ${
                        hasDocument
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className={`size-4 shrink-0 ${hasDocument ? "text-muted-foreground" : "text-destructive"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${hasDocument ? "" : "text-destructive"}`}>
                              {documentKindLabels[kind] || kind}
                              {!hasDocument && <span className="text-destructive ml-1">*</span>}
                            </p>
                            {existingDoc?.label && (
                              <p className="text-xs text-muted-foreground truncate">
                                {existingDoc.label}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {existingDoc ? (
                            <>
                              <DocumentViewer
                                document={existingDoc}
                                documentKindLabels={documentKindLabels}
                              >
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="size-4" />
                                </Button>
                              </DocumentViewer>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => downloadFile(existingDoc.fileKey, existingDoc.label || `document-${existingDoc.id}`)}
                                disabled={isDownloading}
                              >
                                {isDownloading ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Download className="size-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDocument(existingDoc.id)}
                                disabled={isLoading}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-destructive">Manquant</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Formulaire d'upload pour les documents manquants */}
                      {!hasDocument && (
                        <div className="mt-2 pt-2 border-t border-destructive/20">
                          <FileUpload
                            label=""
                            value={fileForKind || null}
                            onChange={(file: File | null) => {
                              setUploadingFiles((prev) => ({ ...prev, [`${kind}-entreprise`]: file }));
                              if (file) {
                                // L'upload se fait automatiquement via FileUpload
                                setTimeout(() => refreshDocuments(), 1000);
                              }
                            }}
                            accept="application/pdf,image/*"
                            disabled={isUploading}
                            documentKind={kind}
                            documentEntrepriseId={client.entreprise?.id}
                            onUploadComplete={() => {
                              setUploadingFiles((prev) => ({ ...prev, [`${kind}-entreprise`]: null }));
                              refreshDocuments();
                              // Ne pas rafraîchir la page pour éviter d'interrompre les autres uploads en cours
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Documents requis selon le profil pour entreprise */}
          {profilRequiredDocuments.length > 0 && (
            <div className="space-y-2">
              <Label>Documents requis selon le profil</Label>
              <div className="space-y-1.5">
                {profilRequiredDocuments.map((kind) => {
                  const hasDocument = allDocuments.some((doc: any) => doc.kind === kind);
                  const existingDoc = allDocuments.find((doc: any) => doc.kind === kind);
                  const isUploading = uploadingDocumentKind === kind && isUploadingDocument;
                  const fileForKind = uploadingFiles[`${kind}-profil-entreprise`];
                  
                  return (
                    <div
                      key={kind}
                      className={`p-3 border rounded-md transition-colors ${
                        hasDocument
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className={`size-4 shrink-0 ${hasDocument ? "text-muted-foreground" : "text-destructive"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${hasDocument ? "" : "text-destructive"}`}>
                              {documentKindLabels[kind] || kind}
                              {!hasDocument && <span className="text-destructive ml-1">*</span>}
                            </p>
                            {existingDoc?.label && (
                              <p className="text-xs text-muted-foreground truncate">
                                {existingDoc.label}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {existingDoc ? (
                            <>
                              <DocumentViewer
                                document={existingDoc}
                                documentKindLabels={documentKindLabels}
                              >
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="size-4" />
                                </Button>
                              </DocumentViewer>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => downloadFile(existingDoc.fileKey, existingDoc.label || `document-${existingDoc.id}`)}
                                disabled={isDownloading}
                              >
                                {isDownloading ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Download className="size-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDocument(existingDoc.id)}
                                disabled={isLoading}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-destructive">Manquant</span>
                          )}
                        </div>
                      </div>
                      
                      {!hasDocument && (
                        <div className="mt-2 pt-2 border-t border-destructive/20">
                          <FileUpload
                            label=""
                            value={fileForKind || null}
                            onChange={(file: File | null) => {
                              setUploadingFiles((prev) => ({ ...prev, [`${kind}-profil-entreprise`]: file }));
                              if (file) {
                                // L'upload se fait automatiquement via FileUpload
                                setTimeout(() => refreshDocuments(), 1000);
                              }
                            }}
                            accept="application/pdf,image/*"
                            disabled={isUploading}
                            documentKind={kind}
                            documentEntrepriseId={client.entreprise?.id}
                            onUploadComplete={() => {
                              setUploadingFiles((prev) => ({ ...prev, [`${kind}-profil-entreprise`]: null }));
                              refreshDocuments();
                              // Ne pas rafraîchir la page pour éviter d'interrompre les autres uploads en cours
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Autres documents de l'entreprise (non requis) */}
          {entrepriseDocuments.filter((doc: any) => !entrepriseRequiredDocuments.includes(doc.kind as any) && !profilRequiredDocuments.includes(doc.kind as any)).length > 0 && (
            <div className="space-y-2">
              <Label>Autres documents</Label>
              <div className="space-y-1.5">
                {entrepriseDocuments
                  .filter((doc: any) => !entrepriseRequiredDocuments.includes(doc.kind as any) && !profilRequiredDocuments.includes(doc.kind as any))
                  .map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {documentKindLabels[doc.kind] || doc.kind}
                          </p>
                          {doc.label && (
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.label}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <DocumentViewer
                          document={doc}
                          documentKindLabels={documentKindLabels}
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="size-4" />
                          </Button>
                        </DocumentViewer>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => downloadFile(doc.fileKey, doc.label || `document-${doc.id}`)}
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}


