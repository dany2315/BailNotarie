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
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { AddressData } from "@/lib/types/address";
import { DocumentStackList } from "@/components/documents/document-stack-list";
// Type pour le formulaire - correspond au schéma d'entrée avec valeurs par défaut appliquées
type CreatePropertyFormData = {
  label?: string;
  fullAddress: string;
  surfaceM2?: string;
  type?: BienType;
  legalStatus?: BienLegalStatus;
  status?: "PROSPECT" | "IN_PROGRESS" | "ACTIVE" | "ARCHIVED";
  ownerId: string;
  // Données géographiques enrichies (optionnelles)
  housenumber?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  district?: string;
  inseeCode?: string;
  department?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
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
  onUploadingChange?: (isUploading: boolean) => void;
}

// Bloc document bien : même rendu que formulaire intake / interface client.
// Label → FileUpload (compact si documents existent) → DocumentStackList.
function PropertyDocumentUploaded({
  propertyId,
  documentKind,
  label,
  ownerId,
  onUploadStateChange,
  required = false,
  disabled = false,
}: {
  propertyId: string | null;
  documentKind: DocumentKind;
  label: string;
  ownerId: string;
  onUploadStateChange?: (uploading: boolean, propertyId?: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      try {
        if (propertyId) {
          const docs = await getDocuments({ propertyId });
          setDocuments(
            docs
              .filter((d: any) => d.kind === documentKind)
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
          );
        } else if (ownerId) {
          // Bien pas encore créé : documents rattachés au client (owner)
          const docs = await getDocuments({ clientId: ownerId });
          setDocuments(
            docs
              .filter(
                (d: any) =>
                  d.kind === documentKind &&
                  (d.propertyId === null || d.propertyId === undefined)
              )
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
          );
        } else {
          setDocuments([]);
        }
      } catch (loadError) {
        console.error("Erreur lors du chargement des documents:", loadError);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();

    const handleRefresh = () => loadDocuments();
    if (propertyId) {
      window.addEventListener(`document-uploaded-property-${propertyId}`, handleRefresh);
      return () =>
        window.removeEventListener(`document-uploaded-property-${propertyId}`, handleRefresh);
    }
    if (ownerId) {
      window.addEventListener(`document-uploaded-client-${ownerId}`, handleRefresh);
      return () =>
        window.removeEventListener(`document-uploaded-client-${ownerId}`, handleRefresh);
    }
  }, [propertyId, ownerId, documentKind]);

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      await deleteDocument(documentId);
      toast.success("Document supprimé avec succès");
      setDocuments((current) => current.filter((document) => document.id !== documentId));
      if (propertyId) {
        window.dispatchEvent(new CustomEvent(`document-uploaded-property-${propertyId}`));
      } else if (ownerId) {
        window.dispatchEvent(new CustomEvent(`document-uploaded-client-${ownerId}`));
      }
    } catch (deleteError: any) {
      toast.error(deleteError.message || "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const hasDocuments = documents.length > 0;

  return (
    <div className="min-w-0 w-full overflow-visible space-y-3">
      <div className="space-y-2 min-w-0 overflow-visible">
        <FileUpload
          label={label}
          multiple
          accept="application/pdf,image/*"
          disabled={disabled}
          required={required}
          documentKind={documentKind}
          documentPropertyId={propertyId || undefined}
          documentClientId={ownerId}
          compact={hasDocuments}
          onUploadComplete={() => {
            if (propertyId) {
              window.dispatchEvent(new CustomEvent(`document-uploaded-property-${propertyId}`));
            } else if (ownerId) {
              window.dispatchEvent(new CustomEvent(`document-uploaded-client-${ownerId}`));
            }
          }}
          onUploadStateChange={(uploading) => onUploadStateChange?.(uploading, propertyId || undefined)}
        />
      </div>
      <div className="min-w-0 overflow-visible">
        <DocumentStackList
          documents={documents}
          deletingId={deletingId}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

export const CreatePropertyForm = forwardRef<CreatePropertyFormRef, CreatePropertyFormProps>(
  ({ ownerId, onPropertyCreated, hideActions = false, renderActions, onLoadingChange, onUploadingChange }, ref) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  
  // Refs pour stocker les callbacks et éviter les boucles infinies
  const onLoadingChangeRef = useRef(onLoadingChange);
  const onPropertyCreatedRef = useRef(onPropertyCreated);
  const onUploadingChangeRef = useRef(onUploadingChange);
  
  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
    onPropertyCreatedRef.current = onPropertyCreated;
    onUploadingChangeRef.current = onUploadingChange;
  }, [onLoadingChange, onPropertyCreated, onUploadingChange]);
  
  // Fonction pour gérer les changements d'état d'upload
  const handleUploadStateChange = useCallback((uploading: boolean, propertyId?: string) => {
    setUploadingCount((prev) => {
      const newCount = uploading ? prev + 1 : Math.max(0, prev - 1);
      return newCount;
    });
    
    if (!uploading && propertyId) {
      window.dispatchEvent(new CustomEvent(`document-uploaded-property-${propertyId}`));
    }
  }, []);

  const isUploading = uploadingCount > 0;

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
      city: undefined,
      postalCode: undefined,
      inseeCode: undefined,
      department: undefined,
      region: undefined,
      latitude: undefined,
      longitude: undefined,
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

  const handleAddressSelect = (addressData: AddressData) => {
    console.log("📍 [CreatePropertyForm] Adresse sélectionnée:", addressData);
    setValue("fullAddress" as any, addressData.fullAddress);
    setValue("housenumber" as any, addressData.housenumber || "");
    setValue("street" as any, addressData.street || "");
    setValue("city" as any, addressData.city);
    setValue("postalCode" as any, addressData.postalCode);
    setValue("district" as any, addressData.district || "");
    setValue("inseeCode" as any, addressData.inseeCode);
    setValue("department" as any, addressData.department || "");
    setValue("region" as any, addressData.region || "");
    // Convertir en string pour le schéma Zod qui accepte string ou number
    setValue("latitude" as any, addressData.latitude?.toString() || "");
    setValue("longitude" as any, addressData.longitude?.toString() || "");
  };

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
      if (onPropertyCreatedRef.current) {
        onPropertyCreatedRef.current(property);
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
  }), [handleFormSubmit, isLoading]);

  // Mettre à jour le callback de chargement seulement quand isLoading change
  useEffect(() => {
    if (onLoadingChangeRef.current) {
      onLoadingChangeRef.current(isLoading);
    }
  }, [isLoading]);

  // Notifier le parent quand l'état d'upload change
  useEffect(() => {
    if (onUploadingChangeRef.current) {
      onUploadingChangeRef.current(isUploading);
    }
  }, [isUploading]);

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
            <AddressAutocomplete
              value={watch("fullAddress" as any) || ""}
              onAddressSelect={handleAddressSelect}
              onChange={(value: string) => setValue("fullAddress" as any, value)}
              disabled={isLoading}
              placeholder="Rechercher une adresse..."
              error={(errors as any).fullAddress?.message}
            />
                {(errors as any).fullAddress && (
                  <p className="text-sm text-destructive">{(errors as any).fullAddress.message}</p>
            )}
          </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Code postal *
                  </Label>
                  <Input
                    id="postalCode"
                    {...register("postalCode" as any)}
                    disabled={isLoading}
                    placeholder="75001"
                    value={watch("postalCode" as any) || ""}
                  />
                  {(errors as any).postalCode && (
                    <p className="text-sm text-destructive">{(errors as any).postalCode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Ville *
                  </Label>
                  <Input
                    id="city"
                    {...register("city" as any)}
                    disabled={isLoading}
                    placeholder="Paris"
                    value={watch("city" as any) || ""}
                  />
                  {(errors as any).city && (
                    <p className="text-sm text-destructive">{(errors as any).city.message}</p>
                  )}
                </div>
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
              <div className="grid gap-3 grid-cols-1  ">
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
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                {/* Documents toujours requis — même rendu que formulaire intake / interface client */}
                <div className="min-w-0 w-full overflow-visible">
                  <PropertyDocumentUploaded
                    propertyId={createdPropertyId}
                    documentKind={DocumentKind.DIAGNOSTICS}
                    label="Diagnostics *"
                    ownerId={ownerId}
                    onUploadStateChange={handleUploadStateChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="min-w-0 w-full overflow-visible">
                  <PropertyDocumentUploaded
                    propertyId={createdPropertyId}
                    documentKind={DocumentKind.TITLE_DEED}
                    label="Titre de propriété *"
                    ownerId={ownerId}
                    onUploadStateChange={handleUploadStateChange}
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Documents conditionnels - Copropriété */}
                {legalStatus === BienLegalStatus.CO_PROPRIETE && (
                  <div className="min-w-0 w-full overflow-visible">
                    <PropertyDocumentUploaded
                      propertyId={createdPropertyId}
                      documentKind={DocumentKind.REGLEMENT_COPROPRIETE}
                      label="Règlement de copropriété *"
                      ownerId={ownerId}
                      onUploadStateChange={handleUploadStateChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Documents conditionnels - Lotissement */}
                {legalStatus === BienLegalStatus.LOTISSEMENT && (
                  <>
                    <div className="min-w-0 w-full overflow-visible">
                      <PropertyDocumentUploaded
                        propertyId={createdPropertyId}
                        documentKind={DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT}
                        label="Cahier des charges lotissement *"
                        ownerId={ownerId}
                        onUploadStateChange={handleUploadStateChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="min-w-0 w-full overflow-visible">
                      <PropertyDocumentUploaded
                        propertyId={createdPropertyId}
                        documentKind={DocumentKind.STATUT_DE_LASSOCIATION_SYNDICALE}
                        label="Statut de l'association syndicale *"
                        ownerId={ownerId}
                        onUploadStateChange={handleUploadStateChange}
                        required
                        disabled={isLoading}
                      />
                    </div>
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
                  <Button type="submit" disabled={isLoading || isUploading}>
                    {isLoading || isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isUploading ? "Upload en cours..." : "Création..."}
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







