"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const intakeLinkFormSchema = z.object({
  target: z.enum(["OWNER", "TENANT"]),
  propertyId: z.string().optional().or(z.literal("")),
  leaseId: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
});

type IntakeLinkFormData = z.infer<typeof intakeLinkFormSchema>;

interface IntakeLinkFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  properties: any[];
  leases: any[];
}

export function IntakeLinkForm({ onSubmit, properties, leases }: IntakeLinkFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<IntakeLinkFormData>({
    resolver: zodResolver(intakeLinkFormSchema),
    defaultValues: {
      target: "OWNER",
      propertyId: "",
      leaseId: "",
      expiresAt: "",
    },
  });

  const handleSubmit = async (data: IntakeLinkFormData) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("target", data.target);
      if (data.propertyId) formData.append("propertyId", data.propertyId);
      if (data.leaseId) formData.append("leaseId", data.leaseId);
      if (data.expiresAt) formData.append("expiresAt", data.expiresAt);
      
      await onSubmit(formData);
      toast.success("Lien d'intake créé avec succès");
      router.push("/interface/intakes");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du lien d'intake");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau lien d'intake</CardTitle>
        <CardDescription>
          Créer un nouveau lien d'intake pour collecter des informations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target">Cible *</Label>
            <Controller
              name="target"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.trigger("target");
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une cible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Propriétaire</SelectItem>
                    <SelectItem value="TENANT">Locataire</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.target && (
              <p className="text-sm text-destructive">
                {form.formState.errors.target.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Bien</Label>
              <Controller
                name="propertyId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value === "__none__" ? "" : value);
                      form.trigger("propertyId");
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un bien (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucun</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.label || property.fullAddress}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseId">Bail</Label>
              <Controller
                name="leaseId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value === "__none__" ? "" : value);
                      form.trigger("leaseId");
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un bail (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucun</SelectItem>
                      {leases.map((lease) => (
                        <SelectItem key={lease.id} value={lease.id}>
                          Bail #{lease.id.slice(-8)} - {lease.property?.fullAddress || lease.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
              <Label htmlFor="expiresAt">Date d'expiration</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              {...form.register("expiresAt")}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Laisser vide pour un lien sans expiration
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Créer le lien
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

