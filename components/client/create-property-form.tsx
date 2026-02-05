"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { FileUpload } from "@/components/ui/file-upload";
import { createProperty } from "@/lib/actions/properties";
import { getDocuments } from "@/lib/actions/documents";
import {
  Loader2,
  ArrowLeft,
  Home,
  MapPin,
  Ruler,
  Building2,
  Scale,
  Bed,
  Square,
  ChefHat,
  Microwave,
  Refrigerator,
  Snowflake,
  UtensilsCrossed,
  Table,
  Armchair,
  Layers,
  Lightbulb,
  Sparkles,
  InfoIcon,
  CheckCircle2,
  FileText,
  File,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { BienType, BienLegalStatus, DocumentKind } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPropertySchema } from "@/lib/zod/property";
import { deleteDocument } from "@/lib/actions/documents";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Type pour le formulaire - correspond au schéma d'entrée avec valeurs par défaut appliquées
type CreatePropertyFormData = {
  label?: string;
  fullAddress: string;
  surfaceM2?: string;
  type?: BienType;
  legalStatus?: BienLegalStatus;
  status?: "PROSPECT" | "IN_PROGRESS" | "ACTIVE" | "ARCHIVED";
  ownerId: string;
  hasLiterie: boolean;
  hasRideaux: boolean;
  hasPlaquesCuisson: boolean;
  hasFour: boolean;
  hasRefrigerateur: boolean;
  hasCongelateur: boolean;
  hasVaisselle: boolean;
  hasUstensilesCuisine: boolean;
  hasTable: boolean;
  hasSieges: boolean;
  hasEtageresRangement: boolean;
  hasLuminaires: boolean;
  hasMaterielEntretien: boolean;
};

// Liste des champs de mobilier avec icônes
const FURNITURE_FIELDS = [
  { key: "hasLiterie", label: "Literie avec couette ou couverture", icon: Bed },
  { key: "hasRideaux", label: "Volets ou rideaux dans les chambres", icon: Square },
  { key: "hasPlaquesCuisson", label: "Plaques de cuisson", icon: ChefHat },
  { key: "hasFour", label: "Four ou four à micro-onde", icon: Microwave },
  { key: "hasRefrigerateur", label: "Réfrigérateur", icon: Refrigerator },
  { key: "hasCongelateur", label: "Congélateur ou compartiment à congélation (-6° max)", icon: Snowflake },
  { key: "hasVaisselle", label: "Vaisselle en nombre suffisant", icon: UtensilsCrossed },
  { key: "hasUstensilesCuisine", label: "Ustensiles de cuisine", icon: UtensilsCrossed },
  { key: "hasTable", label: "Table", icon: Table },
  { key: "hasSieges", label: "Sièges", icon: Armchair },
  { key: "hasEtageresRangement", label: "Étagères de rangement", icon: Layers },
  { key: "hasLuminaires", label: "Luminaires", icon: Lightbulb },
  { key: "hasMaterielEntretien", label: "Matériel d'entretien ménager adapté", icon: Sparkles },
] as const;

// Fonction pour vérifier si tout le mobilier est présent
const hasAllFurniture = (values: Record<string, unknown>): boolean => {
  return FURNITURE_FIELDS.every(({ key }) => values[key] === true);
};

export interface CreatePropertyFormRef {
  submit: () => void;
  isLoading: boolean;
}

interface CreatePropertyFormProps {
  ownerId: string;
  onPropertyCreated?: (property: any) => void;
  hideActions?: boolean;
  renderActions?: (props: { onSubmit: () => void; isLoading: boolean }) => React.ReactNode;
  onLoadingChange?: (isLoading: boolean) => void;
}

