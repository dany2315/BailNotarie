const bailTypeLabels: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nue 3 ans",
  BAIL_NU_6_ANS: "Bail nue 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

export function getBailTypeLabel(bailType: string): string {
  return bailTypeLabels[bailType] || bailType;
}