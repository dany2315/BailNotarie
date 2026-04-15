import { CheckCircle, Phone, Clock } from "lucide-react";
import { BAIL_STATUS_COLORS } from "@/lib/utils/bails-labels";

interface NotaireHeaderProps {
  userName?: string | null;
  userEmail: string;
  stats: {
    aContacter: number;
    enTraitement: number;
    signes: number;
  };
}

export function NotaireHeader({ userName, userEmail, stats }: NotaireHeaderProps) {
  const orangeColor = BAIL_STATUS_COLORS.READY_FOR_NOTARY;
  const blueColor = BAIL_STATUS_COLORS.CLIENT_CONTACTED;
  const greenColor = BAIL_STATUS_COLORS.SIGNED;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-6 pl-10 lg:pl-0">
          <div>
            <h1 className="text-lg font-semibold">
              {userName || "Notaire"}
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${orangeColor.badge}`}>
            <Phone className="h-4 w-4" />
            <span className="text-sm font-semibold">{stats.aContacter}</span>
            <span className="text-xs opacity-75 hidden sm:inline">à contacter</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${blueColor.badge}`}>
            <Clock className="h-4 w-4" />
            <span className="text-sm font-semibold">{stats.enTraitement}</span>
            <span className="text-xs opacity-75 hidden sm:inline">en traitement</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${greenColor.badge}`}>
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">{stats.signes}</span>
            <span className="text-xs opacity-75 hidden sm:inline">signés</span>
          </div>
        </div>
      </div>
    </header>
  );
}
