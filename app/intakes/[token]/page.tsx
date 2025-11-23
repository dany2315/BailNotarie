import { getIntakeLinkByToken, submitIntake } from "@/lib/actions/intakes";
import { notFound } from "next/navigation";
import { IntakeForm } from "@/components/intakes/intake-form";
import Image from "next/image";

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
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-3 sm:space-y-4 text-center px-4">
          <h1 className="text-xl sm:text-2xl font-bold">
            {intakeLink.status === "SUBMITTED" ? "Déjà soumis" : "Lien révoqué"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {intakeLink.status === "SUBMITTED"
              ? "Ce formulaire a déjà été soumis."
              : "Ce lien n'est plus valide."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header discret avec logo */}
      <header className="fixed top-0 left-0 right-0 bg-background border-b border-border/40 z-50 pt-2 sm:pt-4 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center">
            <Image
              src="/logoLarge.png"
              alt="BailNotarie"
              width={200}
              height={60}
              className="h-12 sm:h-16 md:h-20 w-auto opacity-80"
              priority
            />
          </div>
        </div>

        <div className="text-center space-y-3 sm:space-y-2 pb-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold px-2">
                Formulaire bail notarié {intakeLink.target === "OWNER" ? "Propriétaire" : "Locataire"}
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground  pt-2">
                Veuillez remplir le formulaire ci-dessous
              </p>
        </div>
      </header>

      <div className="p-3 sm:p-4">
        <div className="max-w-2xl mx-auto py-2 sm:py-4">
          <div className="relative space-y-4 sm:space-y-6">
            

            <IntakeForm intakeLink={intakeLink} />
          </div>
        </div>
      </div>
    </div>
  );
}




