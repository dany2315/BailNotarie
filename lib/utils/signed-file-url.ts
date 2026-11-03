/**
 * URL signée d'un fichier et nom lisible de la pièce (voir app/api/blob/get-signed-url).
 * download : S3 renvoie le fichier en pièce jointe au lieu de l'afficher.
 */
export async function fetchSignedFileUrl(
  fileKey: string,
  options: { token?: string; download?: boolean } = {}
): Promise<{ signedUrl: string; fileName: string | null }> {
  const response = await fetch("/api/blob/get-signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileKey,
      ...(options.download && { download: true }),
      ...(options.token && { token: options.token }),
    }),
  });

  if (!response.ok) {
    throw new Error("Erreur lors de la génération de l'URL signée");
  }

  const { signedUrl, fileName } = await response.json();
  return { signedUrl, fileName: fileName ?? null };
}
