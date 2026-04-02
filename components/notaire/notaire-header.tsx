import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { FileText, CheckCircle, Phone, Settings2 } from "lucide-react";
import { DOSSIER_TAB_STATUSES } from "@/lib/utils/bails-labels";

interface NotaireHeaderProps {
  userId: string;
  userName?: string | null;
  userEmail: string;
}

export async function NotaireHeader({ userId, userName, userEmail }: NotaireHeaderProps) {
  const dossiers = await getDossiersByNotaire(userId);

  const getBailStatus = (d: any) => d.bail?.status || "READY_FOR_NOTARY";

  const stats = {
    enCours: dossiers.filter((d: any) => DOSSIER_TAB_STATUSES.en_cours.includes(getBailStatus(d))).length,
    aContacter: dossiers.filter((d: any) => getBailStatus(d) === "READY_FOR_NOTARY").length,
    signes: dossiers.filter((d: any) => getBailStatus(d) === "SIGNED").length,
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold">
              {userName || "Notaire"}
            </h1>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{stats.enCours}</span>
            <span className="text-xs text-muted-foreground">en cours</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-50 dark:bg-orange-950/20">
            <Phone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">{stats.aContacter}</span>
            <span className="text-xs text-muted-foreground">à contacter</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">{stats.signes}</span>
            <span className="text-xs text-muted-foreground">signés</span>
          </div>
        </div>
      </div>
    </header>
  );
}
