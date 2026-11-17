import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { getCurrentUser } from "@/lib/auth-helpers"; // ton helper
import { Role } from "@prisma/client";
import { NO_INDEX_METADATA } from "@/lib/seo/no-index";

export const metadata = NO_INDEX_METADATA;

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


// ❗ Pas de "use client" : layout = server component
export default async function InterfaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if(user.role !== Role.ADMINISTRATEUR) {
    redirect("/login");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {children}
      </div>
    </AppShell>
  );
}
