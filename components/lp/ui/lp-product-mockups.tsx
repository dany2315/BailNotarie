"use client";

import * as React from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Home,
  Lock,
  MapPin,
  Mic,
  MicOff,
  PenTool,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Video,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/* =========================================================================
   Reproductions fidèles de l'interface BailNotarie, en DOM pur.
   Aucune capture d'écran : tout est vectoriel, net sur tous les écrans,
   et reste lisible une fois la scène inclinée en 3D.
   Éléments décoratifs -> aria-hidden au niveau du cadre.
   ========================================================================= */

/* ---------- Chrome d'application ------------------------------------------ */

export function AppFrame({
  url = "bailnotarie.fr/commencer",
  tone = "light",
  className,
  bodyClassName,
  children,
}: {
  url?: string;
  tone?: "light" | "dark";
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div
      aria-hidden
      className={cn(
        "overflow-hidden rounded-[20px] border backdrop-blur-xl",
        dark
          ? "border-white/12 bg-[#0d1428]/90 shadow-[0_50px_120px_-40px_rgba(2,6,23,0.9)]"
          : "border-slate-200/80 bg-white shadow-[0_40px_90px_-32px_rgba(30,58,138,0.45)]",
        className,
      )}
    >
      {/* Barre de titre */}
      <div
        className={cn(
          "flex items-center gap-3 border-b px-4 py-2.5",
          dark ? "border-white/10 bg-white/[0.04]" : "border-slate-100 bg-slate-50/80",
        )}
      >
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div
          className={cn(
            "mx-auto flex max-w-[70%] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-medium",
            dark ? "bg-white/[0.06] text-blue-100/70" : "bg-white text-slate-500 ring-1 ring-slate-200/70",
          )}
        >
          <Lock className="h-2.5 w-2.5 text-emerald-500" />
          <span className="truncate">{url}</span>
        </div>
        <div className="flex w-[52px] justify-end">
          <div className={cn("h-2.5 w-8 rounded-full", dark ? "bg-white/10" : "bg-slate-200")} />
        </div>
      </div>

      <div className={cn(dark ? "bg-transparent" : "bg-white", bodyClassName)}>{children}</div>
    </div>
  );
}

/* ---------- Petits atomes réutilisés -------------------------------------- */

function FieldRow({
  label,
  value,
  icon: Icon,
  state = "done",
  typing = false,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
  state?: "done" | "active" | "idle";
  typing?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-[12px] font-medium text-slate-700 transition-colors",
          state === "active"
            ? "border-[#4373f5] shadow-[0_0_0_3px_rgba(67,115,245,0.15)]"
            : state === "done"
              ? "border-slate-200"
              : "border-dashed border-slate-200 text-slate-400",
        )}
      >
        {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", state === "idle" ? "text-slate-300" : "text-[#4373f5]")} />}
        <span className="truncate">{value}</span>
        {typing && <span className="lp-anim-caret ml-0.5 inline-block h-3.5 w-[1.5px] bg-[#4373f5]" />}
        {state === "done" && !typing && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />}
      </div>
    </div>
  );
}

function ProgressBar({ value = 62, animated = true }: { value?: number; animated?: boolean }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eef2ff]">
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-[#4373f5] to-[#6d8ff9]",
          animated && "lp-anim-progress",
        )}
        style={animated ? undefined : { width: `${value}%` }}
      />
    </div>
  );
}

/* ---------- 1. Constitution du dossier ------------------------------------ */

