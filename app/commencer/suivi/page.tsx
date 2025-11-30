"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, CheckCircle2, MailCheck } from "lucide-react";
import { getRequestStatusByEmail } from "@/lib/actions/start";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const emailSchema = z.object({
  email: z.string().email("Email invalide"),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function SuiviPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      const result = await getRequestStatusByEmail(data.email);
      if (result.success && result.found) {
        setEmailSent(true);
        setSubmittedEmail(data.email);
        toast.success(result.message || "Un email a été envoyé avec les informations de suivi");
        form.reset();
      } else {
        toast.error(result.message || "Aucune demande trouvée pour cet email");
        setEmailSent(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur s'est produite");
      setEmailSent(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="w-full max-w-2xl space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl font-bold">
                Suivi de votre demande
              </CardTitle>
              <CardDescription className="text-base md:text-lg">
                Entrez votre adresse email pour recevoir les informations de suivi de votre demande de bail notarié par email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold">
                    Email *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      className="pl-10"
                      {...form.register("email")}
                      disabled={isLoading || emailSent}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Pour des raisons de sécurité, les informations de suivi seront envoyées uniquement à l'adresse email associée à votre demande.
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || emailSent}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : emailSent ? (
                    <>
                      <MailCheck className="mr-2 h-4 w-4" />
                      Email envoyé
                    </>
                  ) : (
                    "Recevoir le suivi par email"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {emailSent && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <CardTitle className="text-green-800">
                      Email envoyé avec succès
                    </CardTitle>
                    <CardDescription className="text-green-700">
                      Les informations de suivi ont été envoyées à {submittedEmail}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>✅ Vérifiez votre boîte de réception</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Un email contenant toutes les informations sur l'état d'avancement de votre demande de bail notarié a été envoyé à l'adresse <strong>{submittedEmail}</strong>.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Si vous ne recevez pas l'email dans les prochaines minutes, vérifiez votre dossier de courrier indésirable (spam).
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setSubmittedEmail("");
                    form.reset();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Demander un autre suivi
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

