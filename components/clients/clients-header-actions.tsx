"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddLeadDialog } from "@/components/clients/add-lead-dialog";
import { BasicClientDialog } from "@/components/clients/basic-client-dialog";

/** Actions de l'en-tête de la liste Clients (mêmes possibilités qu'avant). */
export function ClientsHeaderActions() {
  const [leadOpen, setLeadOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Button variant="outline" className="h-11 gap-2" onClick={() => setLeadOpen(true)}>
          <UserPlus className="size-4" />
          Ajouter un prospect
        </Button>
        <Button variant="outline" className="h-11 gap-2" onClick={() => setInviteOpen(true)}>
          <Mail className="size-4" />
          Inviter un propriétaire
        </Button>
        <Button asChild className="col-span-2 h-11 gap-2">
          <Link href="/interface/clients/new">
            <Plus className="size-4" />
            Nouveau client
          </Link>
        </Button>
      </div>
      <AddLeadDialog open={leadOpen} onOpenChange={setLeadOpen} />
      <BasicClientDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
