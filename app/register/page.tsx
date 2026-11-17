import { redirect } from "next/navigation";

// Pas d'inscription publique : les comptes sont créés par l'équipe ou à l'ouverture d'un dossier
// (voir `disableSignUp` dans lib/auth.ts). L'ancienne page créait un compte administrateur.
// Normalement jamais affichée : next.config redirige déjà /register vers /client/login.
export default function RegisterPage() {
  redirect("/client/login");
}
