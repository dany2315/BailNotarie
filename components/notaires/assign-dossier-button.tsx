"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { AssignDossierDialog } from "./assign-dossier-dialog";

export function AssignDossierButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <FileText className="mr-2 h-4 w-4" />
        Assigner un dossier
      </Button>
      <AssignDossierDialog open={open} onOpenChange={setOpen} />
    </>
  );
}







