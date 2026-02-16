import { CompletionStatus } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CompletionStatusGuardProps {
  completionStatus: CompletionStatus;
  informationsPath: string;
  children: React.ReactNode;
}

export function CompletionStatusGuard({ 
  completionStatus, 
  informationsPath, 
  children 
}: CompletionStatusGuardProps) {
  // Autoriser seulement si le statut est PENDING_CHECK ou COMPLETED
  const isAllowed = completionStatus === CompletionStatus.PENDING_CHECK || 
                    completionStatus === CompletionStatus.COMPLETED;

  if (isAllowed) {
    return <>{children}</>;
  }

  const statusMessages: Record<CompletionStatus, { title: string; description: string }> = {
    NOT_STARTED: {
      title: "Vérification des données requise",
      description: "Vous devez compléter vos informations personnelles et les soumettre à vérification avant de pouvoir créer un bien ou un bail.",
    },
    PARTIAL: {
      title: "Vérification des données requise",
      description: "Veuillez compléter toutes vos informations personnelles et les soumettre à vérification avant de pouvoir créer un bien ou un bail.",
    },
    PENDING_CHECK: {
      title: "",
      description: "",
    },
    COMPLETED: {
      title: "",
      description: "",
    },
  };

  const message = statusMessages[completionStatus];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-orange-900 dark:text-orange-100">
                {message.title}
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300 mt-1">
                {message.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={informationsPath} className="flex-1">
              <Button className="w-full" size="lg">
                Compléter mes informations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/client/proprietaire">
              <Button variant="outline" className="w-full sm:w-auto" size="lg">
                Retour au dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





