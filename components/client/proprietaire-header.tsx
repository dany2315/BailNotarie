interface ProprietaireHeaderProps {
  userId: string;
  userName?: string | null;
  userEmail: string;
}

export function ProprietaireHeader({ userId, userName, userEmail }: ProprietaireHeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold">
              {userName || "Propriétaire"}
            </h1>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
      </div>
    </header>
  );
}








