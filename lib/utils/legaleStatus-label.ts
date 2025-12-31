import { BienLegalStatus } from "@prisma/client";

const propertyLegalStatusLabels: Record<BienLegalStatus, string> = {

  PLEIN_PROPRIETE: "Plein propriété",
  CO_PROPRIETE: "Copropriété",
  LOTISSEMENT: "Lotissement",
};
export function getPropertyLegalStatusLabel(status: BienLegalStatus): string {
  return propertyLegalStatusLabels[status] || status;
}