import { getIntakeLinkByToken, submitIntake } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { IntakeForm } from "@/components/intakes/intake-form";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { CheckCircle2, XCircle, Home, FileCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = await params;
  const intakeLink = await getIntakeLinkByToken(resolvedParams.token);
  console.log(intakeLink);
  if (!intakeLink) {
    notFound();
  }

  if (intakeLink.status !== "PENDING") {
    const isSubmitted = intakeLink.status === "SUBMITTED";
    return (
      <>
        <Header />
        <div className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
          <Empty className="max-w-lg w-full bg-white/80 backdrop-blur-sm shadow-lg">
            <EmptyHeader className="gap-4">
              <EmptyMedia variant="icon" className="size-20 bg-gradient-to-br from-blue-50 to-indigo-50 border-2">
                {isSubmitted ? (
                  <CheckCircle2 className="size-12 text-green-600" strokeWidth={2} />
                ) : (
                  <XCircle className="size-12 text-red-600" strokeWidth={2} />
                )}
              </EmptyMedia>
              <EmptyTitle className="text-2xl font-bold">
                {isSubmitted ? "Formulaire déjà soumis" : "Lien révoqué"}
              </EmptyTitle>
              <EmptyDescription className="text-base max-w-md">
                {isSubmitted ? (
                  <>
                    Ce formulaire a déjà été soumis et est en cours de traitement.
                    <br />
                    Vous recevrez une notification une fois le traitement terminé.
                  </>
                ) : (
                  <>
                    Ce lien n'est plus valide ou a expiré.
                    <br />
                    Veuillez contacter l'administrateur pour obtenir un nouveau lien.
                  </>
                )}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="mt-6 gap-4">
              {isSubmitted && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 px-4 py-2 rounded-md">
                  <span>Votre demande est en cours d'examen par notre équipe.</span>
                </div>
              )}
              {!isSubmitted && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 px-4 py-2 rounded-md">
                  <AlertCircle className="size-4 text-amber-600" />
                  <span>Si vous pensez qu'il s'agit d'une erreur, contactez-nous.</span>
                </div>
              )}
              <Button asChild variant="default" size="lg" className="w-full sm:w-auto mt-4">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="size-5" />
                  Retour à la page d'accueil
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <Header />

      {/* Contenu principal */}
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mt-5 sm:mt-10 text-[#4373f5] text-center">
            <h1 className="text-2xl font-bold"> Formulaire bail notarié
              <br />
              <span className="">
                {intakeLink.target === "OWNER" ? "Propriétaire" : "Locataire"}
              </span>
            </h1>
            <p className="text-muted-foreground"> Complétez votre dossier en quelques étapes simples </p>
          </div>
          <div className="mt-10">
            <IntakeForm intakeLink={intakeLink} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}




