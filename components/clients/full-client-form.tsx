"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { createFullClientWithPropertySchema } from "@/lib/zod/client";
import { ClientType, FamilyStatus, MatrimonialRegime, BailType, BailFamille, PropertyStatus, BienType, BienLegalStatus } from "@prisma/client";
import { FileUpload } from "@/components/ui/file-upload";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { PhoneInput } from "@/components/ui/phone-input";

// Composant séparé pour la validation du dépôt de garantie (évite les re-renders)
const BailSecurityDepositValidation = ({ control }: { control: any }) => {
  const bailType = useWatch({ control, name: "bailType" });
  const rentAmount = useWatch({ control, name: "bailRentAmount" });
  const securityDeposit = useWatch({ control, name: "bailSecurityDeposit" });
  
  const isMeuble = bailType === BailType.BAIL_MEUBLE_1_ANS || bailType === BailType.BAIL_MEUBLE_9_MOIS;
  const rentAmountNum = typeof rentAmount === 'number' ? rentAmount : parseInt(String(rentAmount) || '0', 10);
  const securityDepositNum = typeof securityDeposit === 'number' ? securityDeposit : parseInt(String(securityDeposit) || '0', 10);
  const maxDeposit = isMeuble ? rentAmountNum * 2 : rentAmountNum;
  const isExceeded = rentAmountNum > 0 && securityDepositNum > maxDeposit;
  
  if (rentAmountNum <= 0) return null;
  
  return (
    <>
      <p className={`text-xs ${isExceeded ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        Maximum : {maxDeposit.toLocaleString('fr-FR')} € ({isMeuble ? '2' : '1'} mois de loyer)
      </p>
      {isExceeded && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          Dépasse le maximum légal
        </p>
      )}
    </>
  );
};

interface FullClientFormProps {
  onSubmit: (data: FormData) => Promise<void>;
}

// Valeurs par défaut du formulaire
const DEFAULT_FORM_VALUES = {
  type: ClientType.PERSONNE_PHYSIQUE,
  profilType: "PROPRIETAIRE" as const,
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
  additionalPersons: [] as any[],
};

// Configuration des refs de fichiers
const FILE_REFS_CONFIG = [
  { name: "kbis" },
  { name: "statutes" },
  { name: "idIdentity" },
  { name: "livretDeFamille" },
  { name: "contratDePacs" },
  { name: "diagnostics" },
  { name: "reglementCopropriete" },
  { name: "cahierChargeLotissement" },
  { name: "statutAssociationSyndicale" },
  { name: "insuranceOwner" },
  { name: "ribOwner" },
] as const;

export function FullClientForm({ onSubmit }: FullClientFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clientType, setClientType] = useState<ClientType>(ClientType.PERSONNE_PHYSIQUE);
  
  // Refs pour les fichiers (créées dynamiquement)
  const fileRefs = FILE_REFS_CONFIG.reduce((acc, { name }) => {
    acc[name] = useRef<HTMLInputElement | null>(null);
    return acc;
  }, {} as Record<string, React.RefObject<HTMLInputElement | null>>);

  const form = useForm<any>({
    resolver: zodResolver(createFullClientWithPropertySchema as any),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { fields: additionalPersons, append, remove } = useFieldArray({
    control: form.control,
    name: "additionalPersons",
  });

  // Observer le statut familial pour conditionner l'affichage du régime matrimonial
  const watchedFamilyStatus = form.watch("familyStatus");

  // Réinitialiser le régime matrimonial si le statut familial change et n'est plus MARIE
  useEffect(() => {
    if (watchedFamilyStatus !== FamilyStatus.MARIE) {
      form.setValue("matrimonialRegime", undefined);
    }
  }, [watchedFamilyStatus, form]);

  // Fonction utilitaire pour vérifier si une personne a des données
  const hasPersonData = (person: any): boolean => {
    return !!(
      (person.firstName?.trim()) || 
      (person.lastName?.trim()) || 
      (person.email?.trim()) || 
      (person.phone?.trim()) ||
      (person.profession?.trim()) ||
      person.familyStatus ||
      person.matrimonialRegime ||
      (person.birthPlace?.trim()) ||
      person.birthDate ||
      (person.fullAddress?.trim()) ||
      (person.nationality?.trim())
    );
  };

  // Fonction utilitaire pour normaliser les données d'une personne
  const normalizePersonData = (person: any) => ({
    firstName: person.firstName?.trim() || undefined,
    lastName: person.lastName?.trim() || undefined,
    profession: person.profession?.trim() || undefined,
    phone: person.phone?.trim() || undefined,
    email: person.email?.trim() || undefined,
    fullAddress: person.fullAddress?.trim() || undefined,
    nationality: person.nationality?.trim() || undefined,
    familyStatus: person.familyStatus || undefined,
    matrimonialRegime: person.matrimonialRegime || undefined,
    birthPlace: person.birthPlace?.trim() || undefined,
    birthDate: person.birthDate || undefined,
  });

  // Fonction utilitaire pour ajouter les fichiers au FormData
  const appendFilesToFormData = (formData: FormData) => {
    FILE_REFS_CONFIG.forEach(({ name }) => {
      const ref = fileRefs[name];
      if (ref?.current?.files?.[0]) {
        formData.append(name, ref.current.files[0]);
      }
    });
  };

  // Valeurs par défaut pour une nouvelle personne supplémentaire
  const getDefaultPersonValues = () => ({
    firstName: "",
    lastName: "",
    profession: "",
    familyStatus: undefined,
    matrimonialRegime: undefined,
    birthPlace: "",
    birthDate: "",
    email: "",
    phone: "",
    fullAddress: "",
    nationality: "",
  });

  // Fonction utilitaire pour créer le payload des personnes
  const createPersonsPayload = (data: any): any[] => {
    const personsPayload: any[] = [];
    const formValues = form.getValues();
    const additionalPersonsFromForm = formValues.additionalPersons || data.additionalPersons;

    // Ajouter la personne principale pour PERSONNE_PHYSIQUE
    if (data.type === ClientType.PERSONNE_PHYSIQUE) {
      personsPayload.push({
        ...normalizePersonData(data),
        isPrimary: true,
      });
    }

    // Ajouter les personnes supplémentaires
    if (Array.isArray(additionalPersonsFromForm)) {
      additionalPersonsFromForm.forEach((person: any) => {
        if (hasPersonData(person)) {
          personsPayload.push({
            ...normalizePersonData(person),
            isPrimary: false,
          });
        }
      });
    }

    return personsPayload;
  };

  // Fonction utilitaire pour ajouter les données du formulaire au FormData
  const appendFormDataToFormData = (formData: FormData, data: any) => {
    Object.entries(data).forEach(([key, value]) => {
      // Ignorer additionalPersons car traité séparément
      if (key === "additionalPersons") return;
      
      // Ignorer les valeurs vides
      if (value === undefined || value === null || value === "") return;

      if (value instanceof Date) {
        formData.append(key, value.toISOString().split('T')[0]);
      } else if (value instanceof File) {
        formData.append(key, value);
      } else {
        formData.append(key, String(value));
      }
    });
  };

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const formData = new FormData();

      // Ajouter tous les champs du formulaire
      appendFormDataToFormData(formData, data);

      // Ajouter les fichiers
      appendFilesToFormData(formData);

      // Créer et ajouter le payload des personnes
      const personsPayload = createPersonsPayload(data);
      if (personsPayload.length > 0) {
        formData.append("persons", JSON.stringify(personsPayload));
      }

      await onSubmit(formData);
      toast.success("Client créé avec succès");
      router.push("/interface/clients");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du client");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction utilitaire pour formater et afficher les erreurs de validation
  const formatValidationErrors = (errors: any): string[] => {
    const errorMessages: string[] = [];
    Object.keys(errors).forEach((key) => {
      const error = errors[key];
      if (error?.message) {
        errorMessages.push(`${key}: ${error.message}`);
      }
    });
    return errorMessages;
  };

  const onError = (errors: any) => {
    const errorMessages = formatValidationErrors(errors);

    if (errorMessages.length === 0) {
      toast.error("Veuillez corriger les erreurs du formulaire");
    } else if (errorMessages.length === 1) {
      toast.error(errorMessages[0]);
    } else {
      toast.error(`${errorMessages.length} erreurs de validation`, {
        description: errorMessages.slice(0, 3).join(", ") + (errorMessages.length > 3 ? "..." : ""),
      });
    }
  };

  // Gérer le changement de type de client
  const handleClientTypeChange = (value: string) => {
    const newType = value as ClientType;
    setClientType(newType);
    form.setValue("type", newType);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit, onError)} className="space-y-6">
      <Tabs value={clientType} onValueChange={handleClientTypeChange}>
        <TabsList className="grid w-full grid-cols-2 border rounded-lg mb-6">
          <TabsTrigger value={ClientType.PERSONNE_PHYSIQUE}>Particulier</TabsTrigger>
          <TabsTrigger value={ClientType.PERSONNE_MORALE}>Entreprise</TabsTrigger>
        </TabsList>

        {/* Informations propriétaire et personnes rattachées */}
        <Card>
          <CardHeader>
            <CardTitle>
              {clientType === ClientType.PERSONNE_PHYSIQUE 
                ? "Personnes propriétaires" 
                : "Informations entreprise"}
            </CardTitle>
            <CardDescription>
              {clientType === ClientType.PERSONNE_PHYSIQUE
                ? "Renseignez les informations des personnes propriétaires. Vous pouvez ajouter plusieurs personnes."
                : "Renseignez les informations de l'entreprise propriétaire."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personne principale - uniquement pour PERSONNE_PHYSIQUE */}
            {clientType === ClientType.PERSONNE_PHYSIQUE && (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">Personne 1 (Principale)</h4>
                
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
                </TabsContent>
              </div>
            )}

            {/* Informations entreprise - uniquement pour PERSONNE_MORALE */}
            {clientType === ClientType.PERSONNE_MORALE && (
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">Informations entreprise</h4>
                
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
                </TabsContent>
              </div>
            )}

            {/* Séparateur - uniquement pour PERSONNE_PHYSIQUE */}
            {clientType === ClientType.PERSONNE_PHYSIQUE && additionalPersons.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Personnes supplémentaires</h4>
              </div>
            )}

            {/* Personnes supplémentaires - uniquement pour PERSONNE_PHYSIQUE */}
            {clientType === ClientType.PERSONNE_PHYSIQUE && additionalPersons.map((person, index) => {
              const watchedPersonFamilyStatus = form.watch(`additionalPersons.${index}.familyStatus`);
              
              return (
                <div key={person.id ?? index} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Personne {index + 2}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={isLoading}
                    >
                      Supprimer
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`additionalPersons.${index}.firstName`}>Prénom</Label>
                      <Input
                        id={`additionalPersons.${index}.firstName`}
                        {...form.register(`additionalPersons.${index}.firstName` as const)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`additionalPersons.${index}.lastName`}>Nom</Label>
                      <Input
                        id={`additionalPersons.${index}.lastName`}
                        {...form.register(`additionalPersons.${index}.lastName` as const)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`additionalPersons.${index}.profession`}>Profession</Label>
                    <Input
                      id={`additionalPersons.${index}.profession`}
                      {...form.register(`additionalPersons.${index}.profession` as const)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`additionalPersons.${index}.familyStatus`}>Situation familiale</Label>
                      <Controller
                        name={`additionalPersons.${index}.familyStatus` as const}
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
                    {watchedPersonFamilyStatus === FamilyStatus.MARIE && (
                      <div className="space-y-2">
                        <Label htmlFor={`additionalPersons.${index}.matrimonialRegime`}>Régime matrimonial</Label>
                        <Controller
                          name={`additionalPersons.${index}.matrimonialRegime` as const}
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
                      <Label htmlFor={`additionalPersons.${index}.birthPlace`}>Lieu de naissance</Label>
                      <Input
                        id={`additionalPersons.${index}.birthPlace`}
                        {...form.register(`additionalPersons.${index}.birthPlace` as const)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`additionalPersons.${index}.birthDate`}>Date de naissance</Label>
                      <Input
                        id={`additionalPersons.${index}.birthDate`}
                        type="date"
                        {...form.register(`additionalPersons.${index}.birthDate` as const)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`additionalPersons.${index}.email`}>Email</Label>
                      <Input
                        id={`additionalPersons.${index}.email`}
                        type="email"
                        {...form.register(`additionalPersons.${index}.email` as const)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`additionalPersons.${index}.phone`}>Téléphone</Label>
                      <Controller
                        name={`additionalPersons.${index}.phone` as const}
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
                    <Label htmlFor={`additionalPersons.${index}.fullAddress`}>Adresse complète</Label>
                    <Textarea
                      id={`additionalPersons.${index}.fullAddress`}
                      {...form.register(`additionalPersons.${index}.fullAddress` as const)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`additionalPersons.${index}.nationality`}>Nationalité</Label>
                    <Controller
                      name={`additionalPersons.${index}.nationality` as const}
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
                </div>
              );
            })}

            {/* Bouton ajouter une personne - uniquement pour PERSONNE_PHYSIQUE */}
            {clientType === ClientType.PERSONNE_PHYSIQUE && (
              <Button
                type="button"
                variant="outline"
                onClick={() => append(getDefaultPersonValues())}
                disabled={isLoading}
              >
                Ajouter une personne
              </Button>
            )}
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
                <NumberInputGroup 
                  field={form.register("bailSecurityDeposit")} 
                  min={0} 
                  unit="€" 
                  disabled={isLoading} 
                />
                <BailSecurityDepositValidation control={form.control} />
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
