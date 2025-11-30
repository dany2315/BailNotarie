import { getIntakeLinkByToken } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
      <Header />

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
        <Footer />
      </div>
    );
  }

  const isOwner = intakeLink.target === "OWNER";
  const clientName = intakeLink.client
    ? `${intakeLink.client.firstName || ""} ${intakeLink.client.lastName || ""}`.trim() || (intakeLink.client.email || "Client")
    : "Client";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex items-center justify-center px-4 py-8 h-auto">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900/20 p-4">
                  <AlertCircle className="size-8 text-amber-600 dark:text-amber-400" />
                </div>
              </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Données enregistrées</h1>
              <p className="text-lg text-muted-foreground">
                Merci {clientName}, vos données ont été sauvegardées.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left mb-0">
              <div>
                <h2 className="font-semibold mb-3 text-lg">⚠️ Important : Terminez votre formulaire</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Pour que nous puissions traiter votre demande de bail notarié, il est essentiel que vous complétiez tous les champs du formulaire et que vous soumettiez le formulaire final.
                </p>
                
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-bold mb-1">
                  💡 Pour continuer plus tard
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Vous pouvez reprendre votre formulaire à tout moment en utilisant <span className="font-bold">le lien que vous avez reçu par email</span>. Vos données sont sauvegardées et seront conservées.
                </p>
              </div>
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
      <Footer />
    </div>
  );
}

