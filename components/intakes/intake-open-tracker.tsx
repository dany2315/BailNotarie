"use client";

import { useEffect } from "react";
import { markIntakeOpened } from "@/lib/actions/intake-tracking";

/** Signale l'ouverture du formulaire une fois par affichage. Ne rend rien. */
export function IntakeOpenTracker({ token }: { token: string }) {
  useEffect(() => {
    markIntakeOpened(token).catch(() => {});
  }, [token]);
  return null;
}
