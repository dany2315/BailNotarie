"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createFullClientWithPropertySchema } from "@/lib/zod/client";
import { ClientType, FamilyStatus, MatrimonialRegime, BailType, BailFamille, PropertyStatus, BienType, BienLegalStatus } from "@prisma/client";
import { FileUpload } from "@/components/ui/file-upload";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { PhoneInput } from "@/components/ui/phone-input";

interface FullClientFormProps {
  onSubmit: (data: FormData) => Promise<void>;
}

export function FullClientForm({ onSubmit }: FullClientFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clientType, setClientType] = useState<ClientType>(ClientType.PERSONNE_PHYSIQUE);
  
  // Refs pour les fichiers
  const kbisRef = useRef<HTMLInputElement>(null);
  const statutesRef = useRef<HTMLInputElement>(null);
  const birthCertRef = useRef<HTMLInputElement>(null);
  const idIdentityRef = useRef<HTMLInputElement>(null);
  const livretDeFamilleRef = useRef<HTMLInputElement>(null);
  const contratDePacsRef = useRef<HTMLInputElement>(null);
  const diagnosticsRef = useRef<HTMLInputElement>(null);
  const reglementCoproprieteRef = useRef<HTMLInputElement>(null);
  const cahierChargeLotissementRef = useRef<HTMLInputElement>(null);
  const statutAssociationSyndicaleRef = useRef<HTMLInputElement>(null);
  const insuranceOwnerRef = useRef<HTMLInputElement>(null);
  const ribOwnerRef = useRef<HTMLInputElement>(null);

  const form = useForm<any>({
    resolver: zodResolver(createFullClientWithPropertySchema as any),
    defaultValues: {
      type: ClientType.PERSONNE_PHYSIQUE,
      profilType: "PROPRIETAIRE",
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
      legalName: "",
      registration: "",
      propertyLabel: "",
      propertyFullAddress: "",
      propertySurfaceM2: "",
      propertyLegalStatus: "",
      propertyStatus: PropertyStatus.NON_LOUER,
      bailType: BailType.BAIL_NU_3_ANS,
      bailFamily: BailFamille.HABITATION,
      bailRentAmount: "",
      bailMonthlyCharges: "0",
      bailSecurityDeposit: "0",
      bailEffectiveDate: "",
      bailEndDate: "",
      bailPaymentDay: "",
      tenantEmail: "",
    },
  });

  // Observer le statut familial pour conditionner l'affichage du régime matrimonial
  const watchedFamilyStatus = form.watch("familyStatus");

  // Réinitialiser le régime matrimonial si le statut familial change et n'est plus MARIE
  useEffect(() => {
    if (watchedFamilyStatus !== FamilyStatus.MARIE && form.getValues("matrimonialRegime")) {
      form.setValue("matrimonialRegime", undefined);
    }
  }, [watchedFamilyStatus, form]);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (value instanceof Date) {
            formData.append(key, value.toISOString().split('T')[0]);
          } else if (value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      // Ajouter les fichiers depuis les refs
      const fileRefs = [
        { ref: kbisRef, name: "kbis" },
        { ref: statutesRef, name: "statutes" },
        { ref: birthCertRef, name: "birthCert" },
        { ref: idIdentityRef, name: "idIdentity" },
        { ref: livretDeFamilleRef, name: "livretDeFamille" },
        { ref: contratDePacsRef, name: "contratDePacs" },
        { ref: diagnosticsRef, name: "diagnostics" },
        { ref: reglementCoproprieteRef, name: "reglementCopropriete" },
        { ref: cahierChargeLotissementRef, name: "cahierChargeLotissement" },
        { ref: statutAssociationSyndicaleRef, name: "statutAssociationSyndicale" },
        { ref: insuranceOwnerRef, name: "insuranceOwner" },
        { ref: ribOwnerRef, name: "ribOwner" },
      ];

      fileRefs.forEach(({ ref, name }) => {
        if (ref.current?.files && ref.current.files[0]) {
          formData.append(name, ref.current.files[0]);
        }
      });

      await onSubmit(formData);
      toast.success("Client créé avec succès");
      router.push("/interface/clients");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du client");
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
        <TabsList className="grid w-full grid-cols-2 border rounded-lg mb-6">
          <TabsTrigger value={ClientType.PERSONNE_PHYSIQUE}>Personne physique</TabsTrigger>
          <TabsTrigger value={ClientType.PERSONNE_MORALE}>Personne morale</TabsTrigger>
        </TabsList>

        {/* Informations client propriétaire */}
        <Card>
          <CardHeader>
            <CardTitle>Informations propriétaire</CardTitle>
            <CardDescription>
              Renseignez toutes les informations du client propriétaire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TabsContent value={ClientType.PERSONNE_PHYSIQUE} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input id="firstName" {...form.register("firstName")} disabled={isLoading} />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-destructive">{(form.formState.errors.firstName as any)?.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input id="lastName" {...form.register("lastName")} disabled={isLoading} />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-destructive">{(form.formState.errors.lastName as any)?.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profession">Profession</Label>
                <Input id="profession" {...form.register("profession")} disabled={isLoading} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="familyStatus">Situation familiale</Label>
                  <Controller
                    name="familyStatus"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange} disabled={isLoading}>
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
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="birthPlace">Lieu de naissance</Label>
                  <Input id="birthPlace" {...form.register("birthPlace")} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Date de naissance</Label>
                  <Input id="birthDate" type="date" {...form.register("birthDate")} disabled={isLoading} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value={ClientType.PERSONNE_MORALE} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="legalName">Raison sociale *</Label>
                <Input id="legalName" {...form.register("legalName")} disabled={isLoading} />
                {form.formState.errors.legalName && (
                  <p className="text-sm text-destructive">{(form.formState.errors.legalName as any)?.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration">SIREN/SIRET</Label>
                <Input id="registration" {...form.register("registration")} disabled={isLoading} />
              </div>
            </TabsContent>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...form.register("email")} disabled={isLoading} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{(form.formState.errors.email as any)?.message}</p>
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
                  <p className="text-sm text-destructive">{(form.formState.errors.phone as any)?.message}</p>
                )}
              </div>
              
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullAddress">Adresse complète</Label>
              <Textarea id="fullAddress" {...form.register("fullAddress")} disabled={isLoading} />
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

        {/* Informations du bien */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du bien</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyLabel">Libellé</Label>
              <Input id="propertyLabel" {...form.register("propertyLabel")} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyFullAddress">Adresse complète du bien *</Label>
              <Textarea id="propertyFullAddress" {...form.register("propertyFullAddress")} disabled={isLoading} />
              {form.formState.errors.propertyFullAddress && (
                <p className="text-sm text-destructive">{(form.formState.errors.propertyFullAddress as any)?.message}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="propertyType">Type de bien</Label>
                <Controller
                  name="propertyType"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange} disabled={isLoading}>
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
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertySurfaceM2">Surface (m²)</Label>
                <Input id="propertySurfaceM2" type="number" step="0.01" {...form.register("propertySurfaceM2")} disabled={isLoading} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="propertyLegalStatus">Statut légal</Label>
                <Controller
                  name="propertyLegalStatus"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange} disabled={isLoading}>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations du bail */}
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
                  <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
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
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bailRentAmount">Montant du loyer *</Label>
                <NumberInputGroup field={form.register("bailRentAmount")} min={0} unit="€" disabled={isLoading} />
                {form.formState.errors.bailRentAmount && (
                  <p className="text-sm text-destructive">{(form.formState.errors.bailRentAmount as any)?.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailEffectiveDate">Date de prise d'effet *</Label>
                <Input id="bailEffectiveDate" type="date" {...form.register("bailEffectiveDate")} disabled={isLoading} />
                {form.formState.errors.bailEffectiveDate && (
                  <p className="text-sm text-destructive">{(form.formState.errors.bailEffectiveDate as any)?.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bailEndDate">Date de fin</Label>
                <Input id="bailEndDate" type="date" {...form.register("bailEndDate")} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailPaymentDay">Jour de paiement</Label>
                <NumberInputGroup field={form.register("bailPaymentDay")} min={1} max={31} disabled={isLoading} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bailMonthlyCharges">Charges mensuelles</Label>
                <NumberInputGroup field={form.register("bailMonthlyCharges")} min={0} unit="€" disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailSecurityDeposit">Dépôt de garantie</Label>
                <NumberInputGroup field={form.register("bailSecurityDeposit")} min={0} unit="€" disabled={isLoading} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations du locataire */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du locataire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantEmail">Email du locataire</Label>
              <Input id="tenantEmail" type="email" {...form.register("tenantEmail")} disabled={isLoading} />
              {form.formState.errors.tenantEmail && (
                <p className="text-sm text-destructive">{(form.formState.errors.tenantEmail as any)?.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Si fourni, un email sera envoyé au locataire pour qu'il complète ses informations.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer le client complet"
            )}
          </Button>
        </div>
      </Tabs>
    </form>
  );
}
