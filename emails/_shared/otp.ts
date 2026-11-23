// Le code est placé en tête de l'objet et de l'aperçu pour être lisible
// directement dans la notification mobile, même tronquée.

export function getOtpEmailSubject(code: string): string {
  return `${code} – votre code de connexion BailNotarie`;
}

export function getOtpEmailPreview(code: string): string {
  return `${code} est votre code de connexion BailNotarie. Il est valable 10 minutes.`;
}
