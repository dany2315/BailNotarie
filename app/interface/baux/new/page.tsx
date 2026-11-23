import Link from "next/link";
import { ChevronRight, UserCheck, UserPlus } from "lucide-react";

/**
 * Point d'entrée unique de « Nouveau dossier » (accueil et liste des dossiers) : on demande d'abord
 * si le propriétaire est déjà client, puis on ouvre le bon formulaire.
 */
const CHOICES = [
  {
    href: "/interface/clients/new",
    icon: UserPlus,
    title: "Nouveau propriétaire",
    text: "Le propriétaire n'est pas encore client : créer en une fois le propriétaire, le bien, le bail et, si vous l'avez, le locataire.",
  },
  {
    href: "/interface/baux/new/existant",
    icon: UserCheck,
    title: "Propriétaire déjà client",
    text: "Le propriétaire et son bien sont déjà enregistrés : créer un nouveau bail sur ce bien.",
  },
];

export default function NewDossierPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Nouveau dossier</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Le propriétaire est-il déjà client ?</p>
      </div>

      <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
        {CHOICES.map(({ href, icon: Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-lg border bg-card p-5 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-2">
              <Icon className="size-5 text-primary" aria-hidden />
              <span className="font-semibold">{title}</span>
              <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">{text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
