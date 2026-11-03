import { BailType } from "@prisma/client";

/**
 * Calcule la date de fin d'un bail en fonction de son type et de sa date de début
 */
export function calculateBailEndDate(effectiveDate: Date, bailType: BailType): Date {
    const startDate = new Date(effectiveDate);
    const endDate = new Date(startDate);
  
    switch (bailType) {
      case BailType.BAIL_NU_3_ANS:
        endDate.setFullYear(startDate.getFullYear() + 3);
        break;
      case BailType.BAIL_NU_6_ANS:
        endDate.setFullYear(startDate.getFullYear() + 6);
        break;
      case BailType.BAIL_MEUBLE_1_ANS:
        endDate.setFullYear(startDate.getFullYear() + 1);
        break;
      case BailType.BAIL_MEUBLE_9_MOIS:
        endDate.setMonth(startDate.getMonth() + 9);
        break;
      case BailType.COMMERCIAL_3_6_9:
        endDate.setFullYear(startDate.getFullYear() + 9);
        break;
      case BailType.COMMERCIAL_DEROGATOIRE:
        // Durée choisie au formulaire (enregistrée dans endDate) : à défaut, le maximum légal de 36 mois
        endDate.setMonth(startDate.getMonth() + 36);
        break;
      default:
        // Par défaut, 3 ans
        endDate.setFullYear(startDate.getFullYear() + 3);
    }
  
    return endDate;
  }
  