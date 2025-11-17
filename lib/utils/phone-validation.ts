/**
 * Fonction de validation de numéro de téléphone
 * Compatible côté client (utilise react-phone-number-input) et serveur (validation basique)
 */
export function isValidPhoneNumberSafe(phoneNumber: string | undefined | null): boolean {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return true; // Les numéros optionnels sont valides s'ils sont vides
  }

  // Côté serveur, on utilise une validation basique
  // Côté client, react-phone-number-input sera utilisé via le composant PhoneInput
  // Cette fonction est principalement pour la validation Zod côté serveur
  
  // Nettoyer le numéro (enlever espaces, tirets, points, etc.)
  const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, "");
  
  // Validation pour numéros français (format: 0X XX XX XX XX ou +33 X XX XX XX XX)
  // Format français: commence par 0 suivi de 9 chiffres, ou +33 suivi de 9 chiffres
  const frenchPhoneRegex = /^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/;
  
  // Validation pour numéros internationaux (format: +[code pays][numéro])
  // Format international: commence par + suivi de 1-3 chiffres (code pays) puis 4-14 chiffres
  const internationalRegex = /^\+\d{1,3}\d{4,14}$/;
  
  return frenchPhoneRegex.test(cleaned) || internationalRegex.test(cleaned);
}

/**
 * Convertit un numéro de téléphone au format E.164
 * Convertit les numéros français (0X XX XX XX XX) en format international (+33 X XX XX XX XX)
 */
export function parsePhoneNumber(phoneNumber: string | undefined | null): string | undefined {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return undefined;
  }

  // Si déjà au format E.164, retourner tel quel
  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }

  // Nettoyer le numéro (enlever espaces, tirets, points, etc.)
  const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, "");

  // Si le numéro commence par 00, remplacer par +
  if (cleaned.startsWith("00")) {
    return `+${cleaned.substring(2)}`;
  }

  // Si le numéro commence par 0 (format français)
  if (cleaned.startsWith("0")) {
    // Si le numéro a exactement 10 chiffres (0 + 9 chiffres)
    if (cleaned.length === 10) {
      return `+33${cleaned.substring(1)}`;
    }
    // Si le numéro a plus de 10 chiffres, prendre seulement les 10 premiers
    if (cleaned.length > 10) {
      const truncated = cleaned.substring(0, 10);
      return `+33${truncated.substring(1)}`;
    }
  }

  // Si le numéro commence par 33 (sans le 0), ajouter le +
  if (cleaned.startsWith("33")) {
    // Si le numéro a exactement 11 chiffres (33 + 9 chiffres)
    if (cleaned.length === 11) {
      return `+${cleaned}`;
    }
    // Si le numéro a plus de 11 chiffres, prendre seulement les 11 premiers
    if (cleaned.length > 11) {
      return `+${cleaned.substring(0, 11)}`;
    }
  }

  // Si le numéro a 9 chiffres (sans le 0 initial), supposer que c'est un numéro français
  if (cleaned.length === 9 && /^\d+$/.test(cleaned)) {
    return `+33${cleaned}`;
  }

  // Si aucune conversion n'est possible, retourner undefined
  // react-phone-number-input ne pourra pas le parser, mais au moins on évite l'erreur
  return undefined;
}

/**
 * Fonction de validation avec react-phone-number-input (côté client uniquement)
 * À utiliser dans les schémas Zod côté client
 */
export function isValidPhoneNumberClient(phoneNumber: string | undefined | null): boolean {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return true;
  }

  // Essayer d'utiliser react-phone-number-input si disponible
  try {
    // Import dynamique pour éviter les erreurs côté serveur
    const { isValidPhoneNumber } = require("react-phone-number-input");
    return isValidPhoneNumber(phoneNumber);
  } catch {
    // Si l'import échoue (côté serveur), utiliser la validation basique
    return isValidPhoneNumberSafe(phoneNumber);
  }
}

