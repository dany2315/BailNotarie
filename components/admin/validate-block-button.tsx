"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateClientCompletionStatus } from "@/lib/actions/clients";
import { updatePropertyCompletionStatus } from "@/lib/actions/properties";

/**
 * « Tout valider » d'un bloc de la fiche : passe le client ou le bien en
 * « Complété », exactement comme le sélecteur de statut (même e-mail au client).
 */
export function ValidateBlockButton({
  type,
  id,
  disabledReason,
}: {
  type: "client" | "property";
  id: string;
  /** Raison affichée au survol quand la validation est impossible (manques). */
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const validate = async () => {
    setPending(true);
    try {
      if (type === "client") await updateClientCompletionStatus({ id, completionStatus: "COMPLETED" });
      else await updatePropertyCompletionStatus({ id, completionStatus: "COMPLETED" });
      toast.success("Bloc validé");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Validation impossible");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8"
      onClick={validate}
      disabled={pending || !!disabledReason}
      title={disabledReason || undefined}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      Tout valider
    </Button>
  );
}
