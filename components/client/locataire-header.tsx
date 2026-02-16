import { LocataireNavigation } from "./locataire-navigation";

interface LocataireHeaderProps {
  userId: string;
  userName?: string | null;
  userEmail: string;
}

export function LocataireHeader({ userId, userName, userEmail }: LocataireHeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col">
        
        <LocataireNavigation />
      </div>
    </header>
  );
}








