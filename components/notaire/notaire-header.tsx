interface NotaireHeaderProps {
  userName?: string | null;
  userEmail: string;
}

/** En-tête de l'espace notaire : qui est connecté (les compteurs sont dans la liste des dossiers). */
export function NotaireHeader({ userName, userEmail }: NotaireHeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        <div className="min-w-0 pl-10 lg:pl-0">
          <p className="truncate text-[15px] font-semibold leading-tight">{userName || "Notaire"}</p>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{userEmail}</p>
        </div>
      </div>
    </header>
  );
}
