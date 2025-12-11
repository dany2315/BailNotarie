export type BlogData = {
    id: string;
    title: string;
    slug: string;   
    description: string;
    content: string; // Gardé pour compatibilité (HTML ou vide si composant)
    readTime?: number; // Temps de lecture en minutes (optionnel, calculé si non fourni)
    imageUrl: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImage: string;
    createdAt: Date;
    categoryId: string;    
}

export type BlogCategory = {
    id: string;
    name: string;
    slug: string;
}

export function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '')
  }

export const blogCategories = [
    {
        id: "1",
        name: "Bail Notarié",
        slug: "bail-notarié",
    },
]



export const blogData = [
    {
        id: "blog-1",
        title:"Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?",
        slug: generateSlug("Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?"),
        description: "Découvrez les avantages du bail notarié et pourquoi il peut être un choix judicieux pour sécuriser votre location immobilière.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 5, // Temps de lecture estimé en minutes
        metaTitle: "Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?",
        metaDescription: "Découvrez ce qu’est un bail notarié, sa valeur juridique et pourquoi il sécurise votre location grâce à l’acte authentique et à la force exécutoire.",
        metaKeywords: "bail notarié définition, qu’est-ce qu’un bail notarié, contrat de location notarié, bail signé chez notaire, valeur juridique bail notarié, force exécutoire bail, sécurité juridique location, acte authentique location, bail notarié France",
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-01"),
        categoryId: "1",
      },
      {
        id: "blog-2",
        title: "Les étapes pour établir un bail notarié : guide complet",
        slug: generateSlug("Les étapes pour établir un bail notarié : guide complet"),
        description: "Guide étape par étape pour établir un bail notarié, de la préparation des documents à la signature chez le notaire.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 6, // Temps de lecture estimé en minutes
        metaTitle: "Les étapes pour établir un bail notarié : guide complet",
        metaDescription: "Toutes les étapes pour créer un bail notarié : dossier, documents, procédure chez le notaire et signature. Guide clair pour sécuriser votre location.",
        metaKeywords: "étapes bail notarié, comment faire un bail notarié, procédure bail notarié, dossier bail notarié, documents bail notarié, signature bail chez notaire, créer un bail notarié en ligne, bail notarié processus, bail authentique démarches",        imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=400&fit=crop",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-10"),
        categoryId: "1",
      },
      {
        id: "blog-3",
        title: "Force exécutoire : l'avantage majeur du bail notarié",
        slug: generateSlug("Force exécutoire : l'avantage majeur du bail notarié"),
        description: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige locatif.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 4, // Temps de lecture estimé en minutes
        metaTitle: "Force exécutoire : l'avantage majeur du bail notarié",
        metaDescription: "Découvrez comment le bail notarié permet d’agir sans jugement en cas d’impayés grâce à la force exécutoire et au titre exécutoire du notaire.",
        metaKeywords: "force exécutoire bail notarié, bail ayant valeur de jugement, saisie loyers impayés, recouvrement par acte notarié, procédure sans juge loyer, titre exécutoire notaire, efficacité bail notarié, impayés locatifs solution",
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-15"),
        categoryId: "1",
      },
      {
        id: "blog-4",
        title: "Bail notarié vs bail classique : analyse comparative",
        slug: generateSlug("Bail notarié vs bail classique : analyse comparative"),
        description: "Comparaison détaillée entre le bail notarié et le bail sous seing privé pour vous aider à faire le bon choix.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 7, // Temps de lecture estimé en minutes
        metaTitle: "Bail notarié vs bail classique : analyse comparative",
        metaDescription: "Comparaison détaillée entre le bail notarié et le bail sous seing privé pour vous aider à faire le bon choix.",
        metaKeywords: "bail notarié, bail classique, analyse comparative, propriétaire, locataire, notaire",
        imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=400&fit=crop",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-20"),
        categoryId: "1",
      },
      {
        id: "blog-5",
        title: "Les obligations légales dans un bail notarié",
        slug: generateSlug("Les obligations légales dans un bail notarié"),
        description: "Découvrez les obligations légales spécifiques au bail notarié et comment elles protègent propriétaire et locataire.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 6, // Temps de lecture estimé en minutes
        metaTitle: "Les obligations légales dans un bail notarié",
        metaDescription: "Clauses obligatoires, règles légales, devoirs du bailleur et droits du locataire : tout savoir pour un bail notarié juridiquement conforme.",
        metaKeywords: "obligations bail notarié, clauses obligatoires bail, mentions légales bail, règles du bail notarié, conformité bail notaire, devoirs bailleur, droits locataire bail notarié, erreurs fréquemment bail, validité contrat de location",
        imageUrl: "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-25"),
        categoryId: "1",
      },
      {
        id: "blog-6",
        title: "Coût d’un bail de location notarié : tarifs, partage des frais et exemples concrets",
        slug: generateSlug("Coût d’un bail de location notarié : tarifs, partage des frais et exemples concrets"),
        description:
          "Tarifs réglementés, estimation du coût d’un bail de location notarié, partage bailleur/locataire et frais additionnels possibles (procurations à distance, copies, formalités, débours).",
        content: "",
        readTime: 6,
        metaTitle: "Coût d’un bail de location notarié : tarifs, partage des frais et exemples concrets",
        metaDescription:
          "Tarifs réglementés, estimation du coût d’un bail de location notarié, partage bailleur/locataire et frais additionnels possibles (procurations à distance, copies, formalités, débours).",
        metaKeywords:
          "coût bail de location notarié, coût bail notarié, frais bail de location notarié, frais bail notarié, tarif notaire bail habitation, emolument bail notarié, moitié loyer hors charges, procuration authentique à distance, copies formalités notaire, débours bail notarié",
        imageUrl:
          "https://images.pexels.com/photos/3943745/pexels-photo-3943745.jpeg",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-06-01"),
        categoryId: "1",
      },
]