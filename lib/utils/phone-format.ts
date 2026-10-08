import { parsePhoneNumberFromString } from "libphonenumber-js";

/** « +33612345678 » → « +33 6 12 34 56 78 » ; renvoie la saisie telle quelle si elle n'est pas reconnue. */
export function formatPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value, "FR");
  return parsed ? parsed.formatInternational() : value;
}
