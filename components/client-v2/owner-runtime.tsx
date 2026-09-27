"use client";

import * as React from "react";

/* =========================================================================
   Contexte d'exécution de l'espace client.

   En production il n'y a rien à fournir : les composants appellent les vraies
   server actions et ouvrent les vrais tiroirs de détail. La maquette
   `/testEspaceclient` enveloppe les pages dans `<OwnerRuntime demo>` pour que
   les mutations soient simulées en local (aucune écriture en base sur des
   identifiants fictifs) et que les tiroirs qui chargent un dossier réel
   soient remplacés par un aperçu.
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
