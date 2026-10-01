"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhoneButton } from "@/components/ui/phone-button";
import { AlertCircle, CheckCircle, Clock, Mail, Phone, Send } from "lucide-react";
import { sendMail } from "@/app/action";
import { contactFormSchema } from "@/lib/zod/contact";
import { PhoneInput } from "@/components/ui/phone-input";
import { Controller } from "react-hook-form";
import { cn } from "@/lib/utils";

/* =========================================================================
   Formulaire de contact.

   Dessiné dans le vocabulaire du reste de la page : surfaces blanches posées
   sur le fond du site, anneau froid d'un pixel, ombre bleutée diffuse,
   micro-libellés en capitales, un seul accent bleu. C'était la dernière
   section à parler une autre langue que les autres.

   Deux colonnes à partir de `lg` : le formulaire occupe la largeur utile, la
   prise de contact directe tient dans une colonne étroite qui reste à hauteur
   d'œil pendant la saisie. Sous `lg`, tout s'empile, le formulaire d'abord.

   Les champs font 16 px sur téléphone. En dessous, les navigateurs mobiles
   zooment à la mise au point et la page part de travers.

   La logique n'a pas bougé : même schéma, même `useForm`, même envoi par
   `sendMail`, mêmes identifiants de champ, mêmes messages. Seule la mise en
   forme est réécrite.
   ========================================================================= */

const formSchema = contactFormSchema;

type FormData = z.infer<typeof formSchema>;

/* ---------- Vocabulaire visuel partagé ----------------------------------- */

const SURFACE =
  "rounded-[26px] border border-slate-200/70 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04),0_30px_70px_-42px_rgba(30,58,138,0.4)]";

const LIBELLE = "text-[11.5px] font-semibold uppercase tracking-[0.1em] text-slate-500";

/* 16 px sur téléphone : en dessous, la mise au point déclenche un zoom. Le
   palier est repris en `md` parce que le champ de base porte `md:text-sm`, qui
   l'emporterait sinon sur un simple `sm`. */
const CHAMP =
  "h-12 w-full rounded-xl border-slate-200 bg-white px-3.5 text-base text-slate-900 shadow-none " +
  "transition-[border-color,box-shadow] placeholder:text-slate-400 " +
  "focus-visible:border-[#4373f5]/50 focus-visible:ring-4 focus-visible:ring-[#4373f5]/10 md:text-[15px]";

/* Le champ téléphone est bâti par `react-phone-number-input` : la classe passée
   habille son conteneur, pas la saisie. C'est donc le conteneur qui devient la
   boîte du champ — avec la bague au `focus-within`, puisque le focus va à un
   enfant — et la saisie à l'intérieur se fait transparente. */
const CHAMP_TEL =
  "flex h-12 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-none " +
  "transition-[border-color,box-shadow] " +
  "focus-within:border-[#4373f5]/50 focus-within:ring-4 focus-within:ring-[#4373f5]/10 " +
  "[&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:border-0 " +
  "[&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:p-0 [&_.PhoneInputInput]:text-base " +
  "[&_.PhoneInputInput]:text-slate-900 [&_.PhoneInputInput]:outline-none " +
  "[&_.PhoneInputInput]:placeholder:text-slate-400 md:[&_.PhoneInputInput]:text-[15px] " +
  "[&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountrySelect]:cursor-pointer";

