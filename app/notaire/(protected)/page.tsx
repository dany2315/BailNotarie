import { redirect } from "next/navigation";

/** L'espace notaire n'a qu'un écran : les dossiers. */
export default function NotaireHomePage() {
  redirect("/notaire/dossiers");
}
