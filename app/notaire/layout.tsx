import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { NotaireSidebar } from "@/components/notaire/notaire-sidebar";

export default async function NotaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ne pas protéger la page de login
  // La protection se fait dans les pages individuelles
  
  return (
    <>
      {children}
    </>
  );
}