// Composant pour afficher un document uploadé pour une propriété
function PropertyDocumentUploaded({ 
  propertyId, 
  documentKind, 
  children 
}: { 
  propertyId: string | null; 
  documentKind: DocumentKind; 
  children: React.ReactNode;
}) {
  const [document, setDocument] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!propertyId) {
      setDocument(null);
      return;
    }

    const loadDocument = async () => {
      setLoading(true);
      try {
        const docs = await getDocuments({ propertyId });
        const foundDoc = docs.find((d: any) => d.kind === documentKind);
        setDocument(foundDoc || null);
      } catch (error) {
        console.error("Erreur lors du chargement du document:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    // Écouter les événements de rechargement
    const handleRefresh = () => {
      loadDocument();
    };
    window.addEventListener(`document-uploaded-property-${propertyId}`, handleRefresh);
    
    return () => {
      window.removeEventListener(`document-uploaded-property-${propertyId}`, handleRefresh);
    };
  }, [propertyId, documentKind]);

  const handleViewDocument = async (doc: any) => {
    setSelectedDocument(doc);
    setIsViewerOpen(true);
    setIsLoadingSignedUrl(true);
    
    try {
      const response = await fetch("/api/blob/get-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: doc.fileKey }),
      });
      if (response.ok) {
        const { signedUrl } = await response.json();
        setSignedUrl(signedUrl);
      } else {
        setSignedUrl(doc.fileKey);
      }
    } catch (error) {
      setSignedUrl(doc.fileKey);
    } finally {
      setIsLoadingSignedUrl(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    setIsDeleting(true);
    try {
      await deleteDocument(document.id);
      toast.success("Document supprimé avec succès");
      setDocument(null);
      window.dispatchEvent(new CustomEvent(`document-uploaded-property-${propertyId}`));
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="space-y-2">{children}</div>;
  }

  if (!document) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="p-3 border rounded-md bg-muted/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <File className="size-4" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{document.label || documentKind}</p>
              <p className="text-xs text-muted-foreground">
                {document.size ? `${(document.size / 1024).toFixed(2)} KB` : ""}
                {document.createdAt && ` • ${new Date(document.createdAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleViewDocument(document)}
              disabled={isDeleting}
            >
              <Eye className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.label || "Aperçu du document"}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {isLoadingSignedUrl ? (
              <div className="flex items-center justify-center h-[70vh]">
                <Loader2 className="size-8 animate-spin" />
              </div>
            ) : selectedDocument?.mimeType?.includes("pdf") ? (
              <iframe
                src={signedUrl || selectedDocument.fileKey}
                className="w-full h-[70vh] border rounded"
                title={selectedDocument.label}
              />
            ) : selectedDocument?.mimeType?.includes("image") ? (
              <img
                src={signedUrl || selectedDocument.fileKey}
                alt={selectedDocument.label}
                className="max-w-full max-h-[70vh] mx-auto object-contain"
              />
            ) : (
              <div className="text-center py-8">
                <File className="size-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aperçu non disponible</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const CreatePropertyForm = forwardRef<CreatePropertyFormRef, CreatePropertyFormProps>(
  ({ ownerId, onPropertyCreated, hideActions = false, renderActions, onLoadingChange }, ref) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  
  // Ref pour stocker le callback et éviter les boucles infinies
  const onLoadingChangeRef = useRef(onLoadingChange);
  
  // Mettre à jour la ref quand le callback change
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
  }, [onLoadingChange]);
  
  // Refs pour les fichiers de documents
  const diagnosticsRef = useRef<HTMLInputElement>(null);
  const titleDeedRef = useRef<HTMLInputElement>(null);
  const reglementCoproprieteRef = useRef<HTMLInputElement>(null);
  const cahierChargeLotissementRef = useRef<HTMLInputElement>(null);
  const statutAssociationSyndicaleRef = useRef<HTMLInputElement>(null);

  // États pour les fichiers de documents
  const [diagnosticsFile, setDiagnosticsFile] = useState<File | null>(null);
  const [titleDeedFile, setTitleDeedFile] = useState<File | null>(null);
  const [reglementCoproprieteFile, setReglementCoproprieteFile] = useState<File | null>(null);
  const [cahierChargeLotissementFile, setCahierChargeLotissementFile] = useState<File | null>(null);
  const [statutAssociationSyndicaleFile, setStatutAssociationSyndicaleFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreatePropertyFormData>({
    resolver: zodResolver(createPropertySchema) as any,
    defaultValues: {
      ownerId,
      fullAddress: "",
      label: undefined,
      surfaceM2: undefined,
      type: undefined,
      legalStatus: undefined,
      status: undefined,
      hasLiterie: false,
      hasRideaux: false,
      hasPlaquesCuisson: false,
      hasFour: false,
      hasRefrigerateur: false,
      hasCongelateur: false,
      hasVaisselle: false,
      hasUstensilesCuisine: false,
      hasTable: false,
      hasSieges: false,
      hasEtageresRangement: false,
      hasLuminaires: false,
      hasMaterielEntretien: false,
    },
  });

  const type = watch("type" as any);
  const legalStatus = watch("legalStatus" as any);
  const furnitureValues = watch([
    "hasLiterie",
    "hasRideaux",
    "hasPlaquesCuisson",
    "hasFour",
    "hasRefrigerateur",
    "hasCongelateur",
    "hasVaisselle",
    "hasUstensilesCuisine",
    "hasTable",
    "hasSieges",
    "hasEtageresRangement",
    "hasLuminaires",
    "hasMaterielEntretien",
  ]);

  const allFurniturePresent = hasAllFurniture(
    Object.fromEntries(
      FURNITURE_FIELDS.map(({ key }, index) => [key, furnitureValues[index]])
    )
  );

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const property = await createProperty(data);
      setCreatedPropertyId(property.id);
      toast.success("Bien créé avec succès");
      
      // Si onPropertyCreated est fourni, l'appeler au lieu de rediriger
      if (onPropertyCreated) {
        onPropertyCreated(property);
      } else {
      router.push("/client/proprietaire/biens");
      router.refresh();
      }
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de créer le bien",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = handleSubmit(onSubmit);

  useImperativeHandle(ref, () => ({
    submit: handleFormSubmit,
    isLoading,
  }));

  // Mettre à jour le callback de chargement seulement quand isLoading change
  useEffect(() => {
    if (onLoadingChangeRef.current) {
      onLoadingChangeRef.current(isLoading);
    }
  }, [isLoading]);

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <CardTitle>Informations générales</CardTitle>
          </div>
        <CardDescription>
            Remplissez les informations principales de votre bien immobilier
        </CardDescription>
      </CardHeader>
      <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section Informations principales */}
            <div className="space-y-4">
          <div className="space-y-2">
                <Label htmlFor="fullAddress" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Adresse complète *
                </Label>
            <Input
              id="fullAddress"
                  {...register("fullAddress" as any)}
              disabled={isLoading}
              placeholder="123 Rue Example, 75001 Paris"
                  className="w-full"
            />
                {(errors as any).fullAddress && (
                  <p className="text-sm text-destructive">{(errors as any).fullAddress.message}</p>
            )}
          </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
                  <Label htmlFor="label" className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    Libellé (optionnel)
                  </Label>
            <Input
              id="label"
                    {...register("label" as any)}
              disabled={isLoading}
              placeholder="Ex: Appartement T2"
            />
                  {(errors as any).label && (
                    <p className="text-sm text-destructive">{(errors as any).label.message}</p>
            )}
          </div>

          <div className="space-y-2">
                  <Label htmlFor="surfaceM2" className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    Surface (m²)
                  </Label>
            <Input
              id="surfaceM2"
              type="number"
                    step="0.01"
                    min="0"
                    {...register("surfaceM2" as any)}
              disabled={isLoading}
              placeholder="50"
            />
                  {(errors as any).surfaceM2 && (
                    <p className="text-sm text-destructive">{(errors as any).surfaceM2.message}</p>
            )}
                </div>
          </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
                  <Label htmlFor="type" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Type de bien *
                  </Label>
            <Select
                    value={type as string}
                    onValueChange={(value) => setValue("type" as any, value as BienType)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BienType.APPARTEMENT}>Appartement</SelectItem>
                <SelectItem value={BienType.MAISON}>Maison</SelectItem>
              </SelectContent>
            </Select>
                  {(errors as any).type && (
                    <p className="text-sm text-destructive">{(errors as any).type.message}</p>
            )}
          </div>

          <div className="space-y-2">
                  <Label htmlFor="legalStatus" className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    Statut juridique *
                  </Label>
            <Select
                    value={legalStatus as string}
                    onValueChange={(value) => setValue("legalStatus" as any, value as BienLegalStatus)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BienLegalStatus.PLEIN_PROPRIETE}>Plein propriété</SelectItem>
                <SelectItem value={BienLegalStatus.CO_PROPRIETE}>Co-propriété</SelectItem>
                <SelectItem value={BienLegalStatus.LOTISSEMENT}>Lotissement</SelectItem>
              </SelectContent>
            </Select>
                  {(errors as any).legalStatus && (
                    <p className="text-sm text-destructive">{(errors as any).legalStatus.message}</p>
            )}
          </div>
              </div>
            </div>

            <Separator />

            {/* Section Mobilier */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Mobilier et équipements</h3>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Cochez les équipements présents dans le bien. Pour louer en meublé, tous les équipements doivent être présents.
              </p>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 ">
                {FURNITURE_FIELDS.map(({ key, label, icon: Icon }) => (
                  <Controller
                    key={key}
                    name={key as any}
                    control={control}
                    render={({ field }) => (
                      <Label
                        htmlFor={key}
                        className="text-sm font-normal cursor-pointer flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <Checkbox
                          id={key}
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                        <span className="flex-1">{label}</span>
                      </Label>
                    )}
                  />
                ))}
              </div>

              {/* Indicateur de complétion pour bail meublé */}
              <div
                className={`p-4 rounded-lg border ${
                  allFurniturePresent
                    ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      allFurniturePresent ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        allFurniturePresent
                          ? "text-green-900 dark:text-green-100"
                          : "text-amber-900 dark:text-amber-100"
                      }`}
                    >
                      {allFurniturePresent
                        ? "Tous les équipements sont présents - Le bien peut être loué en meublé"
                        : "Certains équipements manquent - Le bien ne peut pas être loué en meublé"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section Documents */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Documents du bien</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Ajoutez les documents obligatoires pour votre bien. Certains documents sont requis selon le régime juridique.
              </p>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {/* Documents toujours requis */}
                <PropertyDocumentUploaded 
                  propertyId={createdPropertyId} 
                  documentKind={DocumentKind.DIAGNOSTICS}
                >
                  <FileUpload
                    label="Diagnostics *"
                    value={diagnosticsFile}
                    onChange={(file) => {
                      setDiagnosticsFile(file);
                      if (diagnosticsRef.current) {
                        const dt = new DataTransfer();
                        if (file) dt.items.add(file);
                        diagnosticsRef.current.files = dt.files;
                      }
                    }}
                    documentKind={DocumentKind.DIAGNOSTICS}
                    documentPropertyId={createdPropertyId || undefined}
                    documentClientId={ownerId}
                    onUploadStateChange={(uploading) => {
                      if (!uploading && createdPropertyId) {
                        window.dispatchEvent(new CustomEvent(`document-uploaded-property-${createdPropertyId}`));
                      }
                    }}
                  />
                </PropertyDocumentUploaded>

                <PropertyDocumentUploaded 
                  propertyId={createdPropertyId} 
                  documentKind={DocumentKind.TITLE_DEED}
                >
                  <FileUpload
                    label="Titre de propriété *"
                    value={titleDeedFile}
                    onChange={(file) => {
                      setTitleDeedFile(file);
                      if (titleDeedRef.current) {
                        const dt = new DataTransfer();
                        if (file) dt.items.add(file);
                        titleDeedRef.current.files = dt.files;
                      }
                    }}
                    documentKind={DocumentKind.TITLE_DEED}
                    documentPropertyId={createdPropertyId || undefined}
                    documentClientId={ownerId}
                    onUploadStateChange={(uploading) => {
                      if (!uploading && createdPropertyId) {
                        window.dispatchEvent(new CustomEvent(`document-uploaded-property-${createdPropertyId}`));
                      }
                    }}
                  />
                </PropertyDocumentUploaded>

                {/* Documents conditionnels - Copropriété */}
                {legalStatus === BienLegalStatus.CO_PROPRIETE && (
                  <PropertyDocumentUploaded 
                    propertyId={createdPropertyId} 
                    documentKind={DocumentKind.REGLEMENT_COPROPRIETE}
                  >
                    <FileUpload
                      label="Règlement de copropriété *"
                      value={reglementCoproprieteFile}
                      onChange={(file) => {
                        setReglementCoproprieteFile(file);
                        if (reglementCoproprieteRef.current) {
                          const dt = new DataTransfer();
                          if (file) dt.items.add(file);
                          reglementCoproprieteRef.current.files = dt.files;
                        }
                      }}
                      documentKind={DocumentKind.REGLEMENT_COPROPRIETE}
                      documentPropertyId={createdPropertyId || undefined}
                      documentClientId={ownerId}
                      onUploadStateChange={(uploading) => {
                        if (!uploading && createdPropertyId) {
                          window.dispatchEvent(new CustomEvent(`document-uploaded-property-${createdPropertyId}`));
                        }
                      }}
                    />
                  </PropertyDocumentUploaded>
                )}

                {/* Documents conditionnels - Lotissement */}
                {legalStatus === BienLegalStatus.LOTISSEMENT && (
                  <>
                    <PropertyDocumentUploaded 
                      propertyId={createdPropertyId} 
                      documentKind={DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT}
                    >
                      <FileUpload
                        label="Cahier des charges lotissement *"
                        value={cahierChargeLotissementFile}
                        onChange={(file) => {
                          setCahierChargeLotissementFile(file);
                          if (cahierChargeLotissementRef.current) {
                            const dt = new DataTransfer();
                            if (file) dt.items.add(file);
                            cahierChargeLotissementRef.current.files = dt.files;
                          }
                        }}
                        documentKind={DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT}
                        documentPropertyId={createdPropertyId || undefined}
                        documentClientId={ownerId}
                        onUploadStateChange={(uploading) => {
                          if (!uploading && createdPropertyId) {
                            window.dispatchEvent(new CustomEvent(`document-uploaded-property-${createdPropertyId}`));
                          }
                        }}
                      />
                    </PropertyDocumentUploaded>

                    <PropertyDocumentUploaded 
                      propertyId={createdPropertyId} 
                      documentKind={DocumentKind.STATUT_DE_LASSOCIATION_SYNDICALE}
                    >
                      <FileUpload
                        label="Statut de l'association syndicale *"
                        value={statutAssociationSyndicaleFile}
                        onChange={(file) => {
                          setStatutAssociationSyndicaleFile(file);
                          if (statutAssociationSyndicaleRef.current) {
                            const dt = new DataTransfer();
                            if (file) dt.items.add(file);
                            statutAssociationSyndicaleRef.current.files = dt.files;
                          }
                        }}
                        documentKind={DocumentKind.STATUT_DE_LASSOCIATION_SYNDICALE}
                        documentPropertyId={createdPropertyId || undefined}
                        documentClientId={ownerId}
                        onUploadStateChange={(uploading) => {
                          if (!uploading && createdPropertyId) {
                            window.dispatchEvent(new CustomEvent(`document-uploaded-property-${createdPropertyId}`));
                          }
                        }}
                      />
                    </PropertyDocumentUploaded>
                  </>
                )}
              </div>
              {!createdPropertyId && (
                <p className="text-xs text-muted-foreground italic">
                  Les documents pourront être ajoutés après la création du bien.
                </p>
              )}
            </div>

            {!hideActions && (
              <>
                <Separator />

                {/* Boutons d'action */}
                <div className="flex gap-2 justify-end">
                  <Link href="/client/proprietaire/biens">
                    <Button type="button" variant="outline" disabled={isLoading}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Annuler
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Créer le bien
                        </>
                    )}
                  </Button>
                </div>
              </>
            )}
            
            {renderActions && renderActions({ onSubmit: handleFormSubmit, isLoading })}
        </form>
      </CardContent>
    </Card>
    </div>
  );
  }
);

CreatePropertyForm.displayName = "CreatePropertyForm";



