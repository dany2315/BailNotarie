"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown, Mail, MoreHorizontal, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BasicClientDialog } from "./basic-client-dialog";
import { AddLeadDialog } from "./add-lead-dialog";

export function ClientCreateButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <ButtonGroup>
        <Button onClick={() => router.push("/interface/clients/new")} variant="outline" className="bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground ">
          Créer un client
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="px-2" size="icon" variant="outline">
            <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsLeadDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un lead
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Envoyer par mail le formulaire
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/interface/clients/new">
                <Plus className="mr-2 h-4 w-4" />
                Client complet
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      <BasicClientDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <AddLeadDialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen} />
    </>
  );
}




