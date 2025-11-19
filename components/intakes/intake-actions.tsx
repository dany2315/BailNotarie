"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw, X, Loader2 } from "lucide-react";
import { revokeIntakeLink, regenerateToken } from "@/lib/actions/intakes";
import { toast } from "sonner";

interface IntakeActionsProps {
  row: { id: string; token: string; status: string; [key: string]: any };
}

export function IntakeActions({ row }: IntakeActionsProps) {
  const router = useRouter();
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!row || !row.id) {
    return null;
  }

  const handleRevoke = async () => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir révoquer ce lien ? Cette action est irréversible."
    );

    if (!confirmed) {
      return;
    }

    setIsRevoking(true);
    try {
      await revokeIntakeLink(row.id);
      toast.success("Lien révoqué avec succès");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la révocation du lien");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRegenerate = async () => {
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir régénérer le token ? L'ancien lien ne fonctionnera plus."
    );

    if (!confirmed) {
      return;
    }

    setIsRegenerating(true);
    try {
      await regenerateToken(row.id);
      toast.success("Token régénéré avec succès");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la régénération du token");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Link 
        href={row.target === "LEAD" 
          ? `/intakes/${row.token}/convert` 
          : `/intakes/${row.token}`} 
        target="_blank"
      >
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir">
          <Eye className="size-4" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleRegenerate}
        disabled={isRegenerating || row.status !== "PENDING"}
        title="Régénérer le token"
      >
        {isRegenerating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleRevoke}
        disabled={isRevoking || row.status === "REVOKED"}
        title="Révoquer"
      >
        {isRevoking ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <X className="size-4" />
        )}
      </Button>
    </div>
  );
}

