"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { TenantCreateDialog } from "./tenant-create-dialog";

interface TenantCreateButtonProps {
  bailId: string;
}

export function TenantCreateButton({ bailId }: TenantCreateButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)} variant="outline">
        <UserPlus className="mr-2 h-4 w-4" />
        Ajouter un locataire
      </Button>
      <TenantCreateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        bailId={bailId}
      />
    </>
  );
}




