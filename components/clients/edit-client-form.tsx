"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { updateClientSchema } from "@/lib/zod/client";
import { ClientType, ProfilType, FamilyStatus, MatrimonialRegime } from "@prisma/client";
import { updateClient } from "@/lib/actions/clients";
import { PhoneInput } from "@/components/ui/phone-input";
import { NationalitySelect } from "@/components/ui/nationality-select";

interface EditClientFormProps {
  client: any;
}

export function EditClientForm({ client }: EditClientFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clientType, setClientType] = useState<ClientType>(client.type || ClientType.PERSONNE_PHYSIQUE);

  const form = useForm<any>({
    resolver: zodResolver(updateClientSchema),
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

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await updateClient(data);
      toast.success("Client modifié avec succès");
      router.push(`/interface/clients/${client.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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


