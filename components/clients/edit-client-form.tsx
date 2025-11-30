"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, FileText, Trash2, Upload, Eye, Download } from "lucide-react";
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
  const [documents, setDocuments] = useState<any[]>(client.documents || []);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [uploadingDocumentKind, setUploadingDocumentKind] = useState<DocumentKind | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, File | null>>({});
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(updateClientSchema) as any,
    defaultValues: {
      id: client.id,
      type: client.type,
      profilType: client.profilType,
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      profession: client.profession || "",
      legalName: client.legalName || "",
      registration: client.registration || "",
      phone: client.phone || "",
      email: client.email || "",
      fullAddress: client.fullAddress || "",
      nationality: client.nationality || "",
      familyStatus: client.familyStatus || undefined,
      matrimonialRegime: client.matrimonialRegime || undefined,
      birthPlace: client.birthPlace || "",
      birthDate: client.birthDate ? new Date(client.birthDate).toISOString().split("T")[0] : "",
    },
  });

  // Observer les valeurs du formulaire pour calculer les documents requis
  const watchedType = form.watch("type") || clientType;
  const watchedProfilType = form.watch("profilType") || client.profilType;
  const watchedFamilyStatus = form.watch("familyStatus");
  const watchedMatrimonialRegime = form.watch("matrimonialRegime");
  
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
      const docs = await getDocuments({ clientId: client.id });
      setDocuments(docs);
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
    if (watchedFamilyStatus !== FamilyStatus.MARIE && watchedMatrimonialRegime) {
      form.setValue("matrimonialRegime", undefined);
    }
  }, [watchedFamilyStatus, watchedMatrimonialRegime]);

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
      formData.append("clientId", client.id);

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
            <div className="space-y-2">
              <Label htmlFor="profilType">Profil *</Label>
              <Controller
                name="profilType"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le profil" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ProfilType).map((profil) => (
                        <SelectItem key={profil} value={profil}>
                          {profil.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {clientType === ClientType.PERSONNE_PHYSIQUE ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="Prénom"
                      disabled={isLoading}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.firstName.message as string}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Nom"
                      disabled={isLoading}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.lastName.message as string}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    {...form.register("profession")}
                    placeholder="Profession"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="familyStatus">Statut familial</Label>
                    <Controller
                      name="familyStatus"
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
                      <Label htmlFor="matrimonialRegime">Régime matrimonial</Label>
                      <Controller
                        name="matrimonialRegime"
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
                    <Label htmlFor="birthPlace">Lieu de naissance</Label>
                    <Input
                      id="birthPlace"
                      {...form.register("birthPlace")}
                      placeholder="Lieu de naissance"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Date de naissance</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      {...form.register("birthDate")}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
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
                  <Label htmlFor="registration">Numéro d'enregistrement (SIREN/SIRET)</Label>
                  <Input
                    id="registration"
                    {...form.register("registration")}
                    placeholder="Numéro d'enregistrement"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="nationality">Nationalité</Label>
              <Controller
                name="nationality"
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


