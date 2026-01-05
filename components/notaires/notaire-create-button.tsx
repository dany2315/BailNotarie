"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { NotaireCreateDialog } from "./notaire-create-dialog";

export function NotaireCreateButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Créer un notaire
      </Button>
      <NotaireCreateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}