export function DossierMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("relative", compact ? "p-4" : "p-5 sm:p-6")}>
      {/* Étapes */}
      <div className="mb-5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#4373f5]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3563e9]">
              Étape 2 / 5
            </span>
            <span className="text-[12px] font-semibold text-slate-800">Le bien loué</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Sauvegarde auto
          </span>
        </div>
        <ProgressBar />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <FieldRow label="Adresse du bien" value="12 rue de Rivoli, 75004 Paris" icon={MapPin} state="active" typing />
        <FieldRow label="Type de bien" value="Appartement — 3 pièces" icon={Home} />
        <FieldRow label="Surface habitable" value="68,4 m²" icon={Building2} />
        <FieldRow label="Loyer mensuel HC" value="1 450 € / mois" icon={FileText} />
      </div>

      {/* Suggestion d'adresse : détail qui « fait produit ». */}
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-[10px] text-slate-400">
          <Search className="h-3 w-3" /> Suggestions — Base Adresse Nationale
        </div>
        {["12 rue de Rivoli, 75004 Paris", "12 bis rue de Rivoli, 75004 Paris"].map((suggestion, index) => (
          <div
            key={suggestion}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-[11px]",
              index === 0 ? "bg-[#4373f5]/[0.06] font-medium text-[#3563e9]" : "text-slate-500",
            )}
          >
            <MapPin className="h-3 w-3 shrink-0" />
            {suggestion}
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-[11px] text-slate-400">Vos données sont chiffrées</span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#4373f5] px-3.5 py-2 text-[11px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(67,115,245,0.9)]">
            Continuer <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- 2. Pièces justificatives -------------------------------------- */

const DOCUMENTS = [
  { name: "Titre de propriété.pdf", size: "1,2 Mo", status: "verified" as const },
  { name: "DPE — diagnostic énergie.pdf", size: "820 Ko", status: "verified" as const },
  { name: "Pièce d'identité — bailleur.jpg", size: "640 Ko", status: "verified" as const },
  { name: "Attestation d'assurance.pdf", size: "310 Ko", status: "scanning" as const },
  { name: "Justificatifs locataire", size: "En attente", status: "pending" as const },
];

export function DocumentsMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("relative", compact ? "p-4" : "p-5 sm:p-6")}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold text-slate-800">Pièces justificatives</div>
          <div className="text-[10px] text-slate-400">4 documents sur 5 validés automatiquement</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 ring-1 ring-emerald-100">
          <ShieldCheck className="h-3 w-3" /> Chiffré
        </span>
      </div>

      {/* Zone de dépôt */}
      <div className="relative mb-3 overflow-hidden rounded-xl border border-dashed border-[#4373f5]/35 bg-[#4373f5]/[0.04] px-4 py-4 text-center">
        <div className="lp-anim-scan pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#4373f5]/25 to-transparent" />
        <Upload className="mx-auto mb-1.5 h-4 w-4 text-[#4373f5]" />
        <div className="text-[11px] font-medium text-slate-700">Déposez vos documents</div>
        <div className="text-[10px] text-slate-400">PDF, JPG ou PNG — 20 Mo max</div>
      </div>

      <div className="space-y-2">
        {DOCUMENTS.map((doc) => (
          <div
            key={doc.name}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
              doc.status === "pending" ? "border-dashed border-slate-200 bg-slate-50/60" : "border-slate-200 bg-white",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                doc.status === "verified"
                  ? "bg-emerald-50 text-emerald-600"
                  : doc.status === "scanning"
                    ? "bg-[#4373f5]/10 text-[#4373f5]"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              <FileText className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-slate-700">{doc.name}</div>
              <div className="text-[9.5px] text-slate-400">{doc.size}</div>
            </div>
            {doc.status === "verified" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-600">
                <Check className="h-2.5 w-2.5" /> Validé
              </span>
            )}
            {doc.status === "scanning" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#4373f5]/10 px-2 py-0.5 text-[9.5px] font-semibold text-[#3563e9]">
                <Sparkles className="h-2.5 w-2.5" /> Analyse…
              </span>
            )}
            {doc.status === "pending" && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-semibold text-slate-400">
                À venir
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 3. Suivi du dossier ------------------------------------------- */

const TIMELINE = [
  { title: "Dossier constitué", meta: "Aujourd'hui, 09:14", state: "done" as const },
  { title: "Pièces vérifiées", meta: "Aujourd'hui, 09:22", state: "done" as const },
  { title: "Transmis à l'étude notariale", meta: "Aujourd'hui, 09:23", state: "done" as const },
  { title: "Rédaction de l'acte authentique", meta: "En cours — Me Laurent", state: "active" as const },
  { title: "Signature en visioconférence", meta: "Créneau proposé : jeudi 14h", state: "todo" as const },
];

export function SuiviMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("relative", compact ? "p-4" : "p-5 sm:p-6")}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-[12px] font-semibold text-slate-800">Suivi de votre dossier</div>
          <div className="text-[10px] text-slate-400">Réf. BN-2026-0428 · Paris 4e</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#4373f5]/10 px-2.5 py-1 text-[10px] font-semibold text-[#3563e9]">
          <Clock className="h-3 w-3" /> J+2
        </span>
      </div>

      <ol className="relative space-y-3.5 pl-1">
        <span className="absolute left-[9px] top-2 bottom-3 w-px bg-gradient-to-b from-emerald-300 via-[#4373f5]/40 to-slate-200" />
        {TIMELINE.map((step) => (
          <li key={step.title} className="relative flex gap-3">
            <span
              className={cn(
                "relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                step.state === "done"
                  ? "bg-emerald-500 text-white"
                  : step.state === "active"
                    ? "bg-[#4373f5] text-white"
                    : "border border-slate-200 bg-white",
              )}
            >
              {step.state === "done" ? (
                <Check className="h-2.5 w-2.5" />
              ) : step.state === "active" ? (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              ) : null}
              {step.state === "active" && (
                <span className="lp-ping absolute inset-0 text-[#4373f5]" />
              )}
            </span>
            <div className="min-w-0">
              <div
                className={cn(
                  "text-[11.5px] font-semibold",
                  step.state === "todo" ? "text-slate-400" : "text-slate-800",
                )}
              >
                {step.title}
              </div>
              <div className="text-[10px] text-slate-400">{step.meta}</div>
            </div>
          </li>
        ))}
      </ol>

      {!compact && (
        <div className="mt-4 rounded-xl border border-[#4373f5]/15 bg-[#4373f5]/[0.05] p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#4373f5] shadow-sm">
              <UserRound className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-800">Me Laurent · notaire partenaire</div>
              <div className="text-[10px] text-slate-500">« Votre acte est prêt pour la signature. »</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 4. Signature en visioconférence -------------------------------- */

/* Participants de la visio.

   Deux photographies prises pendant un véritable appel vidéo — pas des
   portraits en studio : le cadrage, le regard vers l'objectif et l'arrière-plan
   de bureau sont ce qui fait qu'on lit « appel en cours » et non « photo de
   couverture ». Elles sont appelées par leur URL de diffusion, recadrées côté
   service : `crop=faces` centre la découpe sur le visage, donc le cadrage reste
   juste quelle que soit la taille demandée. `unoptimized` évite de repasser par
   l'optimiseur d'images — la vignette est déjà servie à la bonne taille, et le
   quota de transformations reste pour les visuels du site.

   Crédits : Vitaly Gariev, Unsplash, pour les deux participants. */
const CALL = {
  /** Celui qui parle : cadre principal, contour vivant, niveau sonore actif. */
  speaker: {
    name: "Me Laurent",
    role: "Étude notariale",
    src: "https://images.unsplash.com/photo-1758874384555-de68b8035c24?auto=format&fit=crop&crop=faces&w=900&h=506&q=70",
  },
  /** Celui qui écoute : incrustation, micro coupé. Il regarde l'objectif,
      comme on regarde son interlocuteur pendant un appel — un profil penché
      sur son écran aurait trahi la photographie de banque d'images. */
  viewer: {
    name: "Vous",
    src: "https://images.unsplash.com/photo-1758598497190-f609ecba227b?auto=format&fit=crop&crop=faces&w=360&h=270&q=70",
  },
};

/** Niveau sonore du participant qui parle : trois barres, décalées. */
function AudioLevel() {
  return (
    <span aria-hidden className="flex h-2.5 items-end gap-[2px]">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="lp-anim-level w-[2px] rounded-full bg-emerald-400"
          style={{ animationDelay: `${index * 0.18}s` }}
        />
      ))}
    </span>
  );
}

