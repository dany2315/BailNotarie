/**
 * Expéditeur « Maître Durand via BailNotarie » : le nom de la personne qui écrit, puis la plateforme.
 * Les caractères qui casseraient l'en-tête (guillemets, chevrons, virgules…) sont retirés.
 */
export function senderAs(name: string | null | undefined, address: string) {
  const clean = (name ?? "").replace(/["<>,;\\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return clean ? `"${clean} via BailNotarie" <${address}>` : `BailNotarie <${address}>`;
}
