"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail, Phone } from "lucide-react";
import { createLead } from "@/lib/actions/leads";
import { isValidPhoneNumberSafe } from "@/lib/utils/phone-validation";

const leadFormSchema = z.object({
  contactType: z.enum(["email", "phone"]),
  email: z.string().optional(),
  phone: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.contactType === "email") {
    if (!data.email || data.email.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'email est requis",
        path: ["email"],
      });
    } else {
      const emailSchema = z.string().email("Email invalide");
      const result = emailSchema.safeParse(data.email.toLowerCase().trim());
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email invalide",
          path: ["email"],
        });
      }
    }
  } else if (data.contactType === "phone") {
    if (!data.phone || data.phone.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le numéro de téléphone est requis",
        path: ["phone"],
      });
    } else if (!isValidPhoneNumberSafe(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Numéro de téléphone invalide",
        path: ["phone"],
      });
    }
  }
}).transform((data) => ({
  ...data,
  email: data.email ? data.email.toLowerCase().trim() : undefined,
}));

type LeadFormData = z.infer<typeof leadFormSchema>;

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema as any),
    defaultValues: {
      contactType: "email",
      email: "",
      phone: "",
    },
  });

  const contactType = form.watch("contactType");

  const handleSubmit = async (data: LeadFormData) => {
    setIsLoading(true);
    try {
      const result = await createLead(data);
      
      if (data.contactType === "email") {
        if (result.emailSent === false) {
          toast.warning("Lead créé avec succès, mais l'email n'a pas pu être envoyé. Le lien de conversion est disponible dans les détails du client.", {
            duration: 7000,
          });
        } else {
          toast.success("Lead créé avec succès. Un email de conversion a été envoyé.");
        }
      } else {
        toast.success("Lead créé avec succès. Le lien de conversion est disponible dans les détails du client.");
      }
      
      form.reset({
        contactType: "email",
        email: "",
        phone: "",
      });
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      // Afficher l'erreur dans le toast
      const errorMessage = error.message || "Erreur lors de la création du lead";
      toast.error(errorMessage, {
        duration: 5000,
      });
      
      // Si l'erreur concerne l'email ou le téléphone, définir l'erreur sur le champ approprié
      if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("téléphone") || errorMessage.toLowerCase().includes("existe déjà")) {
        if (data.contactType === "email") {
          form.setError("email", {
            type: "manual",
            message: errorMessage,
          });
        } else {
          form.setError("phone", {
            type: "manual",
            message: errorMessage,
          });
        }
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
            Choisissez comment contacter le prospect. Si vous choisissez l'email, il recevra automatiquement un email avec un lien de conversion.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-3">
            <Label>Type de contact *</Label>
            <Controller
              name="contactType"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="email-option"
                    className={
                      `flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent cursor-pointer ${
                        field.value === "email" ? "bg-accent" : ""
                      }`
                    }
                  >
                    <RadioGroupItem value="email" id="email-option" className="mb-2 hidden" /> 
                    <Mail className="h-5 w-5 mb-1" />
                    <span className="font-medium">Email</span>
                  </Label>
                  <Label
                    htmlFor="phone-option"
                    className={
                      `flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-accent cursor-pointer ${
                        field.value === "phone" ? "bg-accent" : ""
                      }`
                    }
                  >
                    <RadioGroupItem value="phone" id="phone-option" className="mb-2 hidden" />
                    <Phone className="h-5 w-5 mb-1" />
                    <span className="font-medium">Téléphone</span>
                  </Label>
                </RadioGroup>
              )}
            />
            {form.formState.errors.contactType && (
              <p className="text-sm text-destructive">
                {form.formState.errors.contactType.message}
              </p>
            )}
          </div>

          {contactType === "email" ? (
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
          ) : (
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
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
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          )}

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

