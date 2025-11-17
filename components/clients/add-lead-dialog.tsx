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
import { createLead } from "@/lib/actions/leads";

const leadFormSchema = z.object({
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: LeadFormData) => {
    setIsLoading(true);
    try {
      const result = await createLead(data);
      
      if (result.emailSent === false) {
        toast.warning("Lead créé avec succès, mais l'email n'a pas pu être envoyé. Le lien de conversion est disponible dans les détails du client.", {
          duration: 7000,
        });
      } else {
        toast.success("Lead créé avec succès. Un email de conversion a été envoyé.");
      }
      
      form.reset();
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      // Afficher l'erreur dans le toast
      const errorMessage = error.message || "Erreur lors de la création du lead";
      toast.error(errorMessage, {
        duration: 5000,
      });
      
      // Si l'erreur concerne l'email, définir l'erreur sur le champ
      if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("existe déjà")) {
        form.setError("email", {
          type: "manual",
          message: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un lead</DialogTitle>
          <DialogDescription>
            Renseignez l'email du prospect. Il recevra automatiquement un email avec un lien de conversion pour choisir s'il est propriétaire ou locataire.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
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
                  Envoi...
                </>
              ) : (
                "Créer le lead"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

