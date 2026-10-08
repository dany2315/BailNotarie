"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Mail } from "lucide-react";
import Link from "next/link";
import { BasicClientDialog } from "@/components/clients/basic-client-dialog";
import { AddLeadDialog } from "@/components/clients/add-lead-dialog";

export function DashboardActionButtons() {
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isOwnerDialogOpen, setIsOwnerDialogOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
        <Button asChild size="sm" className="h-10 gap-1.5 sm:h-8">
          <Link href="/interface/clients/new">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nouveau dossier</span>
            <span className="sm:hidden">Dossier</span>
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-10 gap-1.5 sm:h-8"
          onClick={() => setIsLeadDialogOpen(true)}
        >
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">Ajouter un lead</span>
          <span className="sm:hidden">Lead</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-10 gap-1.5 sm:h-8"
          onClick={() => setIsOwnerDialogOpen(true)}
        >
          <Mail className="size-4" />
          <span className="hidden sm:inline">Inviter le propriétaire</span>
          <span className="sm:hidden">Inviter</span>
        </Button>
      </div>
      
      <AddLeadDialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen} />
      <BasicClientDialog open={isOwnerDialogOpen} onOpenChange={setIsOwnerDialogOpen} />
    </>
  );
}

