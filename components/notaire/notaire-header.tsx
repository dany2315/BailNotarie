import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { FileText, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DossierNotaireAssignment } from "@prisma/client";

interface NotaireHeaderProps {
  userId: string;
  userName?: string | null;
  userEmail: string;
}

export async function NotaireHeader({ userId, userName, userEmail }: NotaireHeaderProps) {
  const dossiers = await getDossiersByNotaire(userId);

  const stats = {
    total: dossiers.length,
    avecBail: dossiers.filter((d: DossierNotaireAssignment) => d.bailId).length,
    sansBail: dossiers.filter((d: DossierNotaireAssignment) => !d.bailId).length,
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
            <span className="text-sm font-medium">{stats.total}</span>
            <span className="text-xs text-muted-foreground">dossiers</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">{stats.avecBail}</span>
            <span className="text-xs text-muted-foreground">avec bail</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-50 dark:bg-orange-950/20">
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">{stats.sansBail}</span>
            <span className="text-xs text-muted-foreground">en attente</span>
          </div>
        </div>
      </div>
    </header>
  );
}

