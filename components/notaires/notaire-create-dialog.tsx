"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createNotaire } from "@/lib/actions/notaires";

const createNotaireSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().optional(),
});

type CreateNotaireFormData = z.infer<typeof createNotaireSchema>;

interface NotaireCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotaireCreateDialog({ open, onOpenChange }: NotaireCreateDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateNotaireFormData>({
    resolver: zodResolver(createNotaireSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  const onSubmit = async (data: CreateNotaireFormData) => {
    setIsLoading(true);
    try {
      await createNotaire(data);
      toast.success("Notaire créé avec succès");
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur lors de la création du notaire", {
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un notaire</DialogTitle>
          <DialogDescription>
            Créez un nouveau compte notaire. Le notaire pourra se connecter via email et code OTP.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="notaire@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nom (optionnel)</Label>
            <Input
              id="name"
              placeholder="Jean Dupont"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}








