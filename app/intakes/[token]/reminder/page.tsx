import { getIntakeLinkByToken } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default async function IntakeReminderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const intakeLink = await getIntakeLinkByToken(resolvedParams.token);

  if (!intakeLink) {
    notFound();
  }

  // Si le formulaire est déjà soumis, rediriger vers la page de succès
  if (intakeLink.status === "SUBMITTED") {
    return (
      <div className="min-h-screen bg-background">
        {/* Header discret avec logo */}
        <header className="border-b border-border/40 py-4 px-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-center">
              <Image
                src="/logoSans.png"
                alt="BailNotarie"
                width={120}
                height={36}
                className="h-8 w-auto opacity-80"
                priority
              />
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4">
                    <CheckCircle2 className="size-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              <h1 className="text-2xl font-bold">Formulaire déjà soumis</h1>
              <p className="text-muted-foreground">
                Ce formulaire a déjà été soumis avec succès.
              </p>
              <Button asChild>
                <Link href={`/intakes/${intakeLink.token}/success`}>
                  Voir la confirmation
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  const isOwner = intakeLink.target === "OWNER";
  const clientName = intakeLink.client
    ? `${intakeLink.client.firstName || ""} ${intakeLink.client.lastName || ""}`.trim() || (intakeLink.client.email || "Client")
    : "Client";

  return (
    <div className="min-h-screen bg-background">
      {/* Header discret avec logo */}
      <header className="border-b border-border/40 pt-4 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center">
            <Image
              src="/logoLarge.png"
              alt="BailNotarie"
              width={120}
              height={36}
              className="h-20 w-auto opacity-80"
              priority
            />
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/20 p-4">
                  <AlertCircle className="size-12 text-amber-600 dark:text-amber-400" />
                </div>
              </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Données enregistrées</h1>
              <p className="text-lg text-muted-foreground">
                Merci {clientName}, vos données ont été sauvegardées.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
              <div>
                <h2 className="font-semibold mb-3 text-lg">⚠️ Important : Terminez votre formulaire</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Pour que nous puissions traiter votre demande de bail notarié, il est essentiel que vous complétiez tous les champs du formulaire et que vous soumettiez le formulaire final.
                </p>
                
                <div className="space-y-3">
                  <h3 className="font-medium">Ce qu'il vous reste à faire :</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                      <span>Compléter tous les champs obligatoires du formulaire</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                      <span>Vérifier que tous vos documents sont bien téléchargés</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                      <span>Cliquer sur le bouton "Soumettre" pour finaliser votre demande</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Une fois le formulaire complété et soumis, nous pourrons commencer le traitement de votre demande de bail notarié.
              </p>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/intakes/${intakeLink.token}`}>
                  Retourner au formulaire
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

