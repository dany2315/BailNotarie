import { redirect } from "next/navigation";

// Pas d'inscription publique : les comptes sont créés par l'équipe ou à l'ouverture d'un dossier
// (voir `disableSignUp` dans lib/auth.ts). L'ancienne page créait un compte administrateur.
export default function RegisterPage() {
  redirect("/login");
}
