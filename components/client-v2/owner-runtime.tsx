"use client";

import * as React from "react";

/* =========================================================================
   Contexte d'exécution de l'espace client.

   En production il n'y a rien à fournir : les composants appellent les vraies
   server actions et ouvrent les vraies pages de détail. Enveloppées dans
   `<OwnerRuntime demo>`, les mêmes pages simulent leurs mutations en local
   (aucune écriture en base sur des identifiants fictifs) et remplacent par un
   aperçu les vues qui chargent un dossier réel — de quoi monter une maquette
   sans toucher à la logique.
   ========================================================================= */

type OwnerRuntimeValue = { demo: boolean };

const Ctx = React.createContext<OwnerRuntimeValue>({ demo: false });

export function OwnerRuntime({ demo = false, children }: { demo?: boolean; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ demo }), [demo]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwnerRuntime() {
  return React.useContext(Ctx);
}
