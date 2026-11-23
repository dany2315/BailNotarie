import { LpNav } from "@/components/lp/lp-nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function ClientLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* `lp-root` apporte les jetons du design de l'accueil ; la barre flotte
       sans réserver de hauteur, la scène de la page s'en charge. */
    <div className="lp-root flex min-h-screen flex-col bg-white">
      <LpNav overlay />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}


