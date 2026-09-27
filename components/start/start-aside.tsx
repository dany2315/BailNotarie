"use client";

import Link from "next/link";
import Image from "next/image";
import { FileText, Inbox, PenTool, Send, ShieldCheck, Sparkles, Star, Timer } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SectionLabel } from "@/components/lp/ui/lp-primitives";

/* =========================================================================
   Colonne éditoriale de la page « Commencer ».

   Elle accompagne le formulaire au lieu de le décorer : à l'étape de l'email
   elle dit ce qui va se passer et ce que ça coûte, à l'étape du code elle
   répond aux deux questions qu'on se pose devant une boîte mail vide — où est
   le message, et combien de temps ai-je. Le vocabulaire visuel est celui de
   l'accueil : même puce de section, même titre, mêmes accents.
   ========================================================================= */

const AVATARS = [
  "https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face",
  "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face",
  "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face",
];

const STEPS = [
  { icon: FileText, title: "Vous remplissez votre dossier", text: "Formulaire guidé, sauvegarde automatique, pièces déposées en ligne." },
  { icon: Send, title: "Nous le transmettons au notaire", text: "Vérification, rédaction de l'acte, suivi horodaté à chaque étape." },
  { icon: PenTool, title: "Vous signez en visioconférence", text: "Acte authentique, force exécutoire immédiate, copie par e-mail." },
];

const TIPS = [
  { icon: Inbox, title: "Rien reçu ?", text: "Le message arrive en quelques secondes. Pensez aux courriers indésirables." },
  { icon: Timer, title: "Dix minutes", text: "Passé ce délai, un nouveau code s'obtient en un clic." },
  { icon: ShieldCheck, title: "Sans mot de passe", text: "Le code à usage unique remplace le mot de passe, et rien n'est à retenir." },
];

export function StartHeading({ step }: { step: "email" | "otp" }) {
  const otp = step === "otp";
  return (
    <div className="lp-enter-up text-center lg:text-left">
      <SectionLabel icon={otp ? ShieldCheck : FileText}>
        {otp ? "Vérification" : "Constitution du dossier"}
      </SectionLabel>
      <h1 className="lp-title lp-balance mt-5 text-[2.1rem] font-bold leading-[1.08] text-slate-900 sm:text-5xl lg:text-[3.25rem]">
        {otp ? (
          <>
            Un code vient de <span className="lp-gradient-text">partir</span>
          </>
        ) : (
          <>
            Votre bail notarié <span className="lp-gradient-text">commence ici</span>
          </>
        )}
      </h1>
      <p className="lp-balance mx-auto mt-4 max-w-xl text-[16.5px] leading-relaxed text-slate-600 lg:mx-0 sm:text-lg">
        {otp
          ? "Saisissez les six chiffres reçus par e-mail : ils ouvrent votre espace et votre dossier reprend exactement où il en était."
          : "Votre e-mail suffit pour ouvrir le dossier. Tout se fait en ligne, et la signature a lieu à distance avec un notaire partenaire."}
      </p>
    </div>
  );
}

export function StartPoints({ step }: { step: "email" | "otp" }) {
  const items = step === "otp" ? TIPS : STEPS;

  return (
    <div style={{ ["--lp-delay" as string]: "0.16s" }} className="lp-enter-up">
      <ol className="space-y-4">
        {items.map((item, index) => (
          <li key={item.title} className="flex gap-3.5">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#3563e9] shadow-[0_10px_24px_-14px_rgba(30,58,138,0.9)] ring-1 ring-slate-900/[0.06]">
              <item.icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 pt-0.5 text-left">
              <div className="text-[15px] font-semibold text-slate-900">
                {step === "otp" ? item.title : `${index + 1}. ${item.title}`}
              </div>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-600">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {step === "email" && (
        <>
          <div className="mt-7 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-[13.5px] leading-snug text-emerald-900">
              <strong className="font-semibold">39,90 € TTC de frais de dossier</strong>, remboursés si le dossier
              n&apos;aboutit pas*. Les émoluments du notaire sont réglés séparément, au tarif de l&apos;État.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-900/[0.05]">
              <FcGoogle className="h-4 w-4" />
              <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
              <span className="text-[13px] font-semibold text-slate-800">4,9/5</span>
            </span>
            <span className="flex -space-x-2">
              {AVATARS.map((src) => (
                <span key={src} className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-white">
                  <Image src={src} alt="" width={28} height={28} className="h-full w-full object-cover" unoptimized />
                </span>
              ))}
            </span>
            <span className="text-[13px] text-slate-600">
              <strong className="font-semibold text-slate-900">+ de 200 propriétaires</strong> nous font confiance
            </span>
          </div>

          <p className="mt-5 text-center text-[12px] text-slate-400 lg:text-left">
            *Sous conditions, voir{" "}
            <Link href="/cgv" className="underline underline-offset-2 hover:text-slate-600">
              CGV
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
