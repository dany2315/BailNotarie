import { NO_INDEX_METADATA } from "@/lib/seo/no-index";

export const metadata = NO_INDEX_METADATA;

/** Espace notaire : la page de connexion n'est pas protégée ; le reste l'est dans (protected)/layout.tsx. */
export default function NotaireLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
