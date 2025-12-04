"use client";

import { useState, useEffect } from "react";
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
import { getRequiredClientFields } from "@/lib/utils/completion-status";

interface EditClientFormProps {
  client: any;
}

const documentKindLabels: Record<string, string> = {
  KBIS: "KBIS",
  STATUTES: "Statuts",
  INSURANCE: "Assurance",
  TITLE_DEED: "Titre de propriété",
  BIRTH_CERT: "Acte de naissance",
  ID_IDENTITY: "Pièce d'identité",
  LIVRET_DE_FAMILLE: "Livret de famille",
  CONTRAT_DE_PACS: "Contrat de PACS",
  DIAGNOSTICS: "Diagnostics",
  REGLEMENT_COPROPRIETE: "Règlement de copropriété",
  CAHIER_DE_CHARGE_LOTISSEMENT: "Cahier des charges lotissement",
  STATUT_DE_LASSOCIATION_SYNDICALE: "Statut de l'association syndicale",
  RIB: "RIB",
};

export function EditClientForm({ client }: EditClientFormProps) {
  const router = useRouter();
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
  
  // Collecter tous les documents depuis persons et entreprise
  const allDocuments = [
    ...(client.persons?.flatMap((p: any) => p.documents || []) || []),
    ...(client.entreprise?.documents || []),
  ];
  
  const [documents, setDocuments] = useState<any[]>(allDocuments);
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
      // Données depuis Entreprise pour PERSONNE_MORALE
      legalName: entreprise?.legalName || "",
      registration: entreprise?.registration || "",
      name: entreprise?.name || entreprise?.legalName || "", // name est requis dans le schéma
      phone: entreprise?.phone || "",
      email: entreprise?.email || "",
      fullAddress: entreprise?.fullAddress || "",
    },
  });

  // Gérer le tableau de personnes
  const { fields: personFields, append: appendPerson, remove: removePerson } = useFieldArray({
    control: form.control,
    name: "persons",
  });

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
  const requiredDocuments = getRequiredClientFields(
    watchedType,
    watchedProfilType,
    watchedFamilyStatus,
    watchedMatrimonialRegime
  ).requiredDocuments;

  // Fonction pour déterminer quels documents doivent être affichés (uniquement pour l'affichage, ne bloque pas la soumission)
  const hasRequiredDocument = (kind: DocumentKind) => {
    return documents.some((doc) => doc.kind === kind);
  };

  const refreshDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      // Recharger la page pour obtenir les documents à jour
      router.refresh();
      // Les documents seront mis à jour via le re-render du composant
    } catch (error) {
      console.error("Erreur lors du chargement des documents:", error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  useEffect(() => {
    refreshDocuments();
  }, []);

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
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const handleUploadDocument = async (kind: DocumentKind) => {
    const file = uploadingFiles[kind];
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setIsUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      // Déterminer si on doit utiliser personId ou entrepriseId
      if (client.type === ClientType.PERSONNE_PHYSIQUE) {
        // Utiliser la personne primaire pour l'upload de documents
        const primaryPersonIndex = personFields.findIndex((_, i) => form.watch(`persons.${i}.isPrimary`));
        if (primaryPersonIndex >= 0) {
          const primaryPersonId = form.watch(`persons.${primaryPersonIndex}.id`) || 
            client.persons?.find((p: any) => p.isPrimary)?.id || 
            client.persons?.[0]?.id;
          if (primaryPersonId) {
            formData.append("personId", primaryPersonId);
          }
        }
      } else {
        if (client.entreprise) {
          formData.append("entrepriseId", client.entreprise.id);
        }
      }

      const response = await fetch("/api/clients/upload-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'upload");
      }

      toast.success("Document ajouté avec succès");
      setUploadingFiles((prev) => ({ ...prev, [kind]: null }));
      setUploadingDocumentKind(null);
      await refreshDocuments();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setIsUploadingDocument(false);
    }
  };

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
          <TabsTrigger value={ClientType.PERSONNE_PHYSIQUE} disabled={isLoading}>Personne physique</TabsTrigger>
          <TabsTrigger value={ClientType.PERSONNE_MORALE} disabled={isLoading}>Personne morale</TabsTrigger>
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
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Personnes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendPerson({
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
                    })}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une personne
                  </Button>
                </div>

                {personFields.map((field, index) => {
                  const watchedFamilyStatus = form.watch(`persons.${index}.familyStatus`);
                  const isPrimary = form.watch(`persons.${index}.isPrimary`);
                  
                  return (
                    <Card key={field.id} className="relative">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {isPrimary ? (
                              <Badge variant="default">Personne principale</Badge>
                            ) : (
                              <span>Personne {index + 1}</span>
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
                                      // Si on coche cette personne comme primaire, décocher les autres
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
                                  // Si on supprime la personne primaire, marquer la première comme primaire
                                  if (isPrimary && personFields.length > 1) {
                                    const nextIndex = index === 0 ? 1 : 0;
                                    form.setValue(`persons.${nextIndex}.isPrimary`, true);
                                  }
                                  removePerson(index);
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
                            {form.formState.errors.persons?.[index]?.firstName && (
                              <p className="text-sm text-destructive">
                                {form.formState.errors.persons[index]?.firstName?.message as string}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`persons.${index}.lastName`}>Nom</Label>
                            <Input
                              {...form.register(`persons.${index}.lastName`)}
                              placeholder="Nom"
                              disabled={isLoading}
                            />
                            {form.formState.errors.persons?.[index]?.lastName && (
                              <p className="text-sm text-destructive">
                                {form.formState.errors.persons[index]?.lastName?.message as string}
                              </p>
                            )}
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
                            {form.formState.errors.persons?.[index]?.email && (
                              <p className="text-sm text-destructive">
                                {form.formState.errors.persons[index]?.email?.message as string}
                              </p>
                            )}
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
                      </CardContent>
                    </Card>
                  );
                })}
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

      {/* Section Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({documents.length})
          </CardTitle>
          <CardDescription>
            Gérer les documents du client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Documents requis */}
          {requiredDocuments.length > 0 && (
            <div className="space-y-2">
              <Label>Documents requis</Label>
              <div className="space-y-1.5">
                {requiredDocuments.map((kind) => {
                  const hasDocument = hasRequiredDocument(kind);
                  const existingDoc = documents.find((doc) => doc.kind === kind);
                  const isUploading = uploadingDocumentKind === kind && isUploadingDocument;
                  const fileForKind = uploadingFiles[kind];
                  
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
                          <FileText className={`size-4 flex-shrink-0 ${hasDocument ? "text-muted-foreground" : "text-destructive"}`} />
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
                                asChild
                              >
                                <a href={existingDoc.fileKey} download target="_blank" rel="noopener noreferrer">
                                  <Download className="size-4" />
                                </a>
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
                          <div className="space-y-2">
                            <FileUpload
                              label=""
                              value={fileForKind || null}
                              onChange={(file: File | null) => {
                                setUploadingFiles((prev) => ({ ...prev, [kind]: file }));
                              }}
                              accept="application/pdf,image/*"
                              disabled={isUploading}
                            />
                            {fileForKind && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setUploadingDocumentKind(kind);
                                  handleUploadDocument(kind);
                                }}
                                disabled={isUploading}
                                className="w-full flex items-center justify-center gap-2"
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Upload en cours...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="size-4" />
                                    Ajouter le document
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Autres documents existants (non requis) */}
          {documents.filter((doc) => !requiredDocuments.includes(doc.kind as DocumentKind)).length > 0 && (
            <div className="space-y-2">
              <Label>Autres documents</Label>
              <div className="space-y-1.5">
                {documents
                  .filter((doc) => !requiredDocuments.includes(doc.kind as DocumentKind))
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="size-4 text-muted-foreground flex-shrink-0" />
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
                          asChild
                        >
                          <a href={doc.fileKey} download target="_blank" rel="noopener noreferrer">
                            <Download className="size-4" />
                          </a>
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


