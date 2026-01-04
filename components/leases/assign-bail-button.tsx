"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { AssignDossierDialog } from "@/components/notaires/assign-dossier-dialog";

interface AssignBailButtonProps {
  bailId: string;
}

export function AssignBailButton({ bailId }: AssignBailButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)}
        className="sm:w-auto"
      >
        <UserPlus className="size-4 sm:mr-2" />
        <span className="hidden sm:inline">Assigner à un notaire</span>
        <span className="sm:hidden">Assigner</span>
      </Button>
      <AssignDossierDialog
        open={open}
        onOpenChange={setOpen}
        initialBailId={bailId}
      />
    </>
  );
}