export function SignatureMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("relative", compact ? "p-4" : "p-5 sm:p-6")}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-800">Signature de l&apos;acte authentique</div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> En direct
        </span>
      </div>

      {/* Fenêtre visio : le notaire en grand, le propriétaire en incrustation.
          Le contour vert qui respire et le niveau sonore de l'étiquette
          désignent celui qui parle — c'est la grammaire des outils d'appel, et
          le micro coupé sur l'incrustation dit le reste. Le fond sombre reste
          sous les photos : si elles tardent ou manquent, la fenêtre garde
          l'allure d'une visio. */}
      <div className="lp-anim-speak relative mb-3 aspect-[16/9] overflow-hidden rounded-xl bg-[#0f1830]">
        <Image
          src={CALL.speaker.src}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 1024px) 90vw, 460px"
          className="object-cover"
        />
        {/* Voile haut et bas, puis vignettage : rend les incrustations lisibles
            et donne le léger assombrissement des bords d'une image de webcam. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)_100%)]"
        />

        {/* Étiquette du participant qui parle */}
        <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2 py-1 backdrop-blur-sm">
          <AudioLevel />
          <span className="text-[9.5px] font-medium text-white/95">
            {CALL.speaker.name} — {CALL.speaker.role}
          </span>
        </div>

        {/* Durée d'appel et qualité */}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 text-[8.5px] font-medium text-white/85 backdrop-blur-sm">
            <span className="h-1 w-1 rounded-full bg-red-500" />
            12:04
          </span>
          <span className="rounded-md bg-black/45 px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wide text-white/80 backdrop-blur-sm">
            HD
          </span>
        </div>

        {/* Incrustation du propriétaire. L'image est retournée : une webcam
            montre toujours son propre reflet à l'envers. */}
        <div className="absolute bottom-2.5 right-2.5 aspect-[4/3] w-[27%] overflow-hidden rounded-lg bg-[#223055] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.9)] ring-1 ring-white/25">
          <Image
            src={CALL.viewer.src}
            alt=""
            fill
            unoptimized
            sizes="140px"
            className="-scale-x-100 object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-[3px] pt-3 text-[8px] font-medium text-white"
          >
            <MicOff className="h-2 w-2 shrink-0 text-white/75" />
            {CALL.viewer.name}
          </div>
        </div>

        {/* Commandes d'appel */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
          {[Mic, Video].map((Icon, index) => (
            <span
              key={index}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/15 backdrop-blur-sm"
            >
              <Icon className="h-3 w-3" />
            </span>
          ))}
          <span className="flex h-6 items-center rounded-full bg-[#4373f5] px-2.5 text-[9px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(67,115,245,1)]">
            Signer
          </span>
        </div>
      </div>

      {/* Bandeau force exécutoire */}
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
          <FileCheck2 className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-emerald-800">Acte authentique signé</div>
          <div className="text-[10px] text-emerald-700/80">Force exécutoire immédiate · copie envoyée par e-mail</div>
        </div>
        <PenTool className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600" />
      </div>
    </div>
  );
}

