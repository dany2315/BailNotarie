"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createTenantForLease } from "@/lib/actions/leases";

const tenantFormSchema = z.object({
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

interface TenantCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bailId: string;
}

export function TenantCreateDialog({ open, onOpenChange, bailId }: TenantCreateDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: TenantFormData) => {
    setIsLoading(true);
    try {
      await createTenantForLease({
        bailId,
        email: data.email,
      });
      toast.success("Locataire créé avec succès. Un email a été envoyé au locataire.");
      form.reset();
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du locataire");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un locataire</DialogTitle>
          <DialogDescription>
            Renseignez l'email du locataire. Il sera connecté au bail et recevra automatiquement un email avec un formulaire à compléter.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email du locataire *</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="email@example.com"
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le locataire"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

