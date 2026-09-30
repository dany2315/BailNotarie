"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, MailCheck, Search, ShieldCheck } from "lucide-react";
import { getRequestStatusByEmail } from "@/lib/actions/start";
import { toast } from "sonner";

import { MicroLabel, PrimaryAction, QuietAction, Surface } from "@/components/client-v2/owner-ui";
import { IntakeHero, IntakeNote, IntakeShell } from "@/components/intake/intake-state";

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

  // Une fois l'email parti, la page n'a plus de formulaire à montrer : elle
  // confirme, et propose le seul geste restant.
  if (emailSent) {
    return (
      <IntakeShell tone="success">
        <div className="space-y-7">
          <IntakeHero
            tone="success"
            icon={MailCheck}
            kicker="Suivi envoyé"
            title="C'est parti dans votre boîte"
            description={
              <>
                Tout l&apos;état d&apos;avancement de votre demande a été envoyé à{" "}
                <span className="font-semibold text-slate-700">{submittedEmail}</span>.
              </>
            }
          />

          <IntakeNote icon={Search} tone="success">
            Rien au bout de quelques minutes ? Regardez dans vos courriers indésirables.
          </IntakeNote>

          <div className="flex justify-center">
            <QuietAction
              className="py-3"
              onClick={() => {
                setEmailSent(false);
                setSubmittedEmail("");
                form.reset();
              }}
            >
              Demander un autre suivi
            </QuietAction>
          </div>
        </div>
      </IntakeShell>
    );
  }

  return (
    <IntakeShell tone="info">
      <div className="space-y-7">
        <IntakeHero
          icon={Search}
          kicker="Suivi de demande"
          title="Où en est mon dossier ?"
          description="Entrez votre adresse email : nous vous envoyons l'état d'avancement de votre demande de bail notarié."
        />

        <Surface tone="raised" className="p-5 sm:p-6">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <MicroLabel className="mb-2">Votre email</MicroLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[14px] text-slate-800 outline-none transition-shadow placeholder:text-slate-400 focus:border-[#4373f5] focus:shadow-[0_0_0_3px_rgba(67,115,245,0.15)] disabled:opacity-60"
                  {...form.register("email")}
                  disabled={isLoading || emailSent}
                />
              </div>
              {form.formState.errors.email && (
                <p className="mt-2 text-[12.5px] font-medium text-red-600">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <PrimaryAction type="submit" className="w-full py-3.5" disabled={isLoading || emailSent}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                <>
                  Recevoir le suivi par email
                  <Mail className="h-4 w-4" />
                </>
              )}
            </PrimaryAction>
          </form>
        </Surface>

        <IntakeNote icon={ShieldCheck}>
          Pour des raisons de sécurité, le suivi n&apos;est envoyé qu&apos;à l&apos;adresse email
          associée à la demande.
        </IntakeNote>
      </div>
    </IntakeShell>
  );
}