/* ---------- 5. Espace client (tableau de bord) ----------------------------- */

export function DashboardMockup() {
  const stats = [
    { label: "Baux actifs", value: "3", tone: "blue" as const },
    { label: "En cours", value: "1", tone: "amber" as const },
    { label: "Biens", value: "4", tone: "slate" as const },
  ];

  return (
    <div aria-hidden className="flex min-h-[320px]">
      {/* Barre latérale */}
      <div className="hidden w-[132px] shrink-0 border-r border-slate-100 bg-slate-50/70 p-3 sm:block">
        <div className="mb-4 flex items-center gap-1.5 px-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#4373f5] text-[10px] font-bold text-white">
            BN
          </span>
          <span className="text-[10px] font-semibold text-slate-700">Espace client</span>
        </div>
        {[
          { label: "Tableau de bord", icon: Home, active: true },
          { label: "Mes baux", icon: FileText },
          { label: "Mes biens", icon: Building2 },
          { label: "Documents", icon: FileCheck2 },
        ].map((item) => (
          <div
            key={item.label}
            className={cn(
              "mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium",
              item.active ? "bg-white text-[#3563e9] shadow-sm ring-1 ring-slate-200/70" : "text-slate-500",
            )}
          >
            <item.icon className="h-3 w-3" />
            {item.label}
          </div>
        ))}
      </div>

      {/* Contenu */}
      <div className="min-w-0 flex-1 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold text-slate-800">Bonjour Camille 👋</div>
            <div className="text-[10px] text-slate-400">Votre dossier avance bien</div>
          </div>
          <span className="rounded-lg bg-[#4373f5] px-2.5 py-1.5 text-[10px] font-semibold text-white">
            Nouveau bail
          </span>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div
                className={cn(
                  "text-[18px] font-bold leading-none",
                  stat.tone === "blue" ? "text-[#3563e9]" : stat.tone === "amber" ? "text-amber-500" : "text-slate-800",
                )}
              >
                {stat.value}
              </div>
              <div className="mt-1 text-[9.5px] text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-500">
            Baux en cours
          </div>
          {[
            { addr: "12 rue de Rivoli, Paris 4e", status: "Chez le notaire", tone: "blue" },
            { addr: "8 cours Vitton, Lyon 6e", status: "Signé", tone: "green" },
          ].map((row) => (
            <div key={row.addr} className="flex items-center gap-2 border-b border-slate-50 px-3 py-2.5 last:border-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <Building2 className="h-3 w-3" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-slate-700">{row.addr}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                  row.tone === "blue" ? "bg-[#4373f5]/10 text-[#3563e9]" : "bg-emerald-50 text-emerald-600",
                )}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Cartes flottantes de la scène héros ---------------------------- */

export function FloatingNotification() {
  return (
    <div
      aria-hidden
      className="w-[236px] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_24px_60px_-24px_rgba(30,58,138,0.55)] backdrop-blur-xl"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[11.5px] font-semibold text-slate-900">Dossier transmis au notaire</div>
          <div className="text-[10px] text-slate-500">Étude partenaire · il y a 2 min</div>
        </div>
      </div>
      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
      </div>
    </div>
  );
}

export function FloatingPriceCard() {
  return (
    <div
      aria-hidden
      className="w-[190px] rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-[0_24px_60px_-24px_rgba(30,58,138,0.55)] backdrop-blur-xl"
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Frais de dossier</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[26px] font-bold leading-none tracking-tight text-slate-900">39,90</span>
        <span className="text-[13px] font-semibold text-slate-500">€ TTC</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
        <ShieldCheck className="h-3 w-3" /> Remboursé si non abouti*
      </div>
    </div>
  );
}

export function FloatingExecutoireCard() {
  return (
    <div
      aria-hidden
      className="w-[212px] rounded-2xl border border-[#4373f5]/20 bg-gradient-to-br from-[#4373f5] to-[#3563e9] p-3.5 text-white shadow-[0_28px_60px_-24px_rgba(53,99,233,0.9)]"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
          <ShieldCheck className="h-3.5 w-3.5" />
        </span>
        <div className="text-[11.5px] font-semibold">Force exécutoire</div>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-blue-50/90">
        Acte authentique : recouvrement sans jugement préalable.
      </p>
    </div>
  );
}

export function FloatingDelayCard() {
  return (
    <div
      aria-hidden
      className="w-[176px] rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-[0_24px_60px_-24px_rgba(30,58,138,0.55)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4373f5]/10 text-[#4373f5]">
          <Clock className="h-3.5 w-3.5" />
        </span>
        <div>
          <div className="text-[13px] font-bold leading-none text-slate-900">1 semaine</div>
          <div className="text-[9.5px] text-slate-500">délai moyen</div>
        </div>
      </div>
    </div>
  );
}
