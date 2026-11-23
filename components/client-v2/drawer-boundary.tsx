"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuietAction } from "./owner-ui";

/* =========================================================================
   Garde-fou autour des tiroirs de détail.

   Les tiroirs chargent leur dossier par requête. Si cette requête échoue —
   session expirée, réseau coupé, données incomplètes — le rendu peut lever
   (un `RangeError: Invalid time value` sur une date absente, par exemple) et
   emporter toute la page avec lui : l'espace client devient blanc.

   Ce périmètre n'ajoute aucune logique métier : il attrape l'erreur, affiche
   de quoi comprendre et fermer, et laisse la page derrière intacte.
   ========================================================================= */

type Props = { children: React.ReactNode; onClose: () => void };
type State = { failed: boolean };

export class DrawerBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[espace client] échec d'ouverture d'un tiroir de détail", error);
  }

  private dismiss = () => {
    this.setState({ failed: false });
    this.props.onClose();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <Dialog open onOpenChange={(open) => !open && this.dismiss()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px] tracking-tight">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Ce dossier n&apos;a pas pu s&apos;ouvrir
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug">
              Rechargez la page pour réessayer. Si cela se reproduit, votre session a
              peut-être expiré — reconnectez-vous et le dossier s&apos;ouvrira.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <QuietAction className="w-full py-3" onClick={() => window.location.reload()}>
              Recharger la page
            </QuietAction>
            <QuietAction className="w-full py-3" onClick={this.dismiss}>
              Fermer
            </QuietAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