/** Un champ : son libellé, son contrôle, et l'erreur qui le concerne. */
function Champ({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor} className={LIBELLE}>
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-red-600">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

/** Une façon de joindre l'équipe : le moyen, sa valeur, sa disponibilité. */
function Voie({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  onClick,
}: {
  icon: React.ElementType;
  tone: "emerald" | "blue";
  label: string;
  value: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <li className="flex items-start gap-3.5">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-[#4373f5]/10 text-[#3563e9]",
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={LIBELLE}>{label}</p>
        <button
          type="button"
          onClick={onClick}
          className="mt-0.5 block max-w-full truncate text-[15px] font-semibold text-slate-900 transition-colors hover:text-[#3563e9]"
        >
          {value}
        </button>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-slate-500">
          <Clock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
          {hint}
        </p>
      </div>
    </li>
  );
}

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    const res = await sendMail(data);

    if (res.success) {
      setIsSubmitted(true);
      reset();
      setIsLoading(false);
      setTimeout(() => setIsSubmitted(false), 10000);
    } else {
      alert(res.error || "Une erreur est survenue lors de l'envoi.");
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className={cn(SURFACE, "mx-auto max-w-2xl px-6 py-12 text-center sm:px-12 sm:py-16")}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CheckCircle className="h-7 w-7" aria-hidden />
        </span>
        <h3 className="lp-title lp-balance mt-6 text-2xl font-bold text-slate-900 sm:text-[1.75rem]">
          Demande envoyée avec succès !
        </h3>
        <p className="lp-balance mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
          Nous avons bien reçu votre demande. Notre équipe vous contactera dans les plus brefs délais
          pour discuter de votre projet de bail notarié.
        </p>
        <p className="mt-5 text-[13px] text-slate-500">
          Vous recevrez également un email de confirmation à l&apos;adresse indiquée.
        </p>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8 xl:gap-10">
      {/* ---------- Formulaire ---------- */}
      <div className={cn(SURFACE, "min-w-0 p-6 sm:p-8 lg:p-10")}>
        <h3 className="lp-title text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Vous avez des questions ?
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Champ label="Prénom *" htmlFor="firstName" error={errors.firstName?.message}>
              <Input id="firstName" {...register("firstName")} className={CHAMP} placeholder="Votre prénom" />
            </Champ>
            <Champ label="Nom *" htmlFor="lastName" error={errors.lastName?.message}>
              <Input id="lastName" {...register("lastName")} className={CHAMP} placeholder="Votre nom" />
            </Champ>
          </div>

          <Champ label="Email *" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className={CHAMP}
              placeholder="votre@email.com"
            />
          </Champ>

          <Champ label="Téléphone *" htmlFor="phone" error={errors.phone?.message}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  id="phone"
                  value={field.value || undefined}
                  onChange={field.onChange}
                  defaultCountry="FR"
                  international
                  countryCallingCodeEditable={false}
                  placeholder="Numéro de téléphone"
                  className={CHAMP_TEL}
                />
              )}
            />
          </Champ>

          <Champ label="Message *" htmlFor="message" error={errors.message?.message}>
            <Textarea
              id="message"
              {...register("message")}
              rows={4}
              className={cn(CHAMP, "h-auto min-h-[7.5rem] py-3 leading-relaxed")}
              placeholder="Décrivez votre projet (type de bail, nombre de locataires, etc.)"
            />
          </Champ>

          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              "group/cta relative h-12 w-full overflow-hidden rounded-xl",
              "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-[15px] font-semibold text-white",
              "shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_14px_34px_-14px_rgba(53,99,233,0.9)]",
              "transition-transform duration-200 hover:-translate-y-0.5 hover:from-[#5b85f7] hover:to-[#3563e9]",
              "disabled:translate-y-0 disabled:opacity-70",
            )}
          >
            {/* Reflet qui balaie le bouton au survol, comme le CTA du hero. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.4)_50%,transparent_62%)] transition-transform duration-700 group-hover/cta:translate-x-full"
            />
            <span className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                "Envoi en cours..."
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden />
                  Envoyer ma demande
                </>
              )}
            </span>
          </Button>

          <p className="text-center text-[12px] leading-relaxed text-slate-500">
            En soumettant ce formulaire, vous acceptez d&apos;être contacté par notre équipe
            concernant votre demande de bail notarié.
          </p>
        </form>
      </div>

      {/* ---------- Prise de contact directe ----------
          Surface teintée plutôt que blanche : la colonne se distingue du
          formulaire sans ouvrir une seconde zone de saisie. Elle reste à
          hauteur d'œil pendant qu'on remplit les champs. */}
      <aside
        className={cn(
          "min-w-0 rounded-[26px] border border-[#4373f5]/15 bg-[#4373f5]/[0.045] p-6 sm:p-7",
          "lg:sticky lg:top-24",
        )}
      >
        <h3 className="lp-title text-[17px] font-bold tracking-tight text-slate-900">
          Contactez-nous directement
        </h3>

        <ul className="mt-6 space-y-5">
          <Voie
            icon={Phone}
            tone="emerald"
            label="Téléphone"
            value="07 49 38 77 56"
            hint="Lun-Ven 9h-18h"
            onClick={() => window.open("tel:0749387756", "_blank")}
          />
          <Voie
            icon={Mail}
            tone="blue"
            label="Email"
            value="contact@bailnotarie.fr"
            hint="Réponse sous 24h"
            onClick={() => window.open("mailto:contact@bailnotarie.fr", "_blank")}
          />
        </ul>

        <div className="mt-7 border-t border-[#4373f5]/12 pt-6">
          <PhoneButton
            phoneNumber="07 49 38 77 56"
            className="h-12 w-full cursor-pointer rounded-xl bg-white text-[15px] font-semibold text-[#3563e9] shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_28px_-16px_rgba(30,58,138,0.4)] ring-1 ring-[#4373f5]/20 transition-colors hover:bg-white hover:text-[#2f58d4]"
          />
        </div>
      </aside>
    </div>
  );
}
