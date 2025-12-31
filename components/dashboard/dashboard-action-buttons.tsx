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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Link href="/interface/clients/new" className="w-full sm:w-auto">
          <Button size="sm" className="w-full gap-2 sm:w-auto">
            <Plus className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Nouveau dossier</span>
            <span className="sm:hidden">Dossier</span>
          </Button>
        </Link>
        <Button 
          size="sm" 
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={() => setIsLeadDialogOpen(true)}
        >
          <UserPlus className="size-4 sm:mr-2" />
          <span className="hidden sm:inline">Ajouter un lead</span>
          <span className="sm:hidden">Lead</span>
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={() => setIsOwnerDialogOpen(true)}
        >
          <Mail className="size-4 sm:mr-2" />
          <span className="hidden sm:inline">Inviter le propriétaire</span>
          <span className="sm:hidden">Inviter</span>
        </Button>
      </div>
      
      <AddLeadDialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen} />
      <BasicClientDialog open={isOwnerDialogOpen} onOpenChange={setIsOwnerDialogOpen} />
    </>
  );
}

