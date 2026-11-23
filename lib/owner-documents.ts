import { prisma } from "@/lib/prisma";
import { isDocumentProvided, missingDocuments, ownerDocumentRequirements } from "@/lib/rules/dossier-rules";

/**
 * Pièces obligatoires du formulaire propriétaire qui manquent encore, d'après ce qui est réellement en base.
 * Mêmes règles que la page. Sert à l'envoi du formulaire et, avant, à la création de l'ordre de paiement :
 * une page restée sur une ancienne liste (pièce supprimée entre-temps) ne doit pas mener au paiement.
 */
export async function ownerMissingDocumentLabels(input: {
  clientId: string;
  propertyId: string | null;
  bailId: string | null;
  bailFamily?: string | null;
  property: {
    legalStatus?: string | null;
    subdivisionOver10Years?: string | null;
    inShoppingCenter?: boolean | null;
    complexType?: string | null;
  };
}): Promise<string[]> {
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    include: {
      persons: { orderBy: { isPrimary: "desc" }, include: { documents: { select: { kind: true } } } },
      entreprise: { include: { documents: { select: { kind: true } } } },
      documents: { select: { kind: true } },
    },
  });
  if (!client) return ["Client introuvable"];
  const [propertyDocs, bailDocs] = await Promise.all([
    input.propertyId ? prisma.document.findMany({ where: { propertyId: input.propertyId, archivedAt: null }, select: { kind: true } }) : [],
    input.bailId ? prisma.document.findMany({ where: { bailId: input.bailId, archivedAt: null }, select: { kind: true } }) : [],
  ]);
  const rules = ownerDocumentRequirements({
    clientType: client.type,
    persons: client.persons,
    entreprise: client.entreprise,
    bailFamily: input.bailFamily,
    property: {
      legalStatus: input.property.legalStatus,
      subdivisionOver10Years: input.property.subdivisionOver10Years,
      // Seule la pièce obligatoire du bail commercial compte ici : le règlement du centre commercial.
      inShoppingCenter: input.property.inShoppingCenter ?? null,
      complexType: input.property.complexType ?? null,
    },
  });
  const provided = {
    persons: client.persons.map((person) => person.documents),
    client: client.documents,
    entreprise: client.entreprise?.documents ?? [],
    property: propertyDocs,
    bail: bailDocs,
  };
  return missingDocuments(rules, (rule) => isDocumentProvided(rule, provided)).map((rule) => rule.label);
}
