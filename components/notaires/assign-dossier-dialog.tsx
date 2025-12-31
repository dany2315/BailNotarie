"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Building2, Check, ChevronsUpDown, Calendar } from "lucide-react";
import { assignDossierToNotaire, getAllNotaires } from "@/lib/actions/notaires";
import { getAllBails } from "@/lib/actions/leases";
import { Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";

const assignDossierSchema = z.object({
  bailId: z.string().min(1, "Le bail est requis"),
  notaireId: z.string().min(1, "Le notaire est requis"),
  notes: z.string().optional().nullable(),
});

type AssignDossierFormData = z.infer<typeof assignDossierSchema>;

interface AssignDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBailId?: string;
}

export function AssignDossierDialog({
  open,
  onOpenChange,
  initialBailId,
}: AssignDossierDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [notaires, setNotaires] = useState<any[]>([]);
  const [bails, setBails] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<AssignDossierFormData>({
    resolver: zodResolver(assignDossierSchema),
    defaultValues: {
      bailId: "",
      notaireId: "",
      notes: "",
    },
  });

  const watchedBailId = watch("bailId");

  // Charger les données et initialiser le formulaire
  useEffect(() => {
    if (open) {
      setIsLoadingData(true);
      Promise.all([
        getAllNotaires(),
        getAllBails(),
      ]).then(([notairesData, bailsData]) => {
        setNotaires(notairesData);
        setBails(bailsData);
        
        // Réinitialiser le formulaire avec les valeurs correctes
        reset({
          bailId: initialBailId || "",
          notaireId: "",
          notes: "",
        });
        
        setIsLoadingData(false);
      }).catch((error) => {
        console.error("Erreur lors du chargement des données:", error);
        setIsLoadingData(false);
      });
    } else {
      // Réinitialiser le formulaire quand le dialog se ferme
      reset({
        bailId: "",
        notaireId: "",
        notes: "",
      });
    }
  }, [open, initialBailId, reset]);

  // Bail sélectionné
  const selectedBail = useMemo(() => {
    if (!watchedBailId) return null;
    return bails.find((b) => b.id === watchedBailId) || null;
  }, [watchedBailId, bails]);

  const onSubmit = async (data: AssignDossierFormData) => {
    setIsLoading(true);
    try {
      await assignDossierToNotaire(data);
      toast.success("Dossier assigné avec succès");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur lors de l'assignation", {
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper pour obtenir le nom d'un client
  const getClientName = (client: any) => {
    if (client?.entreprise) {
      return client.entreprise.legalName || client.entreprise.name;
    }
    const primaryPerson = client?.persons?.find((p: any) => p.isPrimary) || client?.persons?.[0];
    if (primaryPerson) {
      return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || "Client";
    }
    return "Client";
  };

  // Helper pour obtenir le nom d'un bail (pour l'affichage)
  const getBailDisplayName = (bail: any) => {
    const propertyAddress = bail?.property?.fullAddress || "Propriété";
    const bailType = bail?.bailType || "";
    return `${propertyAddress} - ${bailType}`;
  };

  // Helper pour créer un texte de recherche pour un bail
  const getBailSearchText = (bail: any) => {
    const parts = [];
    if (bail?.property?.fullAddress) parts.push(bail.property.fullAddress);
    if (bail?.property?.label) parts.push(bail.property.label);
    if (bail?.bailType) parts.push(bail.bailType);
    if (bail?.parties) {
      bail.parties.forEach((party: any) => {
        const name = getClientName(party);
        if (name) parts.push(name);
      });
    }
    return parts.join(" ").toLowerCase();
  };

  // Bail sélectionné pour l'affichage dans le trigger
  const selectedBailForDisplay = useMemo(() => {
    if (!watchedBailId) return null;
    return bails.find((b) => b.id === watchedBailId) || null;
  }, [watchedBailId, bails]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assigner un dossier à un notaire</DialogTitle>
          <DialogDescription>
            Sélectionnez un bail. Un bail comprend les parties et le bien associé.
          </DialogDescription>
        </DialogHeader>
        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bailId">Bail *</Label>
            <Controller
              name="bailId"
              control={control}
              render={({ field }) => {
                const [popoverOpen, setPopoverOpen] = useState(false);
                
                return (
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={popoverOpen}
                        className="w-full justify-between h-auto min-h-10 font-normal"
                        type="button"
                      >
                        {selectedBailForDisplay ? (
                          <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 w-full">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">
                                {selectedBailForDisplay.property?.fullAddress || "Propriété"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                              <Badge variant="secondary" className="text-xs">
                                {selectedBailForDisplay.bailType || "N/A"}
                              </Badge>
                              {selectedBailForDisplay.parties && selectedBailForDisplay.parties.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {selectedBailForDisplay.parties.length} partie{selectedBailForDisplay.parties.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sélectionner un bail...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command shouldFilter={true}>
                        <CommandInput 
                          placeholder="Rechercher un bail par adresse, type ou partie..." 
                          className="h-9"
                        />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>Aucun bail trouvé.</CommandEmpty>
                          <CommandGroup>
                            {bails.map((bail: any) => (
                              <CommandItem
                                key={bail.id}
                                value={getBailSearchText(bail)}
                                onSelect={() => {
                                  field.onChange(bail.id === field.value ? "" : bail.id);
                                  setPopoverOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col gap-2 flex-1 min-w-0 py-2">
                                  <div className="flex items-start gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        {bail.property?.fullAddress || bail.property?.label || "Propriété"}
                                      </div>
                                      {bail.property?.label && bail.property?.fullAddress && (
                                        <div className="text-xs text-muted-foreground truncate">
                                          {bail.property.label}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap pl-6">
                                    {bail.bailType && (
                                      <Badge variant="secondary" className="text-xs">
                                        {bail.bailType}
                                      </Badge>
                                    )}
                                    {bail.effectiveDate && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        <span>{formatDate(bail.effectiveDate)}</span>
                                      </div>
                                    )}
                                  </div>
                                  {bail.parties && bail.parties.length > 0 && (
                                    <div className="pl-6 text-xs text-muted-foreground space-y-1">
                                      {(() => {
                                        const proprietaires = bail.parties.filter((p: any) => p.profilType === "PROPRIETAIRE");
                                        const locataires = bail.parties.filter((p: any) => p.profilType === "LOCATAIRE");
                                        
                                        return (
                                          <>
                                            {proprietaires.length > 0 && (
                                              <div>
                                                <div className="font-medium mb-0.5">Propriétaire{proprietaires.length > 1 ? "s" : ""}:</div>
                                                <div className="space-y-0.5">
                                                  {proprietaires.map((party: any, idx: number) => (
                                                    <div key={party.id || idx} className="truncate">
                                                      • {getClientName(party)}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {locataires.length > 0 && (
                                              <div>
                                                <div className="font-medium mb-0.5">Locataire{locataires.length > 1 ? "s" : ""}:</div>
                                                <div className="space-y-0.5">
                                                  {locataires.map((party: any, idx: number) => (
                                                    <div key={party.id || idx} className="truncate">
                                                      • {getClientName(party)}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                                <Check
                                  className={cn(
                                    "ml-2 h-4 w-4 shrink-0",
                                    field.value === bail.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                );
              }}
            />
            {errors.bailId && (
              <p className="text-sm text-destructive">{errors.bailId.message}</p>
            )}
          </div>



          <div className="space-y-2 w-full">
            <Label htmlFor="notaireId">Notaire *</Label>
            <Controller
              name="notaireId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un notaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {notaires.map((notaire) => (
                      <SelectItem key={notaire.id} value={notaire.id}>
                        {notaire.name || notaire.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.notaireId && (
              <p className="text-sm text-destructive">{errors.notaireId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Notes supplémentaires sur cette assignation..."
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assigner
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

