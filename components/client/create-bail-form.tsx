"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/drawer";
import { createLease, createTenantFromEmail } from "@/lib/actions/leases";
import { createProperty } from "@/lib/actions/properties";
import { Loader2, ArrowLeft, Plus, Home, User, Building2, Users, Mail, MapPin, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { BailType, BailFamille, BailStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatePropertyForm, CreatePropertyFormRef } from "./create-property-form";
import { cn } from "@/lib/utils";
import { RentControlAlert } from "@/components/ui/rent-control-alert";
import { validateRentAmount } from "@/lib/utils/rent-validation";
import type { RentValidationResult } from "@/lib/utils/rent-validation";

const createBailSchema = z.object({
  propertyId: z.string().min(1, "Le bien est requis"),
  tenantId: z.string().min(1, "Le locataire est requis"),
  bailType: z.nativeEnum(BailType),
  rentAmount: z.string().min(1, "Le loyer est requis"),
  monthlyCharges: z.string().min(1, "Les charges mensuelles sont requises"),
  securityDeposit: z.string().optional(),
  effectiveDate: z.string().min(1, "La date de début est requise"),
  endDate: z.string().optional(),
  paymentDay: z.string().min(1, "Le jour de paiement est requis"),
});

type CreateBailFormData = z.infer<typeof createBailSchema>;

interface CreateBailFormProps {
  biens: Array<{
    id: string;
    label: string | null;
    fullAddress: string | null;
  }>;
  locataires: Array<{
    id: string;
    persons: Array<{
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>;
    entreprise: {
      legalName: string;
      name: string;
    } | null;
  }>;
  ownerId: string;
}

export function CreateBailForm({ biens, locataires, ownerId }: CreateBailFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isPropertyDrawerOpen, setIsPropertyDrawerOpen] = useState(false);
  const [isTenantDrawerOpen, setIsTenantDrawerOpen] = useState(false);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [localBiens, setLocalBiens] = useState(biens);
  const [localLocataires, setLocalLocataires] = useState(locataires);
  const [isMobile, setIsMobile] = useState(false);
  const propertyFormRef = useRef<CreatePropertyFormRef>(null);
  const [isPropertyFormLoading, setIsPropertyFormLoading] = useState(false);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    resetField,
    watch,
    formState: { errors },
  } = useForm<CreateBailFormData>({
    resolver: zodResolver(createBailSchema),
    defaultValues: {
      bailType: BailType.BAIL_NU_3_ANS,
      securityDeposit: "0",
    },
  });

  const propertyId = watch("propertyId");
  const tenantId = watch("tenantId");
  const bailType = watch("bailType");
  const rentAmount = watch("rentAmount");
  const [selectedProperty, setSelectedProperty] = useState<{ id: string; surfaceM2: number | null } | null>(null);
  const [rentValidationResult, setRentValidationResult] = useState<RentValidationResult | null>(null);
  const [propertySelectKey, setPropertySelectKey] = useState(0);
  const [tenantSelectKey, setTenantSelectKey] = useState(0);

  // Récupérer les informations du bien sélectionné
  useEffect(() => {
    if (propertyId) {
      const bien = localBiens.find(b => b.id === propertyId);
      if (bien) {
        // Récupérer la surface depuis l'API
        fetch(`/api/properties/${propertyId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            // Vérifier si la réponse contient une erreur
            if (data.error) {
              throw new Error(data.error);
            }
            setSelectedProperty({
              id: propertyId,
              surfaceM2: data.surfaceM2 ? Number(data.surfaceM2) : null,
            });
          })
          .catch((error) => {
            console.error("Erreur lors de la récupération du bien:", error);
            setSelectedProperty({ id: propertyId, surfaceM2: null });
          });
      } else {
        setSelectedProperty(null);
      }
    } else {
      setSelectedProperty(null);
    }
  }, [propertyId, localBiens]);

  // Valider le loyer quand il change
  useEffect(() => {
    if (propertyId && rentAmount && selectedProperty) {
      const rent = parseFloat(rentAmount);
      if (!isNaN(rent) && rent > 0) {
        validateRentAmount(propertyId, rent, selectedProperty.surfaceM2)
          .then(result => setRentValidationResult(result))
          .catch(() => setRentValidationResult(null));
      } else {
        setRentValidationResult(null);
      }
    } else {
      setRentValidationResult(null);
    }
  }, [propertyId, rentAmount, selectedProperty]);

  const getLocataireName = (locataire: typeof locataires[0]) => {
    if (locataire.entreprise) {
      return locataire.entreprise.legalName || locataire.entreprise.name;
    }
    if (locataire.persons.length > 0) {
      const person = locataire.persons[0];
      const name = `${person.firstName || ""} ${person.lastName || ""}`.trim();
      return name || person.email || "Locataire";
    }
    return "Locataire";
  };

  const getLocataireEmail = (locataire: typeof locataires[0]) => {
    if (locataire.entreprise) {
      return null;
    }
    if (locataire.persons.length > 0) {
      return locataire.persons[0].email;
    }
    return null;
  };

  const handleCreateTenant = async () => {
    if (!newTenantEmail || !newTenantEmail.includes("@")) {
      toast.error("Veuillez entrer un email valide");
      return;
    }

    try {
      setIsCreatingTenant(true);
      const tenant = await createTenantFromEmail({ email: newTenantEmail });
      
      // Ajouter le nouveau locataire à la liste locale
      setLocalLocataires([...localLocataires, tenant]);
      
      // Sélectionner automatiquement le nouveau locataire
      setValue("tenantId", tenant.id);
      
      toast.success("Locataire créé avec succès");
      setNewTenantEmail("");
      setIsTenantDrawerOpen(false);
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de créer le locataire",
      });
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handlePropertyCreated = (newProperty: any) => {
    // Ajouter le nouveau bien à la liste locale
    setLocalBiens([...localBiens, {
      id: newProperty.id,
      label: newProperty.label,
      fullAddress: newProperty.fullAddress,
    }]);
    
    // Sélectionner automatiquement le nouveau bien
    setValue("propertyId", newProperty.id);
    
    setIsPropertyDrawerOpen(false);
    toast.success("Bien créé avec succès");
  };

  const onSubmit = async (data: CreateBailFormData) => {
    try {
      setIsLoading(true);
      const bailData = {
        ...data,
        securityDeposit: data.securityDeposit || "0",
        leaseType: "HABITATION",
        status: BailStatus.DRAFT,
      };
      await createLease(bailData);
      toast.success("Bail créé avec succès");
      router.push("/client/proprietaire/baux");
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de créer le bail",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Informations du bail</CardTitle>
          <CardDescription>
            Remplissez les informations pour créer un nouveau bail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Sélection du bien */}
            <div className="space-y-2">
              <Label htmlFor="propertyId" className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                Bien *
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Select
                    key={`property-select-${propertySelectKey}`}
                    value={propertyId && propertyId.trim() !== "" ? propertyId : undefined}
                    onValueChange={(value) => setValue("propertyId", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={cn("w-full", propertyId && propertyId.trim() !== "" && "pr-8")}>
                      <SelectValue placeholder="Sélectionner un bien" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {localBiens.map((bien) => (
                        <SelectItem 
                          key={bien.id} 
                          value={bien.id} 
                          textValue={bien.label || bien.fullAddress || "Bien sans libellé"}
                          className="py-3"
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium">{bien.label || "Bien sans libellé"}</span>
                            </div>
                            <div className="flex items-center gap-2 pl-6">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">{bien.fullAddress || "Adresse non renseignée"}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {propertyId && propertyId.trim() !== "" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-destructive/10 hover:text-destructive z-20 pointer-events-auto"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setValue("propertyId", "", { shouldValidate: false, shouldDirty: true });
                        setSelectedProperty(null);
                        setPropertySelectKey(prev => prev + 1);
                      }}
                      disabled={isLoading}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Drawer 
                  open={isPropertyDrawerOpen} 
                  onOpenChange={setIsPropertyDrawerOpen}
                  direction={isMobile ? "bottom" : "right"}
                >
                  <DrawerTrigger asChild>
                    <Button type="button" variant="outline" size="icon" disabled={isLoading}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent  className={cn("max-h-[98vh]", !isMobile && "sm:max-w-lg h-full")}>
                    <DrawerHeader>
                      <DrawerTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Créer un nouveau bien
                      </DrawerTitle>
                      <DrawerDescription>
                        Remplissez les informations pour créer un nouveau bien immobilier
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="no-scrollbar overflow-y-auto px-4">
                      <CreatePropertyForm 
                        ref={propertyFormRef}
                        ownerId={ownerId}
                        onPropertyCreated={handlePropertyCreated}
                        hideActions={true}
                        onLoadingChange={setIsPropertyFormLoading}
                      />
                    </div>
                    <DrawerFooter>
                      <div className="flex flex-col gap-2 justify-end w-full">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPropertyDrawerOpen(false)}
                          disabled={isPropertyFormLoading}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          onClick={() => propertyFormRef.current?.submit()}
                          disabled={isPropertyFormLoading}
                        >
                          {isPropertyFormLoading ? (
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
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
              {errors.propertyId && (
                <p className="text-sm text-destructive">{errors.propertyId.message}</p>
              )}
            </div>

            {/* Avertissement zone tendue */}
            {propertyId && (
              <RentControlAlert
                propertyId={propertyId}
                rentAmount={rentAmount ? parseFloat(rentAmount) : undefined}
                surfaceM2={selectedProperty?.surfaceM2}
                validationResult={rentValidationResult}
              />
            )}

            <Separator />

            {/* Sélection du locataire */}
            <div className="space-y-2">
              <Label htmlFor="tenantId" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Locataire *
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Select
                    key={`tenant-select-${tenantSelectKey}`}
                    value={tenantId && tenantId.trim() !== "" ? tenantId : undefined}
                    onValueChange={(value) => setValue("tenantId", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={cn("w-full", tenantId && tenantId.trim() !== "" && "pr-8")}>
                      <SelectValue placeholder="Sélectionner un locataire" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                    {localLocataires.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2 sticky top-0 bg-background z-10">
                          <Users className="h-3 w-3" />
                          Locataires précédents ({localLocataires.length})
                        </div>
                        {localLocataires.map((locataire) => {
                          const email = getLocataireEmail(locataire);
                          return (
                            <SelectItem 
                              key={locataire.id} 
                              value={locataire.id} 
                              textValue={getLocataireName(locataire)}
                              className="py-3"
                            >
                              <div className="flex flex-col gap-1 w-full">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="font-medium">{getLocataireName(locataire)}</span>
                                  <span className="ml-auto px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Précédent
                                  </span>
                                </div>
                                {email && (
                                  <div className="flex items-center gap-2 pl-6">
                                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="text-xs text-muted-foreground truncate">{email}</span>
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </>
                    ) : (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        Aucun locataire précédent trouvé. Utilisez le bouton + pour ajouter un nouveau locataire.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {tenantId && tenantId.trim() !== "" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-destructive/10 hover:text-destructive z-20 pointer-events-auto"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setValue("tenantId", "", { shouldValidate: false, shouldDirty: true });
                      setTenantSelectKey(prev => prev + 1);
                    }}
                    disabled={isLoading}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                </div>
                <Drawer 
                  open={isTenantDrawerOpen} 
                  onOpenChange={setIsTenantDrawerOpen}
                  direction={isMobile ? "bottom" : "right"}
                >
                  <DrawerTrigger asChild>
                    <Button type="button" variant="outline" size="icon" disabled={isLoading}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className={cn("max-h-[95vh]", !isMobile && "sm:max-w-md h-full")}>
                    <DrawerHeader>
                      <DrawerTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Ajouter un nouveau locataire
                      </DrawerTitle>
                      <DrawerDescription>
                        Entrez l'email du locataire pour le créer et l'ajouter au bail
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="overflow-y-auto px-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="tenantEmail">Email du locataire *</Label>
                          <Input
                            id="tenantEmail"
                            type="email"
                            placeholder="locataire@example.com"
                            value={newTenantEmail}
                            onChange={(e) => setNewTenantEmail(e.target.value)}
                            disabled={isCreatingTenant}
                          />
                          <p className="text-xs text-muted-foreground">
                            Un lien d'invitation sera envoyé à cette adresse email une fois le bail créé.
                          </p>
                        </div>
                      </div>
                    </div>
                    <DrawerFooter>
                      <div className="flex flex-col gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsTenantDrawerOpen(false);
                            setNewTenantEmail("");
                          }}
                          disabled={isCreatingTenant}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCreateTenant}
                          disabled={isCreatingTenant || !newTenantEmail}
                        >
                          {isCreatingTenant ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Création...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Créer le locataire
                            </>
                          )}
                        </Button>
                      </div>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
              {errors.tenantId && (
                <p className="text-sm text-destructive">{errors.tenantId.message}</p>
              )}
            </div>

            <Separator />

            {/* Autres champs du formulaire */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bailType">Type de bail *</Label>
                <Select
                  value={bailType}
                  onValueChange={(value) => setValue("bailType", value as BailType)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BailType.BAIL_NU_3_ANS}>Bail nue 3 ans</SelectItem>
                    <SelectItem value={BailType.BAIL_NU_6_ANS}>Bail nue 6 ans</SelectItem>
                    <SelectItem value={BailType.BAIL_MEUBLE_1_ANS}>Bail meublé 1 an</SelectItem>
                    <SelectItem value={BailType.BAIL_MEUBLE_9_MOIS}>Bail meublé 9 mois</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bailType && (
                  <p className="text-sm text-destructive">{errors.bailType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rentAmount">Loyer mensuel (€) *</Label>
                  <Input
                    id="rentAmount"
                    type="number"
                    {...register("rentAmount")}
                    disabled={isLoading}
                    placeholder="800"
                  />
                  {errors.rentAmount && (
                    <p className="text-sm text-destructive">{errors.rentAmount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyCharges">Charges mensuelles (€) *</Label>
                  <Input
                    id="monthlyCharges"
                    type="number"
                    {...register("monthlyCharges")}
                    disabled={isLoading}
                    placeholder="50"
                  />
                  {errors.monthlyCharges && (
                    <p className="text-sm text-destructive">{errors.monthlyCharges.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="securityDeposit">Dépôt de garantie (€)</Label>
                  <Input
                    id="securityDeposit"
                    type="number"
                    {...register("securityDeposit")}
                    disabled={isLoading}
                    placeholder="800"
                  />
                  {errors.securityDeposit && (
                    <p className="text-sm text-destructive">{errors.securityDeposit.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effectiveDate">Date de début *</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    {...register("effectiveDate")}
                    disabled={isLoading}
                  />
                  {errors.effectiveDate && (
                    <p className="text-sm text-destructive">{errors.effectiveDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Date de fin (optionnel)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register("endDate")}
                    disabled={isLoading}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-destructive">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDay">Jour de paiement *</Label>
                <Input
                  id="paymentDay"
                  type="number"
                  min="1"
                  max="31"
                  {...register("paymentDay")}
                  disabled={isLoading}
                  placeholder="5"
                />
                {errors.paymentDay && (
                  <p className="text-sm text-destructive">{errors.paymentDay.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Boutons d'action */}
            <div className="flex gap-2 justify-end">
              <Link href="/client/proprietaire/baux">
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
                  "Créer le bail"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
