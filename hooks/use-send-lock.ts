"use client";

import { useCallback, useRef } from "react";

/**
 * Verrou d'envoi immédiat : un double clic (ou Entrée + clic) ne déclenche qu'un seul envoi.
 * Un état React (`sending`) ne suffit pas : il n'est à jour qu'au rendu suivant, alors que le
 * deuxième clic arrive avant. Le verrou est un ref, posé dès le premier appel.
 */
export function useSendLock() {
  const busy = useRef(false);
  return useCallback(async (task: () => Promise<unknown>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await task();
    } finally {
      busy.current = false;
    }
  }, []);
}
