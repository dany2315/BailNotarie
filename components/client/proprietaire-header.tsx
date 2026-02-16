import { ProprietaireNavigation } from "./proprietaire-navigation";

interface ProprietaireHeaderProps {
  userId: string;
  userName?: string | null;
  userEmail: string;
}

export function ProprietaireHeader({ userId, userName, userEmail }: ProprietaireHeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col">
        <ProprietaireNavigation />
      </div>
    </header>
  );
}








