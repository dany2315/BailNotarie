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
import { createBasicClientSchema } from "@/lib/zod/client";
import { createBasicClient } from "@/lib/actions/clients";

const basicClientFormSchema = createBasicClientSchema;

type BasicClientFormData = z.infer<typeof basicClientFormSchema>;

interface BasicClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BasicClientDialog({ open, onOpenChange }: BasicClientDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BasicClientFormData>({
    resolver: zodResolver(basicClientFormSchema),
    defaultValues: {
      email: "",
      profilType: "PROPRIETAIRE",
    },
  });

  const handleSubmit = async (data: BasicClientFormData) => {
    setIsLoading(true);
    try {
      await createBasicClient(data);
      toast.success("Client créé avec succès. Un email a été envoyé au client.");
      form.reset();
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer le formulaire par email</DialogTitle>
          <DialogDescription>
            Renseignez l'email du client. Il recevra automatiquement un email avec un formulaire à compléter.
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
                "Envoyer l'email"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}













